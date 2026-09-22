import { getRequiredUserId } from './service-utils.js';

// 누브는 되새김이 쌓여 만들어지는 기록이지 재화가 아니다. 그래서 줄어들지 않는다.
// 엽서 발행에 10누브가 필요하지만 그건 값이 아니라 문턱이다 — 넘었는지만 보고
// 차감하지 않는다. 보유량이 인증할 때마다 없어지지 않는 것과 같은 성질이다.
//
// 예전엔 가입하면 10누브를 그냥 줬다(WELCOME_GRANT). 1누브가 "하루를 되새겼다"는
// 뜻인 이상 그건 살지 않은 열흘을 준 것이어서, 단위의 뜻이 첫 화면에서부터
// 무너졌다. 원장을 열어보니 실제로 그랬다 — 선물 210누브 대 되새김으로 번
// 4누브, 발행된 엽서 전부가 선물로 산 것이었다. 그래서 선물을 없앴고,
// 이미 나간 210누브도 원장에서 되돌렸다(schema_v260922_nuv_accrual.sql).
export const REFLECTION_REWARD = 1;
export const POSTCARD_THRESHOLD = 10;
const POSTCARD_PRESETS = new Set(['morning', 'dawn', 'paper', 'light']);
const MAX_POSTCARD_IMAGE_BYTES = 1800000;

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

// 실천 기록에서 엽서를 발행한다. 문턱을 못 넘었으면 아무것도 만들지 않고
// 돌아간다 — 기록은 이미 저장돼 있고, 문턱을 넘는 날 그때 발행된다.
// 기록 하나에 엽서는 하나뿐이라 두 번 불러도 두 장이 되지 않는다.
export async function issuePostcardForRecord(env, userId, record, balance) {
  if (balance < POSTCARD_THRESHOLD) return null;
  const existing = await env.DB.prepare(`
    SELECT id FROM digital_postcards WHERE practice_record_id = ? AND user_id = ?
  `).bind(record.id, userId).first();
  if (existing) return existing.id;

  const postcardId = generateId('postcard');
  const created = await env.DB.prepare(`
    INSERT INTO digital_postcards
      (id, user_id, phrase_id, phrase, visit_days, preset, status, practice_record_id)
    VALUES (?, ?, ?, ?, ?, 'morning', 'draft', ?)
    RETURNING id
  `).bind(
    postcardId, userId, record.phrase_id, record.phrase,
    Math.max(1, record.nuv_at_record), record.id
  ).first();
  return created?.id || null;
}

