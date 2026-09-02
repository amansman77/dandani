import { getRequiredUserId, getClientLocalDate, logUserEvent } from './service-utils.js';
import { getNickname } from './nickname-service.js';

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function todayDateString(request) {
  const clientTime = request.headers.get('X-Client-Time');
  const clientTimezone = request.headers.get('X-Client-Timezone');
  const date = getClientLocalDate(clientTime, clientTimezone);
  return date.toISOString().split('T')[0];
}

export async function createPhrase(env, request) {
  const userId = getRequiredUserId(request);
  const body = await request.json();
  const { phrase } = body;

  if (!phrase || !phrase.trim()) {
    throw new Error('phrase is required');
  }

  const existing = await env.DB.prepare(`
    SELECT id FROM daily_phrases WHERE user_id = ? AND status = 'active'
  `).bind(userId).first();

  if (existing) {
    throw new Error('active phrase already exists');
  }

  const id = generateId('phrase');
  await env.DB.prepare(`
    INSERT INTO daily_phrases (id, user_id, phrase) VALUES (?, ?, ?)
  `).bind(id, userId, phrase.trim()).run();

  await logUserEvent(env, request, 'phrase_start', { phrase_id: id });

  return { id, phrase: phrase.trim(), status: 'active' };
}

export async function getActivePhrase(env, request) {
  const userId = getRequiredUserId(request);

  const phrase = await env.DB.prepare(`
    SELECT id, phrase, status, started_at
    FROM daily_phrases
    WHERE user_id = ? AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1
  `).bind(userId).first();

  if (!phrase) {
    return { phrase: null };
  }

  const { results: logs } = await env.DB.prepare(`
    SELECT log_date FROM daily_phrase_logs WHERE phrase_id = ? ORDER BY log_date ASC
  `).bind(phrase.id).all();

  const today = todayDateString(request);
  const loggedToday = logs.some((log) => log.log_date === today);

  // "N번째 아침이에요"는 되새기기 완료 횟수 대신 방문한 날 수(하루에 여러 번 켜도
  // 1로 셈)로 보여준다. 오늘치 page_visit 이벤트가 아직 안 쌓였을 수도 있어서
  // (분석 이벤트는 비동기로 나중에 기록됨) 그건 세지 않고, 이 요청 자체가 곧
  // "오늘 방문"이라는 증거이므로 항상 +1 해준다.
  // date('now')는 서버(UTC) 기준이라 한국 등 UTC+9 지역에선 자정이 아니라 오전
  // 9시에 날짜가 바뀐 것처럼 셌다. 이미 계산해둔 today(클라이언트 로컬 자정
  // 기준)를 그대로 경계로 써서 맞춘다.
  const { visit_days: visitDaysBeforeToday } = await env.DB.prepare(`
    SELECT COUNT(DISTINCT date(created_at)) as visit_days
    FROM user_events
    WHERE user_id = ? AND event_type = 'page_visit' AND created_at >= ? AND date(created_at) < ?
  `).bind(userId, phrase.started_at, today).first();
  const visitDays = (visitDaysBeforeToday || 0) + 1;

  return {
    phrase: {
      ...phrase,
      logged_days: logs.length,
      logged_dates: logs.map((log) => log.log_date),
      logged_today: loggedToday,
      visit_days: visitDays
    }
  };
}

export async function logPhraseDay(env, phraseId, request) {
  const userId = getRequiredUserId(request);

  const phrase = await env.DB.prepare(`
    SELECT id, status FROM daily_phrases WHERE id = ? AND user_id = ?
  `).bind(phraseId, userId).first();

  if (!phrase) {
    throw new Error(`Phrase not found: ${phraseId}`);
  }
  if (phrase.status !== 'active') {
    throw new Error(`Phrase is not active: ${phraseId}`);
  }

  const today = todayDateString(request);

  await env.DB.prepare(`
    INSERT OR IGNORE INTO daily_phrase_logs (id, phrase_id, user_id, log_date)
    VALUES (?, ?, ?, ?)
  `).bind(generateId('plog'), phraseId, userId, today).run();

  const { results: logs } = await env.DB.prepare(`
    SELECT log_date FROM daily_phrase_logs WHERE phrase_id = ?
  `).bind(phraseId).all();

  return { logged_days: logs.length };
}

export async function retirePhrase(env, phraseId, request) {
  const userId = getRequiredUserId(request);

  const result = await env.DB.prepare(`
    UPDATE daily_phrases SET status = 'retired', retired_at = datetime('now')
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).bind(phraseId, userId).run();

  if (result.meta.changes === 0) {
    throw new Error(`Active phrase not found: ${phraseId}`);
  }

  await logUserEvent(env, request, 'phrase_retired', { phrase_id: phraseId });

  return { success: true };
}

export async function getCommunityPhrases(env, request) {
  const userId = getRequiredUserId(request);

  const { results: phrases } = await env.DB.prepare(`
    SELECT id, user_id, phrase
    FROM daily_phrases
    WHERE status = 'active' AND user_id != ?
    ORDER BY started_at DESC
    LIMIT 20
  `).bind(userId).all();

  const items = [];
  for (const p of phrases) {
    const { results: countRows } = await env.DB.prepare(`
      SELECT COUNT(*) as cnt FROM daily_phrase_logs WHERE phrase_id = ?
    `).bind(p.id).all();
    items.push({
      nickname: getNickname(p.user_id),
      phrase: p.phrase,
      logged_days: countRows[0]?.cnt || 0
    });
  }

  return { items };
}

export async function getPhraseHistory(env, request) {
  const userId = getRequiredUserId(request);

  const { results: phrases } = await env.DB.prepare(`
    SELECT id, phrase, status, started_at, retired_at
    FROM daily_phrases
    WHERE user_id = ?
    ORDER BY started_at DESC
  `).bind(userId).all();

  const history = [];
  for (const p of phrases) {
    const { results: logs } = await env.DB.prepare(`
      SELECT log_date FROM daily_phrase_logs WHERE phrase_id = ? ORDER BY log_date DESC
    `).bind(p.id).all();
    history.push({ ...p, logged_days: logs.length, logged_dates: logs.map((l) => l.log_date) });
  }

  return { phrases: history };
}
