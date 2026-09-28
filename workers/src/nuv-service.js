import { getRequiredUserId } from './service-utils.js';
import { dateIn, normalizeTimezone, phraseDateContext } from './phrase-dates.js';
import { HttpError } from './http-errors.js';

// 누브는 되새김이 쌓여 만들어지는 기록이지 재화가 아니다. 그래서 줄어들지도
// 않고, 무언가를 여는 열쇠도 아니다.
//
// 한때 엽서 발행에 10누브 문턱을 뒀다가 없앴다. 차감이 아니라 자격이었지만,
// 자격이든 값이든 누브가 무언가를 막는 순간 다시 "얼마가 있어야 하는가"를
// 묻게 된다. 이제 누브는 막지 않고 세기만 한다 — 엽서에 찍히는 숫자로만 쓰인다.
// 엽서를 여는 건 누브가 아니라 실천이다.
//
// 예전엔 가입하면 10누브를 그냥 줬다(WELCOME_GRANT). 1누브가 "하루를 되새겼다"는
// 뜻인 이상 그건 살지 않은 열흘을 준 것이어서, 단위의 뜻이 첫 화면에서부터
// 무너졌다. 원장을 열어보니 실제로 그랬다 — 선물 210누브 대 되새김으로 번
// 4누브, 발행된 엽서 전부가 선물로 산 것이었다. 그래서 선물을 없앴고,
// 이미 나간 210누브도 원장에서 되돌렸다(schema_v260922_nuv_accrual.sql).
export const REFLECTION_REWARD = 1;
const POSTCARD_PRESETS = new Set(['morning', 'dawn', 'paper', 'light']);

// 장부 도장에서 사용자 ID를 가리는 값. 체인에는 루트만 올라가지만 사용자가
// 자기 증명을 공유할 수 있어서, 그때 내부 ID가 드러나지 않게 한다.
function newSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export async function getNuvBalance(env, userId) {
  const wallet = await env.DB.prepare(`
    SELECT balance FROM nuv_wallets WHERE user_id = ?
  `).bind(userId).first();
  return wallet?.balance || 0;
}

const getBalance = getNuvBalance;

// 실천 기록에서 엽서를 발행한다. 살아낸 순간은 그 자체로 증명이 되므로
// 따로 자격을 묻지 않는다. 기록 하나에 엽서는 하나뿐이라 두 번 불러도
// 두 장이 되지 않는다.
export async function issuePostcardForRecord(env, userId, record) {
  const existing = await env.DB.prepare(`
    SELECT id FROM digital_postcards WHERE practice_record_id = ? AND user_id = ?
  `).bind(record.id, userId).first();
  if (existing) return existing.id;

  return insertPostcard(env, userId, {
    phrase_id: record.phrase_id, phrase: record.phrase, record_id: record.id,
    body: record.body ?? null, on: record.practiced_on ?? null,
    logged_days: record.logged_days ?? null, nuv: record.nuv_at_record,
  });
}

async function insertPostcard(env, userId, card) {
  // 발행번호는 사람마다 1번부터. 남과 견주는 숫자가 아니라 "내 몇 번째
  // 엽서인가"라서 전역 번호일 이유가 없다.
  const last = await env.DB.prepare(`
    SELECT MAX(issue_no) AS issue_no FROM digital_postcards WHERE user_id = ?
  `).bind(userId).first();

  // 여기 들어가는 값은 전부 지금 한 번 쓰고 다시 쓰지 않는다. 나중에 문장을
  // 바꾸거나 되새김이 더 쌓여도 안 변한다. draft를 거치지 않고 바로 saved로
  // 굳히는 것도 같은 이유다. practiced_on은 이름이 옛날 그대로지만 엽서가
  // 가리키는 날이다.
  const postcardId = generateId('postcard');
  const created = await env.DB.prepare(`
    INSERT INTO digital_postcards
      (id, user_id, phrase_id, phrase, visit_days, preset, status, practice_record_id,
       practice_body, practiced_on, logged_days_at_issue, nuv_at_issue, issue_no,
       issued_at, saved_at)
    VALUES (?, ?, ?, ?, ?, 'morning', 'saved', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    RETURNING id
  `).bind(
    postcardId, userId, card.phrase_id, card.phrase,
    Math.max(1, card.nuv), card.record_id,
    card.body, card.on, card.logged_days, card.nuv,
    (last?.issue_no || 0) + 1
  ).first();
  return created?.id || null;
}

