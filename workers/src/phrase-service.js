import { phraseDateContext, countPhraseVisits } from './phrase-dates.js';
import { HttpError } from './http-errors.js';
import { getRequiredUserId, logUserEvent } from './service-utils.js';
import { getNickname } from './nickname-service.js';
import { awardNuvForReflection } from './nuv-service.js';

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

  const dates = phraseDateContext(request);
  const today = dates.today;
  const loggedToday = logs.some(log => log.log_date === today);
  const visitDays = await countPhraseVisits(env.DB, phrase, logs, dates, userId);

  return {
    phrase: {
      ...phrase,
      today,
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
    throw new HttpError(404, '문장을 찾을 수 없어요.');
  }
  if (phrase.status !== 'active') {
    throw new HttpError(409, '이미 종료된 문장이에요.');
  }

  const { today } = phraseDateContext(request);

  await env.DB.prepare(`
    INSERT OR IGNORE INTO daily_phrase_logs (id, phrase_id, user_id, log_date)
    SELECT ?, id, user_id, ? FROM daily_phrases
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).bind(generateId('plog'), today, phraseId, userId).run();

  const { results: logs } = await env.DB.prepare(`
    SELECT log_date FROM daily_phrase_logs WHERE phrase_id = ?
  `).bind(phraseId).all();

  if (!logs.some(log => log.log_date === today)) {
    throw new HttpError(409, '문장이 이미 변경됐어요. 새로고침 후 다시 확인해 주세요.');
  }
  const reward = await awardNuvForReflection(env, userId, phraseId, today);
  return { logged_days: logs.length, ...reward };
}

export async function retirePhrase(env, phraseId, request) {
  const userId = getRequiredUserId(request);

  const result = await env.DB.prepare(`
    UPDATE daily_phrases SET status = 'retired', retired_at = datetime('now')
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).bind(phraseId, userId).run();

  if (result.meta.changes === 0) {
    throw new HttpError(409, '사용 중인 문장을 찾을 수 없어요.');
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
