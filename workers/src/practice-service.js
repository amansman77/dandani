import { getRequiredUserId } from './service-utils.js';
import { phraseDateContext } from './phrase-dates.js';
import { HttpError } from './http-errors.js';
import { getNuvBalance, issuePostcardForRecord, POSTCARD_THRESHOLD } from './nuv-service.js';

// 실천은 되새김과 다른 일이다. 되새김은 매일 두드리는 것이라 내용이 없고,
// 실천은 가끔 쓰는 것이라 본문이 있다. 그래서 여기서 하는 일은 하나뿐 —
// 적은 것을 그 시점 그대로 굳혀서 남기는 것.

const MAX_BODY_LENGTH = 2000;

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// 실천이 오늘 있었으란 법이 없다. 그저께 있었던 일을 오늘 적을 수도 있어서
// 날짜를 받되, 앞날은 받지 않는다 — 아직 살지 않은 날은 증명할 수 없다.
function resolvePracticedOn(value, today) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return today;
  return value > today ? today : value;
}

export async function createPracticeRecord(env, request) {
  const userId = getRequiredUserId(request);
  const { phrase_id: phraseId, body, practiced_on: practicedOnValue } = await request.json();

  // 아래 셋은 사용자에게 그대로 보여줄 말이라 HttpError로 던진다. 평범한
  // Error로 던지면 라우터가 500으로 묶어서 "잠시 후 다시 시도해 주세요"가
  // 되는데, 빈 기록에 그 말을 하면 무엇이 잘못됐는지 알 수가 없다.
  if (!phraseId || typeof phraseId !== 'string') {
    throw new HttpError(400, '어떤 문장의 실천인지 알 수 없어요.');
  }
  // 길이는 재지 않는다 — 한 줄이어도 기록이다. 빈 것만 막는다.
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) throw new HttpError(400, '실천 기록을 한 줄이라도 적어주세요.');
  if (text.length > MAX_BODY_LENGTH) {
    throw new HttpError(400, `실천 기록은 ${MAX_BODY_LENGTH}자까지 적을 수 있어요.`);
  }

  const phrase = await env.DB.prepare(`
    SELECT id, phrase FROM daily_phrases WHERE id = ? AND user_id = ?
  `).bind(phraseId, userId).first();
  if (!phrase) throw new HttpError(404, '문장을 찾을 수 없어요.');

  // 되새김과 같은 달력을 써야 한다 — 기기 시간대 기준의 오늘.
  const practicedOn = resolvePracticedOn(practicedOnValue, phraseDateContext(request).today);
  // 이 숫자는 여기서 굳는다. 나중에 되새김이 더 쌓여도 안 변한다 —
  // "이때까지 이만큼 되새기고 살아냈다"는 뜻이라 그 시점의 값이어야 한다.
  const balance = await getNuvBalance(env, userId);

  const record = {
    id: generateId('practice'),
    phrase_id: phrase.id,
    phrase: phrase.phrase,
    practiced_on: practicedOn,
    nuv_at_record: balance,
  };
  await env.DB.prepare(`
    INSERT INTO practice_records
      (id, user_id, phrase_id, phrase, practiced_on, body, nuv_at_record)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.id, userId, record.phrase_id, record.phrase,
    record.practiced_on, text, record.nuv_at_record
  ).run();

  // 문턱을 못 넘었어도 기록은 이미 저장됐다. 엽서만 기다린다.
  const postcardId = await issuePostcardForRecord(env, userId, record, balance);

  return {
    record: { ...record, body: text },
    postcard_id: postcardId,
    issued: Boolean(postcardId),
    balance,
    threshold: POSTCARD_THRESHOLD,
    nuv_needed: Math.max(0, POSTCARD_THRESHOLD - balance),
  };
}

export async function getPracticeRecords(env, request) {
  const userId = getRequiredUserId(request);
  const phraseId = new URL(request.url).searchParams.get('phrase_id');

  const { results } = await (phraseId
    ? env.DB.prepare(`
        SELECT r.id, r.phrase_id, r.phrase, r.practiced_on, r.body, r.nuv_at_record,
               r.created_at, p.id AS postcard_id
        FROM practice_records r
        LEFT JOIN digital_postcards p ON p.practice_record_id = r.id
        WHERE r.user_id = ? AND r.phrase_id = ?
        ORDER BY r.practiced_on DESC, r.created_at DESC
      `).bind(userId, phraseId)
    : env.DB.prepare(`
        SELECT r.id, r.phrase_id, r.phrase, r.practiced_on, r.body, r.nuv_at_record,
               r.created_at, p.id AS postcard_id
        FROM practice_records r
        LEFT JOIN digital_postcards p ON p.practice_record_id = r.id
        WHERE r.user_id = ?
        ORDER BY r.practiced_on DESC, r.created_at DESC
      `).bind(userId)
  ).all();

  return {
    records: results.map(({ postcard_id: postcardId, ...record }) => ({
      ...record,
      postcard_id: postcardId,
      // 문턱을 못 넘어 아직 봉해지지 않은 기록. 넘는 날 발행된다.
      awaiting_issue: !postcardId,
    })),
    threshold: POSTCARD_THRESHOLD,
  };
}

// 문턱을 넘은 뒤, 그동안 기다리던 기록들을 한꺼번에 엽서로 발행한다.
// 되새김을 기록할 때마다 불러서 "넘는 날 기다리던 것이 엽서가 된다"를 만든다.
export async function issueAwaitingPostcards(env, userId) {
  const balance = await getNuvBalance(env, userId);
  if (balance < POSTCARD_THRESHOLD) return { issued: 0 };

  const { results } = await env.DB.prepare(`
    SELECT r.id, r.phrase_id, r.phrase, r.nuv_at_record
    FROM practice_records r
    LEFT JOIN digital_postcards p ON p.practice_record_id = r.id
    WHERE r.user_id = ? AND p.id IS NULL
    ORDER BY r.practiced_on ASC, r.created_at ASC
  `).bind(userId).all();

  let issued = 0;
  for (const record of results) {
    if (await issuePostcardForRecord(env, userId, record, balance)) issued += 1;
  }
  return { issued };
}
