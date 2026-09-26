import { getRequiredUserId } from './service-utils.js';
import { phraseDateContext } from './phrase-dates.js';
import { HttpError } from './http-errors.js';
import { getNuvBalance, issuePostcardForRecord } from './nuv-service.js';

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

  // 실천한 날까지 이 문장을 며칠 되새겼는가. 오늘까지가 아니라 그날까지로
  // 세는 건, 그저께 일을 오늘 적을 수 있기 때문이다 — 오늘 날수를 찍으면
  // "그날 31일째였다"가 사실이 아니게 된다.
  const counted = await env.DB.prepare(`
    SELECT COUNT(DISTINCT log_date) AS days FROM daily_phrase_logs
    WHERE phrase_id = ? AND user_id = ? AND log_date <= ?
  `).bind(phrase.id, userId, practicedOn).first();

  const record = {
    id: generateId('practice'),
    phrase_id: phrase.id,
    phrase: phrase.phrase,
    practiced_on: practicedOn,
    body: text,
    logged_days: counted?.days || 0,
    nuv_at_record: balance,
  };
  await env.DB.prepare(`
    INSERT INTO practice_records
      (id, user_id, phrase_id, phrase, practiced_on, body, logged_days, nuv_at_record)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    record.id, userId, record.phrase_id, record.phrase,
    record.practiced_on, record.body, record.logged_days, record.nuv_at_record
  ).run();

  // 적은 순간 바로 엽서가 된다. 살아낸 일이 증명이지, 누브가 증명이 아니다.
  const postcardId = await issuePostcardForRecord(env, userId, record);

  return {
    record,
    postcard_id: postcardId,
    issued: Boolean(postcardId),
    balance,
  };
}

export async function getPracticeRecords(env, request) {
  const userId = getRequiredUserId(request);
  const phraseId = new URL(request.url).searchParams.get('phrase_id');

  const { results } = await (phraseId
    ? env.DB.prepare(`
        SELECT r.id, r.phrase_id, r.phrase, r.practiced_on, r.body, r.logged_days,
               r.nuv_at_record, r.created_at, p.id AS postcard_id
        FROM practice_records r
        LEFT JOIN digital_postcards p ON p.practice_record_id = r.id
        WHERE r.user_id = ? AND r.phrase_id = ?
        ORDER BY r.practiced_on DESC, r.created_at DESC
      `).bind(userId, phraseId)
    : env.DB.prepare(`
        SELECT r.id, r.phrase_id, r.phrase, r.practiced_on, r.body, r.logged_days,
               r.nuv_at_record, r.created_at, p.id AS postcard_id
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
    })),
  };
}