// 차감이 없어진 뒤로 지갑 잔액은 곧 평생 누적이다 — 원장에 더하기만 들어오니
// 따로 합계를 낼 필요가 없다.
export async function getNuvWallet(env, request) {
  const userId = getRequiredUserId(request);
  return { balance: await getBalance(env, userId), postcard_threshold: POSTCARD_THRESHOLD };
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

export async function createPostcardWithNuv(env, request) {
  const userId = getRequiredUserId(request);
  const { phrase_id: phraseId, visit_days: visitDaysValue } = await request.json();
  if (!phraseId || typeof phraseId !== 'string') {
    throw new Error('phrase_id is required');
  }
  const visitDays = Number.isInteger(visitDaysValue) && visitDaysValue > 0 ? visitDaysValue : 1;

  const phrase = await env.DB.prepare(`
    SELECT id FROM daily_phrases
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).bind(phraseId, userId).first();
  if (!phrase) {
    throw new Error(`Active phrase not found: ${phraseId}`);
  }

  // 문턱은 한 문장 안에서 검사한다. 지갑 행이 아직 없으면 하위 질의가 NULL을
  // 돌려주고 NULL >= 10은 참이 아니라서, 0누브인 사람은 자연히 걸러진다.
  // 차감이 사라진 덕에 원장을 건드리지 않으니 batch도 필요 없어졌다.
  const postcardId = generateId('postcard');
  const postcard = await env.DB.prepare(`
    INSERT INTO digital_postcards
      (id, user_id, phrase_id, phrase, visit_days, preset, status)
    SELECT ?, ?, id, phrase, ?, 'morning', 'draft'
    FROM daily_phrases
    WHERE id = ? AND user_id = ? AND status = 'active'
      AND (SELECT balance FROM nuv_wallets WHERE user_id = ?) >= ?
    RETURNING id
  `).bind(
    postcardId, userId, visitDays,
    phraseId, userId, userId, POSTCARD_THRESHOLD
  ).first();

  return {
    created: Boolean(postcard),
    postcard_id: postcard?.id || null,
    balance: await getBalance(env, userId),
    threshold: POSTCARD_THRESHOLD,
  };
}

export async function savePostcard(env, postcardId, request) {
  const userId = getRequiredUserId(request);
  const { preset } = await request.json();
  if (!POSTCARD_PRESETS.has(preset)) {
    throw new Error('invalid postcard preset');
  }

  const postcard = await env.DB.prepare(`
    UPDATE digital_postcards
    SET preset = ?, status = 'saved', saved_at = COALESCE(saved_at, datetime('now'))
    WHERE id = ? AND user_id = ?
    RETURNING id, phrase, visit_days, preset, created_at, saved_at
  `).bind(preset, postcardId, userId).first();
  if (!postcard) {
    throw new Error(`Postcard not found: ${postcardId}`);
  }
  return { postcard };
}

export async function getSavedPostcards(env, request) {
  const userId = getRequiredUserId(request);
  const { results } = await env.DB.prepare(`
    SELECT id, phrase, visit_days, preset, created_at, saved_at, download_token
    FROM digital_postcards
    WHERE user_id = ? AND status = 'saved'
    ORDER BY saved_at DESC, created_at DESC
  `).bind(userId).all();
  const origin = new URL(request.url).origin;
  return {
    postcards: results.map(({ download_token: downloadToken, ...postcard }) => ({
      ...postcard,
      download_url: downloadToken
        ? `${origin}/api/nuv/postcard-files/${downloadToken}`
        : null,
    })),
  };
}

export async function uploadPostcardImage(env, postcardId, request) {
  const userId = getRequiredUserId(request);
  const contentType = request.headers.get('Content-Type')?.split(';')[0];
  if (contentType !== 'image/png') {
    throw new Error('postcard image must be image/png');
  }

  const image = await request.arrayBuffer();
  if (image.byteLength === 0 || image.byteLength > MAX_POSTCARD_IMAGE_BYTES) {
    throw new Error(`postcard image must be between 1 and ${MAX_POSTCARD_IMAGE_BYTES} bytes`);
  }

  const token = crypto.randomUUID().replaceAll('-', '');
  const postcard = await env.DB.prepare(`
    UPDATE digital_postcards
    SET image_data = ?, image_mime = 'image/png',
        download_token = COALESCE(download_token, ?)
    WHERE id = ? AND user_id = ? AND status = 'saved'
    RETURNING download_token
  `).bind(image, token, postcardId, userId).first();
  if (!postcard) {
    throw new Error(`Saved postcard not found: ${postcardId}`);
  }

  const origin = new URL(request.url).origin;
  return { download_url: `${origin}/api/nuv/postcard-files/${postcard.download_token}` };
}

export async function downloadPostcardImage(env, token) {
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return new Response('Not Found', { status: 404 });
  }
  const postcard = await env.DB.prepare(`
    SELECT image_data, image_mime FROM digital_postcards
    WHERE download_token = ? AND status = 'saved' AND image_data IS NOT NULL
  `).bind(token).first();
  if (!postcard) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(postcard.image_data, {
    headers: {
      'Content-Type': postcard.image_mime || 'image/png',
      'Content-Disposition': 'attachment; filename="dandani-postcard.png"',
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
