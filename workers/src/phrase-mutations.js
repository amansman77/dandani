import { getRequiredUserId, logUserEvent } from './core.js';
import { HttpError, readJson } from './http-errors.js';

async function readPhrase(request) {
  const body = await readJson(request);
  if (typeof body?.phrase !== 'string' || !body.phrase.trim()) {
    throw new HttpError(400, '문장을 입력해 주세요.');
  }
  const source = ['picked', 'picked_edited', 'written'].includes(body.source) ? body.source : 'unknown';
  return { phrase: body.phrase.trim(), source };
}

export async function createPhrase(env, request) {
  const userId = getRequiredUserId(request);
  const { phrase, source } = await readPhrase(request);
  const id = `phrase_${crypto.randomUUID()}`;
  const result = await env.DB.prepare(`
    INSERT INTO daily_phrases (id, user_id, phrase)
    SELECT ?, ?, ? WHERE NOT EXISTS (
      SELECT 1 FROM daily_phrases WHERE user_id = ? AND status = 'active'
    )
  `).bind(id, userId, phrase, userId).run();
  if (!result.meta.changes) {
    throw new HttpError(409, '이미 사용 중인 문장이 있어요. 새로고침 후 다시 확인해 주세요.');
  }
  await logUserEvent(env, request, 'phrase_start', { phrase_id: id, source });
  return { id, phrase, status: 'active' };
}

async function previousReplacement(db, sourceId, userId, text) {
  const source = await db.prepare(`
    SELECT next.id, next.phrase, next.status FROM daily_phrases AS original
    LEFT JOIN daily_phrases AS next ON next.id = original.replacement_id AND next.user_id = original.user_id
    WHERE original.id = ? AND original.user_id = ?
  `).bind(sourceId, userId).first();
  if (!source) throw new HttpError(404, '문장을 찾을 수 없어요.');
  if (source.phrase !== text || source.status !== 'active') {
    throw new HttpError(409, '문장이 이미 변경됐어요. 새로고침 후 다시 확인해 주세요.');
  }
  return source;
}

export async function replacePhrase(env, sourceId, request) {
  const userId = getRequiredUserId(request);
  const { phrase, source } = await readPhrase(request);
  const id = `phrase_${crypto.randomUUID()}`;
  // The marker ties the insert to THIS update, even when another request won.
  // D1 batch rolls both statements back if the insert fails.
  const [retired] = await env.DB.batch([
    env.DB.prepare(`
      UPDATE daily_phrases SET status = 'retired', retired_at = datetime('now'), replacement_id = ?
      WHERE id = ? AND user_id = ? AND status = 'active'
    `).bind(id, sourceId, userId),
    env.DB.prepare(`
      INSERT INTO daily_phrases (id, user_id, phrase)
      SELECT ?, ?, ? FROM daily_phrases
      WHERE id = ? AND user_id = ? AND replacement_id = ?
    `).bind(id, userId, phrase, sourceId, userId, id),
  ]);
  if (!retired.meta.changes) return previousReplacement(env.DB, sourceId, userId, phrase);
  await logUserEvent(env, request, 'phrase_retired', { phrase_id: sourceId });
  await logUserEvent(env, request, 'phrase_start', { phrase_id: id, source });
  return { id, phrase, status: 'active' };
}
