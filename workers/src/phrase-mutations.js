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

// 오타를 고치는 것과 다른 문장으로 바꾸는 것은 다른 일이다.
//
// replacePhrase는 옛 문장을 접고 새 문장을 세운다. 되새김 기록은 문장에
// 붙어 있어서(daily_phrase_logs.phrase_id) 새로 시작한다 — 다른 말을 살기로
// 했으니 그게 맞다. 그런데 "화를 내기전에"의 띄어쓰기 하나를 고치는 것도
// 같은 길로 가서, 31일치 되새김이 말없이 0이 됐다.
//
// 그래서 글자만 고치는 길을 따로 둔다. 같은 문장이니 id가 그대로고,
// 되새김도 연속도 이어진다. 둘 중 무엇인지는 사람이 정한다 — 글자가 얼마나
// 바뀌었는지로 기계가 짐작하면, 어느 쪽으로 틀리든 조용히 틀린다.
//
// 이미 발행된 엽서·실천 기록은 그때의 문장을 통째로 복사해 굳혀둔 것이라
// 여기서 안 바뀐다. 증명은 "그때 그 말"이어야 하니까 그게 맞다.
export async function rewritePhrase(env, phraseId, request) {
  const userId = getRequiredUserId(request);
  const { phrase } = await readPhrase(request);

  const result = await env.DB.prepare(`
    UPDATE daily_phrases SET phrase = ?
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).bind(phrase, phraseId, userId).run();
  if (!result.meta.changes) {
    throw new HttpError(409, '사용 중인 문장을 찾을 수 없어요. 새로고침 후 다시 확인해 주세요.');
  }

  await logUserEvent(env, request, 'phrase_rewritten', { phrase_id: phraseId });
  return { id: phraseId, phrase, status: 'active' };
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
