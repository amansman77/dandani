import { getRequiredUserId, getClientLocalDate, logUserEvent } from './service-utils.js';

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function todayDateString(request) {
  const body = {};
  const clientTime = request.headers.get('X-Client-Time');
  const clientTimezone = request.headers.get('X-Client-Timezone');
  const date = getClientLocalDate(clientTime, clientTimezone);
  return date.toISOString().split('T')[0];
}

export async function createChallenge(env, request) {
  const userId = getRequiredUserId(request);
  const body = await request.json();
  const { storyId, practiceTitle, practiceDescription, durationDays } = body;

  if (!practiceTitle) {
    throw new Error('practiceTitle is required');
  }

  const existing = await env.DB.prepare(`
    SELECT id FROM user_challenges WHERE user_id = ? AND status = 'active'
  `).bind(userId).first();

  if (existing) {
    throw new Error('active challenge already exists');
  }

  const id = generateId('challenge');
  await env.DB.prepare(`
    INSERT INTO user_challenges (id, user_id, story_id, practice_title, practice_description, duration_days)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, userId, storyId || null, practiceTitle, practiceDescription || null, durationDays || 7).run();

  await logUserEvent(env, request, 'challenge_start', { challenge_id: id, story_id: storyId || null });

  return { id, status: 'active' };
}

export async function getActiveChallenge(env, request) {
  const userId = getRequiredUserId(request);

  const challenge = await env.DB.prepare(`
    SELECT id, story_id, practice_title, practice_description, duration_days, status, started_at
    FROM user_challenges
    WHERE user_id = ? AND status = 'active'
    ORDER BY started_at DESC
    LIMIT 1
  `).bind(userId).first();

  if (!challenge) {
    return { challenge: null };
  }

  const { results: logs } = await env.DB.prepare(`
    SELECT log_date FROM user_challenge_logs WHERE challenge_id = ? ORDER BY log_date ASC
  `).bind(challenge.id).all();

  const today = todayDateString(request);
  const loggedToday = logs.some((log) => log.log_date === today);

  return {
    challenge: {
      ...challenge,
      logged_days: logs.length,
      logged_dates: logs.map((log) => log.log_date),
      logged_today: loggedToday
    }
  };
}

export async function logChallengeDay(env, challengeId, request) {
  const userId = getRequiredUserId(request);

  const challenge = await env.DB.prepare(`
    SELECT id, duration_days, status FROM user_challenges WHERE id = ? AND user_id = ?
  `).bind(challengeId, userId).first();

  if (!challenge) {
    throw new Error(`Challenge not found: ${challengeId}`);
  }
  if (challenge.status !== 'active') {
    throw new Error(`Challenge is not active: ${challengeId}`);
  }

  const today = todayDateString(request);
  const body = await request.json().catch(() => ({}));

  await env.DB.prepare(`
    INSERT OR IGNORE INTO user_challenge_logs (id, challenge_id, user_id, log_date, note)
    VALUES (?, ?, ?, ?, ?)
  `).bind(generateId('clog'), challengeId, userId, today, body.note || null).run();

  const { results: logs } = await env.DB.prepare(`
    SELECT log_date FROM user_challenge_logs WHERE challenge_id = ?
  `).bind(challengeId).all();

  const loggedDays = logs.length;
  let status = 'active';

  if (loggedDays >= challenge.duration_days) {
    status = 'completed';
    await env.DB.prepare(`
      UPDATE user_challenges SET status = 'completed', completed_at = datetime('now') WHERE id = ?
    `).bind(challengeId).run();
    await logUserEvent(env, request, 'challenge_complete', { challenge_id: challengeId, logged_days: loggedDays });
  }

  return { logged_days: loggedDays, duration_days: challenge.duration_days, status };
}