// 지금 문장을 엽서로 만든다.
//
// 한때 엽서는 "이 말대로 한 순간"을 적어야만 나오는 실천의 증명이었다.
// 2026-09-28 그 쓰기 단계를 걷어냈다 — 엽서 만들기는 이제 지금 되새기는
// 문장을 엽서로 옮기는 일 하나다. 그래서 엽서에 굳는 건 문장, 오늘 날짜,
// 오늘까지 이 문장을 되새긴 날수다.
//
// 같은 문장으로 같은 날 다시 누르면 새 장을 찍지 않고 그날의 엽서를 돌려준다.
// 누를 때마다 발행번호가 늘면 번호가 아무 뜻이 없어진다.
export async function createPostcardFromPhrase(env, request) {
  const userId = getRequiredUserId(request);
  const { phrase_id: phraseId } = await request.json();
  if (!phraseId || typeof phraseId !== 'string') {
    throw new HttpError(400, '어떤 문장의 엽서인지 알 수 없어요.');
  }
  const phrase = await env.DB.prepare(`
    SELECT id, phrase FROM daily_phrases WHERE id = ? AND user_id = ? AND status = 'active'
  `).bind(phraseId, userId).first();
  if (!phrase) throw new HttpError(404, '문장을 찾을 수 없어요.');

  const { today } = phraseDateContext(request);
  await ensureNuvAccount(env, userId, request.headers.get('X-Client-Timezone'));
  const findToday = () => env.DB.prepare(`
    SELECT id, practiced_on, logged_days_at_issue FROM digital_postcards
    WHERE user_id = ? AND phrase_id = ? AND practiced_on = ?
      AND practice_record_id IS NULL AND issue_no IS NOT NULL
  `).bind(userId, phrase.id, today).first();
  const existing = await findToday();
  if (existing) return postcardResult(existing, false);

  const counted = await env.DB.prepare(`
    SELECT COUNT(DISTINCT log_date) AS days FROM daily_phrase_logs
    WHERE phrase_id = ? AND user_id = ? AND log_date <= ?
  `).bind(phrase.id, userId, today).first();

  try {
    await insertPostcard(env, userId, {
      phrase_id: phrase.id, phrase: phrase.phrase, record_id: null, body: null,
      on: today, logged_days: counted?.days || 0, nuv: await getBalance(env, userId),
    });
  } catch (error) {
    // 같은 순간 두 번 눌러 UNIQUE에 걸린 경우 — 먼저 들어간 엽서를 돌려준다.
    if (!String(error?.message).includes('UNIQUE')) throw error;
  }
  return postcardResult(await findToday(), true);
}

function postcardResult(row, created) {
  return {
    postcard_id: row.id,
    issued_on: row.practiced_on,
    logged_days: row.logged_days_at_issue,
    created,
  };
}

// 차감이 없어진 뒤로 지갑 잔액은 곧 평생 누적이다 — 원장에 더하기만 들어오니
// 따로 합계를 낼 필요가 없다.
export async function getNuvWallet(env, request) {
  const userId = getRequiredUserId(request);
  return { balance: await getBalance(env, userId) };
}

// 되새김은 하루 한 번이라 누브도 사람당 하루 1개다. 원장 키를 날짜만으로
// 잡아 UNIQUE(user_id, reason, reference_id)가 그걸 지킨다 — 같은 날 문장을
// 새로 바꾸고 다시 되새겨도 두 번째 누브는 나오지 않는다.
//
// 그 날짜는 앱이 보낸 시간대가 아니라 처음 누브를 받을 때 고정한 시간대로
// 센다. 같은 순간에도 UTC+14와 UTC-12는 날짜가 이틀 차이 나서, 헤더를 바꿔
// 가며 보내면 실제 하루에 누브를 2~3개 받을 수 있었다. 누브는 체인에 새길
// 장부라 그 구멍을 닫는다. 되새김 기록(daily_phrase_logs)은 여전히 앱의
// 시간대를 따른다 — 화면에 보이는 "오늘"은 사용자가 있는 곳의 오늘이어야 해서.
// 누브 장부 — 누브 하나하나가 어느 날, 어떤 문장을 되새긴 것인지. 원장엔
// 날짜만 있어서 문장은 그 누브 직전에 남은 되새김 기록으로 찾는다(되새김
// 기록을 남긴 같은 요청 안에서 누브가 나오므로 그 기록이 곧 이 누브의 것이다).
// 장부가 봉인된 날도 함께 돌려준다 — 체인 이야기는 하지 않고 "봉인"까지만.
export async function getNuvLedger(env, request) {
  const userId = getRequiredUserId(request);
  const { results } = await env.DB.prepare(`
    SELECT t.reference_id AS day,
      (SELECT p.phrase FROM daily_phrase_logs l
        JOIN daily_phrases p ON p.id = l.phrase_id
        WHERE l.user_id = t.user_id AND l.created_at <= t.created_at
        ORDER BY l.created_at DESC LIMIT 1) AS phrase
    FROM nuv_transactions t
    WHERE t.user_id = ? AND t.reason = 'daily_reflection'
    ORDER BY t.created_at DESC
  `).bind(userId).all();
  const seal = await env.DB.prepare(`
    SELECT day FROM nuv_anchors ORDER BY day DESC LIMIT 1
  `).first();
  return {
    total: await getBalance(env, userId),
    days: results,
    last_sealed_day: seal?.day || null,
  };
}

