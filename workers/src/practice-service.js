import {
  addStartedAtDateString,
  calculateChallengeDayFromStart,
  getClientLocalDate,
  getRequiredUserId,
  logUserEvent
} from './service-utils.js';

export async function getTodayPractice(env, request) {
  const url = new URL(request.url);
  const challengeIdParam = url.searchParams.get('challengeId');
  const startedAtParam = url.searchParams.get('startedAt') || request.headers.get('X-Started-At');

  if (!challengeIdParam) {
    throw new Error('challengeId parameter is required');
  }

  if (!startedAtParam) {
    throw new Error('startedAt parameter or X-Started-At header is required');
  }

  const clientTimezone = request.headers.get('X-Client-Timezone');
  const clientTime = request.headers.get('X-Client-Time');
  const currentDate = getClientLocalDate(clientTime, clientTimezone);
  const userId = getRequiredUserId(request);

  const challengeId = parseInt(challengeIdParam, 10);
  const challenge = await env.DB.prepare(`
    SELECT
      id,
      name,
      description,
      COALESCE(is_recommended, 0) as is_recommended,
      created_at
    FROM challenges WHERE id = ?
  `).bind(challengeId).first();

  if (!challenge) {
    throw new Error(`Challenge not found: ${challengeId}`);
  }

  const maxDayResult = await env.DB.prepare(`
    SELECT MAX(day) as max_day FROM practices WHERE challenge_id = ?
  `).bind(challenge.id).first();

  const totalDays = Math.max(1, maxDayResult?.max_day || 1);
  const adjustedDay = calculateChallengeDayFromStart(
    startedAtParam,
    currentDate,
    totalDays
  );

  const practice = await env.DB.prepare(
    'SELECT * FROM practices WHERE challenge_id = ? AND day = ?'
  ).bind(challenge.id, adjustedDay).first();

  if (!practice) {
    throw new Error(`Practice not found for challenge ${challengeId} on day ${adjustedDay}`);
  }

  await logUserEvent(env, request, 'practice_view', {
    challenge_id: challenge.id,
    practice_id: practice.id,
    day: adjustedDay
  });

  const startedAtDateStr = addStartedAtDateString(startedAtParam);
  const feedback = await env.DB.prepare(`
    SELECT id FROM practice_feedback
    WHERE user_id = ? AND challenge_id = ? AND practice_day = ?
      AND date(created_at) >= date(?)
    ORDER BY created_at DESC LIMIT 1
  `).bind(userId, challenge.id, adjustedDay, startedAtDateStr).first();

  return {
    ...practice,
    day: adjustedDay,
    isRecorded: !!feedback
  };
}

export async function getChallenges(env) {
  const challengesQuery = await env.DB.prepare(`
    SELECT
      c.id,
      c.name,
      c.description,
      COALESCE(c.is_recommended, 0) AS is_recommended,
      COALESCE(c.is_popular, 0) AS is_popular,
      c.created_at,
      COALESCE(MAX(p.day), 1) AS total_days
    FROM challenges c
    LEFT JOIN practices p ON p.challenge_id = c.id
    GROUP BY c.id, c.name, c.description, c.is_recommended, c.is_popular, c.created_at
    ORDER BY c.id DESC
  `).all();

  const challenges = challengesQuery.results.map((challenge) => ({
    id: challenge.id,
    name: challenge.name,
    description: challenge.description,
    total_days: Math.max(1, Number(challenge.total_days) || 1),
    is_recommended: challenge.is_recommended === 1,
    is_popular: challenge.is_popular === 1
  }));

  return { challenges };
}

