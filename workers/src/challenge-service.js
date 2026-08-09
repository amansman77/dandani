import { getRequiredUserId, getClientLocalDate, logUserEvent } from './service-utils.js';

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function todayDateString(request) {
  const clientTime = request.headers.get('X-Client-Time');
  const clientTimezone = request.headers.get('X-Client-Timezone');
  const date = getClientLocalDate(clientTime, clientTimezone);
  return date.toISOString().split('T')[0];
}

export async function getChallengeCatalogDetail(env, challengeId) {
  const challenge = await env.DB.prepare(`
    SELECT id, name, description, COALESCE(is_recommended, 0) AS is_recommended, COALESCE(is_popular, 0) AS is_popular
    FROM challenges WHERE id = ?
  `).bind(challengeId).first();

  if (!challenge) {
    throw new Error(`Challenge not found: ${challengeId}`);
  }

  const { results: practices } = await env.DB.prepare(`
    SELECT day, title, description FROM practices WHERE challenge_id = ? ORDER BY day ASC
  `).bind(challengeId).all();

  return {
    id: challenge.id,
    name: challenge.name,
    description: challenge.description,
    is_recommended: challenge.is_recommended === 1,
    is_popular: challenge.is_popular === 1,
    total_days: Math.max(1, practices.length),
    practices
  };
}

export async function createChallenge(env, request) {
  const userId = getRequiredUserId(request);
  const body = await request.json();
  const { storyId, sourceChallengeId, practiceTitle, practiceDescription, durationDays } = body;

  const existing = await env.DB.prepare(`
    SELECT id FROM user_challenges WHERE user_id = ? AND status = 'active'
  `).bind(userId).first();

  if (existing) {
    throw new Error('active challenge already exists');
  }

  let finalPracticeTitle = practiceTitle;
  let finalPracticeDescription = practiceDescription || null;
  let finalDurationDays = durationDays || 7;

  if (sourceChallengeId) {
    const source = await getChallengeCatalogDetail(env, sourceChallengeId);
    finalPracticeTitle = source.name;
    finalPracticeDescription = source.description;
    finalDurationDays = source.total_days;
  }

  if (!finalPracticeTitle) {
    throw new Error('practiceTitle or sourceChallengeId is required');
  }

  const id = generateId('challenge');
  await env.DB.prepare(`
    INSERT INTO user_challenges (id, user_id, story_id, source_challenge_id, practice_title, practice_description, duration_days)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, userId, storyId || null, sourceChallengeId || null, finalPracticeTitle, finalPracticeDescription, finalDurationDays).run();

  await logUserEvent(env, request, 'challenge_start', {
    challenge_id: id,
    story_id: storyId || null,
    source_challenge_id: sourceChallengeId || null
  });

  return { id, status: 'active' };
}

async function getTodayPracticeForChallenge(env, challenge, loggedDays) {
  if (!challenge.source_challenge_id) {
    return { title: challenge.practice_title, description: challenge.practice_description };
  }

  const dayNumber = Math.min(loggedDays + 1, challenge.duration_days);
  const practice = await env.DB.prepare(`
    SELECT title, description FROM practices WHERE challenge_id = ? AND day = ?
  `).bind(challenge.source_challenge_id, dayNumber).first();

  if (!practice) {
    return { title: challenge.practice_title, description: challenge.practice_description };
  }

  return { title: practice.title, description: practice.description, day: dayNumber };
}

export async function getActiveChallenge(env, request) {
  const userId = getRequiredUserId(request);

  const challenge = await env.DB.prepare(`
    SELECT id, story_id, source_challenge_id, practice_title, practice_description, duration_days, status, started_at
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
  const loggedDays = logs.length;
  const todayPractice = await getTodayPracticeForChallenge(env, challenge, loggedDays);

  return {
    challenge: {
      ...challenge,
      logged_days: loggedDays,
      logged_dates: logs.map((log) => log.log_date),
      logged_today: loggedToday,
      today_practice_title: todayPractice.title,
      today_practice_description: todayPractice.description
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