// 누브·엽서 장부에서 사람마다 한 번 정하는 값(시간대, salt). 누브를 받거나
// 엽서를 처음 만들 때 생긴다 — 엽서도 밤마다 봉인에 들어가서 salt가 필요하다.
export async function ensureNuvAccount(env, userId, timezone) {
  await env.DB.prepare(`
    INSERT OR IGNORE INTO nuv_accounts (user_id, timezone, salt) VALUES (?, ?, ?)
  `).bind(userId, normalizeTimezone(timezone), newSalt()).run();
}

export async function awardNuvForReflection(env, userId, phraseId, logDate, {
  timezone, now = new Date(),
} = {}) {
  await ensureNuvAccount(env, userId, timezone);
  const account = await env.DB.prepare(`
    SELECT timezone FROM nuv_accounts WHERE user_id = ?
  `).bind(userId).first();
  const referenceId = dateIn(account.timezone, now);

  const granted = await env.DB.prepare(`
    INSERT OR IGNORE INTO nuv_transactions
      (id, user_id, amount, reason, reference_id)
    SELECT ?, ?, ?, 'daily_reflection', ?
    WHERE EXISTS (
      SELECT 1 FROM daily_phrase_logs
      WHERE phrase_id = ? AND user_id = ? AND log_date = ?
    )
    RETURNING amount
  `).bind(
    generateId('nuv'), userId, REFLECTION_REWARD, referenceId,
    phraseId, userId, logDate
  ).first();

  return {
    awarded_nuv: granted?.amount || 0,
    balance: await getBalance(env, userId),
  };
}

export async function savePostcard(env, postcardId, request) {
  const userId = getRequiredUserId(request);
  const { preset } = await request.json();
  if (!POSTCARD_PRESETS.has(preset)) {
    throw new Error('invalid postcard preset');
  }

  // 바꿀 수 있는 건 배경뿐이다. 문장·실천 기록·실천일·누브·발행번호는
  // 발행할 때 한 번 쓰고 여기서 건드리지 않는다 — 그게 증명이고, 배경은
  // 표현이다.
  const postcard = await env.DB.prepare(`
    UPDATE digital_postcards
    SET preset = ?, status = 'saved', saved_at = COALESCE(saved_at, datetime('now'))
    WHERE id = ? AND user_id = ?
    RETURNING id, phrase, visit_days, preset, created_at, saved_at, issue_no
  `).bind(preset, postcardId, userId).first();
  if (!postcard) {
    throw new Error(`Postcard not found: ${postcardId}`);
  }
  return { postcard };
}

export async function getSavedPostcards(env, request) {
  const userId = getRequiredUserId(request);
  const { results } = await env.DB.prepare(`
    SELECT id, phrase, visit_days, preset, created_at, saved_at,
           practice_body, practiced_on,
           logged_days_at_issue, nuv_at_issue, issue_no, issued_at
    FROM digital_postcards
    WHERE user_id = ? AND status = 'saved'
    ORDER BY issue_no DESC, saved_at DESC, created_at DESC
  `).bind(userId).all();
  return {
    postcards: results.map((postcard) => ({
      ...postcard,
      // 누브를 주고 샀던 옛 엽서. 지우지도 번호를 주지도 않고, 화면에서만
      // 갈라 보여준다. 이제 엽서는 실천 기록 없이도 나오므로, 옛 엽서를
      // 가르는 표시는 practice_record_id가 아니라 발행번호의 유무다.
      is_legacy: postcard.issue_no == null,
    })),
  };
}