export async function getChallengeDetail(env, challengeId, request) {
  const startedAt = request.headers.get('X-Started-At');
  if (!startedAt) {
    throw new Error('X-Started-At header is required');
  }

  const challenge = await env.DB.prepare(`
    SELECT
      id,
      name,
      description,
      COALESCE(is_recommended, 0) as is_recommended,
      created_at
    FROM challenges WHERE id = ?
  `).bind(challengeId).first();

  if (!challenge) {
    throw new Error('Challenge not found');
  }

  const practices = await env.DB.prepare(`
    SELECT * FROM practices
    WHERE challenge_id = ?
    ORDER BY day ASC
  `).bind(challengeId).all();

  const clientTimezone = request.headers.get('X-Client-Timezone');
  const clientTime = request.headers.get('X-Client-Time');
  const currentDate = getClientLocalDate(clientTime, clientTimezone);

  const maxDayResult = await env.DB.prepare(`
    SELECT MAX(day) as max_day FROM practices WHERE challenge_id = ?
  `).bind(challengeId).first();
  const totalDays = Math.max(1, maxDayResult?.max_day || 1);

  const currentDay = calculateChallengeDayFromStart(startedAt, currentDate, totalDays);
  let status = 'current';
  if (currentDay < 1) {
    status = 'upcoming';
  } else if (currentDay > totalDays) {
    status = 'completed';
  }

  const userId = getRequiredUserId(request);
  const startedAtDateStr = addStartedAtDateString(startedAt);
  const userFeedback = await env.DB.prepare(`
    SELECT practice_day FROM practice_feedback
    WHERE user_id = ? AND challenge_id = ?
      AND date(created_at) >= date(?)
  `).bind(userId, challengeId, startedAtDateStr).all();

  const completedDays = new Set(userFeedback.results.map((feedback) => feedback.practice_day));
  const practicesWithStatus = practices.results.map((practice) => ({
    ...practice,
    completed: completedDays.has(practice.day),
    is_today: practice.day === currentDay && status === 'current'
  }));

  const actualCompletedDays = completedDays.size;
  const actualProgressPercentage = Math.round((actualCompletedDays / totalDays) * 100);

  return {
    id: challenge.id,
    name: challenge.name,
    description: challenge.description,
    total_days: totalDays,
    current_day: currentDay,
    progress_percentage: actualProgressPercentage,
    completed_days: actualCompletedDays,
    status,
    practices: practicesWithStatus
  };
}

