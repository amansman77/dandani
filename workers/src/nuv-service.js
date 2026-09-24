import { getRequiredUserId } from './service-utils.js';

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

  // 발행번호는 사람마다 1번부터. 남과 견주는 숫자가 아니라 "내 몇 번째
  // 증명인가"라서 전역 번호일 이유가 없다.
  const last = await env.DB.prepare(`
    SELECT MAX(issue_no) AS issue_no FROM digital_postcards WHERE user_id = ?
  `).bind(userId).first();

  // 여기 들어가는 값은 전부 지금 한 번 쓰고 다시 쓰지 않는다. 나중에 문장을
  // 바꾸거나 되새김이 더 쌓여도 안 변한다 — 내용이 바뀌는 기록은 증명이
  // 아니다. draft를 거치지 않고 바로 saved로 굳히는 것도 같은 이유다.
  const postcardId = generateId('postcard');
  const created = await env.DB.prepare(`
    INSERT INTO digital_postcards
      (id, user_id, phrase_id, phrase, visit_days, preset, status, practice_record_id,
       practice_body, practiced_on, nuv_at_issue, issue_no, issued_at, saved_at)
    VALUES (?, ?, ?, ?, ?, 'morning', 'saved', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    RETURNING id
  `).bind(
    postcardId, userId, record.phrase_id, record.phrase,
    Math.max(1, record.nuv_at_record), record.id,
    record.body ?? null, record.practiced_on ?? null, record.nuv_at_record,
    (last?.issue_no || 0) + 1
  ).first();
  return created?.id || null;
}

// 차감이 없어진 뒤로 지갑 잔액은 곧 평생 누적이다 — 원장에 더하기만 들어오니
// 따로 합계를 낼 필요가 없다.
export async function getNuvWallet(env, request) {
  const userId = getRequiredUserId(request);
  return { balance: await getBalance(env, userId) };
}

export async function awardNuvForReflection(env, userId, phraseId, logDate) {
  const referenceId = `${phraseId}:${logDate}`;
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
           practice_record_id, practice_body, practiced_on, nuv_at_issue, issue_no, issued_at
    FROM digital_postcards
    WHERE user_id = ? AND status = 'saved'
    ORDER BY issue_no DESC, saved_at DESC, created_at DESC
  `).bind(userId).all();
  return {
    postcards: results.map(({ practice_record_id: practiceRecordId, ...postcard }) => ({
      ...postcard,
      // 실천 없이 누브를 주고 샀던 옛 엽서. 지우지도 번호를 주지도 않고,
      // 화면에서만 갈라 보여준다.
      is_legacy: !practiceRecordId,
    })),
  };
}


