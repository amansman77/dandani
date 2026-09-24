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
    SELECT id, phrase, visit_days, preset, created_at, saved_at, download_token,
           length(image_data) AS image_bytes,
           practice_record_id, practice_body, practiced_on, nuv_at_issue, issue_no, issued_at
    FROM digital_postcards
    WHERE user_id = ? AND status = 'saved'
    ORDER BY issue_no DESC, saved_at DESC, created_at DESC
  `).bind(userId).all();
  const origin = new URL(request.url).origin;
  return {
    postcards: results.map(({
      download_token: downloadToken, image_bytes: imageBytes,
      practice_record_id: practiceRecordId, ...postcard
    }) => ({
      ...postcard,
      // 실천 없이 누브를 주고 샀던 옛 엽서. 지우지도 번호를 주지도 않고,
      // 화면에서만 갈라 보여준다.
      is_legacy: !practiceRecordId,
      download_url: downloadToken ? postcardFileUrl(origin, downloadToken, imageBytes) : null,
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
  return {
    download_url: postcardFileUrl(origin, postcard.download_token, image.byteLength),
  };
}

// 엽서 하나의 주소는 토큰으로 고정인데, 배경을 바꿔 다시 저장하면 같은 토큰
// 뒤의 바이트가 바뀐다. 예전엔 여기에 immutable 캐시를 1년으로 걸어놨다 —
// "이 주소의 내용은 절대 안 바뀐다"는 약속인데 실제로는 바뀌니까 거짓말이었다.
//
// 그 거짓말이 실제로 사람을 물었다. D1 BLOB 버그로 망가진 본문이 한 번
// 내려간 뒤, 서버를 고쳐도 브라우저가 1년짜리 immutable 캐시를 붙들고 있어서
// 계속 깨진 파일만 받았다(Arc에서 재현). immutable은 재검증조차 안 한다.
//
// 그래서 주소에 내용 길이를 붙인다. 바이트가 달라지면 주소가 달라져서
// 낡은 캐시를 아예 못 집는다. 캐시 자체는 ETag로 다시 물어보게 둔다.
const postcardFileUrl = (origin, token, bytes) =>
  `${origin}/api/nuv/postcard-files/${token}${bytes ? `?v=${bytes}` : ''}`;

// D1은 BLOB을 숫자 배열([137,80,78,...])로 돌려준다. 그대로 Response에 넣으면
// 배열이 문자열로 바뀌어서 "137,80,78,..."이라는 텍스트가 내려간다 — 파일은
// 받아지는데 어떤 뷰어에서도 안 열린다(75바이트 PNG가 217바이트 ASCII가 됐다).
//
// 테스트는 이걸 못 잡았다. node:sqlite는 BLOB을 Uint8Array로 주기 때문에
// 가짜 D1이 진짜 D1보다 친절했던 것이다. 지금은 테스트 쪽 가짜가 숫자 배열을
// 돌려주도록 맞춰뒀다.
function toBytes(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return value;
  return new Uint8Array(value);
}

const CACHE = 'private, max-age=0, must-revalidate';

export async function downloadPostcardImage(env, token, ifNoneMatch) {
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

  const bytes = toBytes(postcard.image_data);
  // 같은 주소 뒤의 바이트가 바뀔 수 있으니 immutable은 쓸 수 없다. 대신
  // ETag로 매번 물어보게 하고, 안 바뀌었으면 304로 끝낸다 — 800KB짜리를
  // 매번 다시 내려받지 않으면서도 낡은 그림을 붙들고 있지 않는다.
  const etag = `"${bytes.length}"`;
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': CACHE } });
  }

  return new Response(bytes, {
    headers: {
      'Content-Type': postcard.image_mime || 'image/png',
      'Content-Disposition': 'attachment; filename="dandani-postcard.png"',
      'Cache-Control': CACHE,
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