export async function submitFeedback(env, request) {
  const body = await request.json();
  const { challengeId, practiceDay, moodChange, wasHelpful, practiceDescription } = body;
  const userId = getRequiredUserId(request);

  await env.DB.prepare(`
    INSERT OR REPLACE INTO practice_feedback
    (user_id, challenge_id, practice_day, mood_change, was_helpful, practice_description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(userId, challengeId, practiceDay, moodChange, wasHelpful, practiceDescription).run();

  await logUserEvent(env, request, 'practice_complete', {
    challenge_id: challengeId,
    practice_day: practiceDay,
    mood_change: moodChange,
    was_helpful: wasHelpful
  });

  await logUserEvent(env, request, 'feedback_submit', {
    challenge_id: challengeId,
    practice_day: practiceDay,
    mood_change: moodChange,
    was_helpful: wasHelpful
  });

  return {
    success: true,
    message: '피드백이 성공적으로 제출되었습니다.'
  };
}

export async function getPracticeRecord(env, challengeId, practiceDay, request) {
  const userId = getRequiredUserId(request);
  const startedAt = request.headers.get('X-Started-At');

  if (!practiceDay) {
    return null;
  }

  let query = `
    SELECT * FROM practice_feedback
    WHERE user_id = ? AND challenge_id = ? AND practice_day = ?
  `;
  const bindParams = [userId, challengeId, practiceDay];

  if (startedAt) {
    query += ' AND date(created_at) >= date(?)';
    bindParams.push(addStartedAtDateString(startedAt));
  }

  query += ' ORDER BY created_at DESC LIMIT 1';
  return env.DB.prepare(query).bind(...bindParams).first();
}

export async function getPracticeHistory(env, challengeId, request) {
  const userId = getRequiredUserId(request);
  const startedAt = request.headers.get('X-Started-At');

  let query = `
    SELECT * FROM practice_feedback
    WHERE user_id = ? AND challenge_id = ?
  `;
  const bindParams = [userId, challengeId];

  if (startedAt) {
    query += ' AND date(created_at) >= date(?)';
    bindParams.push(addStartedAtDateString(startedAt));
  }

  query += ' ORDER BY practice_day ASC';
  const records = await env.DB.prepare(query).bind(...bindParams).all();
  return records.results;
}

export async function updatePracticeRecord(env, request) {
  const body = await request.json();
  const { challengeId, practiceDay, moodChange, wasHelpful, practiceDescription } = body;
  const userId = getRequiredUserId(request);

  const result = await env.DB.prepare(`
    UPDATE practice_feedback
    SET mood_change = ?, was_helpful = ?, practice_description = ?
    WHERE user_id = ? AND challenge_id = ? AND practice_day = ?
  `).bind(moodChange, wasHelpful, practiceDescription, userId, challengeId, practiceDay).run();

  if (result.changes === 0) {
    throw new Error('수정할 기록을 찾을 수 없습니다.');
  }

  return getPracticeRecord(env, challengeId, practiceDay, request);
}

function mapEmotionToMoodChange(emotion) {
  switch (emotion) {
    case 'calm':
      return 'improved';
    case 'neutral':
      return 'same';
    case 'unknown':
    default:
      return 'unknown';
  }
}

function generateAssistantNote(challengeTitle, emotion) {
  const title = challengeTitle || '오늘의 실천';
  switch (emotion) {
    case 'calm':
      return `${title}을(를) 하고 나서 마음이 조금 편안해졌어요.`;
    case 'neutral':
      return `${title}을(를) 해보니 큰 변화는 없었지만, 오늘도 실천을 이어갔어요.`;
    case 'unknown':
    default:
      return `${title}을(를) 해봤고, 아직은 잘 모르겠지만 계속 해보려고 해요.`;
  }
}

async function resolvePracticeDay(env, challengeId, request, providedPracticeDay) {
  const parsedProvidedDay = parseInt(providedPracticeDay, 10);
  if (Number.isFinite(parsedProvidedDay) && parsedProvidedDay > 0) {
    return parsedProvidedDay;
  }

  const startedAt = request.headers.get('X-Started-At');
  if (!startedAt) {
    return 1;
  }

  const clientTimezone = request.headers.get('X-Client-Timezone');
  const clientTime = request.headers.get('X-Client-Time');
  const currentDate = getClientLocalDate(clientTime, clientTimezone);

  const maxDayResult = await env.DB.prepare(`
    SELECT MAX(day) as max_day FROM practices WHERE challenge_id = ?
  `).bind(challengeId).first();
  const totalDays = Math.max(1, maxDayResult?.max_day || 1);

  return calculateChallengeDayFromStart(startedAt, currentDate, totalDays);
}

export async function saveRecordFromAssistant(env, request) {
  const body = await request.json();
  const {
    challengeId,
    emotion = 'unknown',
    note = '',
    source = 'assistant',
    practiceDay,
    challengeTitle
  } = body;

  if (!challengeId) {
    throw new Error('challengeId is required');
  }

  const userId = getRequiredUserId(request);
  const resolvedPracticeDay = await resolvePracticeDay(env, challengeId, request, practiceDay);

  const existing = await env.DB.prepare(`
    SELECT practice_description, mood_change, was_helpful
    FROM practice_feedback
    WHERE user_id = ? AND challenge_id = ? AND practice_day = ?
    LIMIT 1
  `).bind(userId, challengeId, resolvedPracticeDay).first();

  const generatedNote = note && note.trim()
    ? note.trim()
    : generateAssistantNote(challengeTitle, emotion);

  const finalNote = existing?.practice_description && existing.practice_description.trim()
    ? existing.practice_description
    : generatedNote;

  const moodChange = mapEmotionToMoodChange(emotion);
  const wasHelpful = existing?.was_helpful || 'unknown';

  await env.DB.prepare(`
    INSERT OR REPLACE INTO practice_feedback
    (user_id, challenge_id, practice_day, mood_change, was_helpful, practice_description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    userId,
    challengeId,
    resolvedPracticeDay,
    moodChange,
    wasHelpful,
    finalNote
  ).run();

  await logUserEvent(env, request, 'feedback_submit', {
    challenge_id: challengeId,
    practice_day: resolvedPracticeDay,
    source
  });

  return { success: true };
}
