// 실천 과제 데이터
const PRACTICES = [
  {
    id: 1,
    title: "호흡을 가다듬고 현재에 집중하기",
    description: "3분 동안 눈을 감고 깊은 호흡을 하며, 현재 순간에 집중해보세요. 생각이 떠오르면 그것을 인정하고 다시 호흡으로 돌아옵니다.",
    category: "mindfulness"
  },
  {
    id: 2,
    title: "감사 일기 쓰기",
    description: "오늘 하루 감사한 일 3가지를 적어보세요. 작은 것이라도 괜찮습니다.",
    category: "gratitude"
  },
  // ... 더 많은 실천 과제들
];

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Client-Timezone, X-Client-Time, X-User-ID, X-Session-ID, User-Agent, CF-Connecting-IP',
  'Access-Control-Max-Age': '86400',
};

// 허용된 이벤트 타입 목록
const ALLOWED_EVENT_TYPES = [
  'page_visit',
  'practice_view', 
  'practice_complete',
  'feedback_submit',
  'challenge_start',
  'challenge_complete',
  'ai_chat_start',
  'ai_chat_message',
  'timefold_envelope_create',
  'onboarding_complete'
];

// 이벤트 로깅 유틸리티 함수
async function logUserEvent(env, request, eventType, eventData = {}) {
  try {
    // 이벤트 타입 검증
    if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
      console.warn(`Invalid event type: ${eventType}. Skipping event logging.`);
      return;
    }

    const userId = request.headers.get('X-User-ID') || 'anonymous';
    const sessionId = request.headers.get('X-Session-ID') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userAgent = request.headers.get('User-Agent') || '';
    const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    // IP 주소 마스킹 (개인정보 보호)
    const maskedIp = ipAddress.replace(/\d+\.\d+\.\d+\.\d+/, (match) => {
      const parts = match.split('.');
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    });

    await env.DB.prepare(`
      INSERT INTO user_events (user_id, event_type, event_data, session_id, user_agent, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      eventType,
      JSON.stringify(eventData),
      sessionId,
      userAgent,
      maskedIp
    ).run();

    // 사용자 세션 업데이트
    await updateUserSession(env, userId, sessionId);
    
    // 일별 활동 요약 업데이트
    await updateDailyActivity(env, userId, eventType);
    
  } catch (error) {
    console.error('Event logging error:', error);
    // 이벤트 로깅 실패는 서비스에 영향을 주지 않도록 조용히 처리
  }
}

// 사용자 세션 업데이트
async function updateUserSession(env, userId, sessionId) {
  try {
    const now = new Date().toISOString();
    
    // 기존 세션 확인
    const existingSession = await env.DB.prepare(`
      SELECT * FROM user_sessions WHERE session_id = ?
    `).bind(sessionId).first();
    
    if (existingSession) {
      // 세션 업데이트
      await env.DB.prepare(`
        UPDATE user_sessions 
        SET last_visit_at = ?, total_visits = total_visits + 1, total_events = total_events + 1, updated_at = ?
        WHERE session_id = ?
      `).bind(now, now, sessionId).run();
    } else {
      // 새 세션 생성
      await env.DB.prepare(`
        INSERT INTO user_sessions (user_id, session_id, first_visit_at, last_visit_at, total_visits, total_events)
        VALUES (?, ?, ?, ?, 1, 1)
      `).bind(userId, sessionId, now, now).run();
    }
  } catch (error) {
    console.error('Session update error:', error);
  }
}

// 일별 활동 요약 업데이트
async function updateDailyActivity(env, userId, eventType) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 오늘 활동 확인
    const existingActivity = await env.DB.prepare(`
      SELECT * FROM user_daily_activity WHERE user_id = ? AND activity_date = ?
    `).bind(userId, today).first();
    
    const isActive = true;
    const practiceCompleted = eventType === 'practice_complete';
    const feedbackSubmitted = eventType === 'feedback_submit';
    const aiChatUsed = eventType === 'ai_chat_start' || eventType === 'ai_chat_message';
    
    if (existingActivity) {
      // 기존 활동 업데이트
      await env.DB.prepare(`
        UPDATE user_daily_activity 
        SET is_active = ?, 
            practice_completed = CASE WHEN ? = 1 THEN 1 ELSE practice_completed END,
            feedback_submitted = CASE WHEN ? = 1 THEN 1 ELSE feedback_submitted END,
            ai_chat_used = CASE WHEN ? = 1 THEN 1 ELSE ai_chat_used END,
            total_events = total_events + 1,
            updated_at = ?
        WHERE user_id = ? AND activity_date = ?
      `).bind(
        isActive, practiceCompleted, feedbackSubmitted, aiChatUsed, 
        new Date().toISOString(), userId, today
      ).run();
    } else {
      // 새 활동 생성
      await env.DB.prepare(`
        INSERT INTO user_daily_activity 
        (user_id, activity_date, is_active, practice_completed, feedback_submitted, ai_chat_used, total_events)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).bind(userId, today, isActive, practiceCompleted, feedbackSubmitted, aiChatUsed).run();
    }
  } catch (error) {
    console.error('Daily activity update error:', error);
  }
}

// 오늘의 실천 과제와 기록 상태 가져오기
async function getTodayPractice(env, request) {
  // 이벤트 로깅: 페이지 방문
  await logUserEvent(env, request, 'page_visit', { page: 'today_practice' });
  
  // 클라이언트의 시간대 정보 받기
  const clientTimezone = request.headers.get('X-Client-Timezone');
  const clientTime = request.headers.get('X-Client-Time');
  
  // 클라이언트 시간이 있으면 사용, 없으면 UTC 사용
  const now = clientTime ? new Date(clientTime) : new Date();
  
  // UTC 기준으로 날짜 계산
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  
  // 클라이언트 시간대에 따라 날짜 조정
  let currentDate = utcDate;
  if (clientTimezone) {
    // UTC+9인 경우, UTC 15:00 이후에는 다음날 실천 과제 표시
    const utcHour = now.getUTCHours();
    if (clientTimezone.includes('+9') && utcHour >= 15) {
      currentDate = new Date(currentDate);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  // 사용자 ID를 헤더에서 받기
  const userId = request.headers.get('X-User-ID') || 'user123';

  // 현재 날짜에 해당하는 챌린지 찾기
  const challenge = await env.DB.prepare(`
    SELECT * FROM challenges 
    WHERE start_date <= date(?) AND end_date >= date(?)
  `).bind(currentDate.toISOString().split('T')[0], currentDate.toISOString().split('T')[0]).first();

  if (challenge) {
    // 활성 챌린지가 있는 경우
    const startDate = new Date(challenge.start_date);
    const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    const day = dayDiff + 1;
    
    // DB에서 해당 챌린지의 해당 일수의 실천 과제 조회
    const practice = await env.DB.prepare(
      'SELECT * FROM practices WHERE challenge_id = ? AND day = ?'
    ).bind(challenge.id, day).first();

    if (practice) {
      // 이벤트 로깅: 실천 과제 조회
      await logUserEvent(env, request, 'practice_view', { 
        challenge_id: challenge.id, 
        practice_id: practice.id, 
        day: day 
      });
      
      // 오늘 실천 기록 여부 확인
      const feedback = await env.DB.prepare(`
        SELECT id FROM practice_feedback 
        WHERE user_id = ? AND challenge_id = ? AND practice_day = ?
      `).bind(userId, challenge.id, day).first();

      return {
        ...practice,
        day: day, // 현재 일차 추가
        isRecorded: !!feedback
      };
    }
  }

  // Fallback: 활성 챌린지가 없거나 해당 일수의 실천 과제가 없는 경우
  // 모든 실천 과제 중에서 무작위로 선택
  const allPractices = await env.DB.prepare(
    'SELECT * FROM practices ORDER BY RANDOM() LIMIT 1'
  ).first();

  if (!allPractices) {
    throw new Error('No practices found in database');
  }

  return {
    ...allPractices,
    day: 1, // Fallback의 경우 1일차로 설정
    isRecorded: false
  };
}

// 챌린지 목록 가져오기
async function getChallenges(env, request) {
  // 클라이언트의 시간대 정보 받기
  const clientTimezone = request.headers.get('X-Client-Timezone');
  const clientTime = request.headers.get('X-Client-Time');
  
  // 클라이언트 시간이 있으면 사용, 없으면 UTC 사용
  const now = clientTime ? new Date(clientTime) : new Date();
  
  // UTC 기준으로 날짜 계산
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  
  // 클라이언트 시간대에 따라 날짜 조정
  let currentDate = utcDate;
  if (clientTimezone) {
    // UTC+9인 경우, UTC 15:00 이후에는 다음날 실천 과제 표시
    const utcHour = now.getUTCHours();
    if (clientTimezone.includes('+9') && utcHour >= 15) {
      currentDate = new Date(currentDate);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  const currentDateStr = currentDate.toISOString().split('T')[0];

  // 모든 챌린지 조회
  const allChallenges = await env.DB.prepare(`
    SELECT * FROM challenges 
    ORDER BY start_date ASC
  `).all();

  const result = {
    current: null,
    completed: [],
    upcoming: []
  };

  for (const challenge of allChallenges.results) {
    const startDate = new Date(challenge.start_date);
    const endDate = new Date(challenge.end_date);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // 현재 진행 중인 챌린지
    if (currentDate >= startDate && currentDate <= endDate) {
      const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
      const currentDay = dayDiff + 1;
      const progressPercentage = Math.round((currentDay / totalDays) * 100);

      // 오늘의 실천 과제 조회
      const todayPractice = await env.DB.prepare(
        'SELECT * FROM practices WHERE challenge_id = ? AND day = ?'
      ).bind(challenge.id, currentDay).first();

      result.current = {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        start_date: challenge.start_date,
        end_date: challenge.end_date,
        current_day: currentDay,
        total_days: totalDays,
        progress_percentage: progressPercentage,
        today_practice: todayPractice ? {
          title: todayPractice.title,
          description: todayPractice.description
        } : null
      };
    }
    // 완료된 챌린지
    else if (currentDate > endDate) {
      // 마지막 실천 과제 조회
      const lastPractice = await env.DB.prepare(
        'SELECT * FROM practices WHERE challenge_id = ? AND day = ?'
      ).bind(challenge.id, totalDays).first();

      result.completed.push({
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        start_date: challenge.start_date,
        end_date: challenge.end_date,
        total_days: totalDays,
        completed_days: totalDays,
        progress_percentage: 100,
        last_practice: lastPractice ? {
          title: lastPractice.title,
          description: lastPractice.description
        } : null
      });
    }
    // 예정된 챌린지
    else if (currentDate < startDate) {
      const daysUntilStart = Math.ceil((startDate - currentDate) / (1000 * 60 * 60 * 24));
      
      result.upcoming.push({
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        start_date: challenge.start_date,
        end_date: challenge.end_date,
        total_days: totalDays,
        days_until_start: daysUntilStart
      });
    }
  }

  return result;
}

// 챌린지 상세 정보 가져오기
async function getChallengeDetail(env, challengeId, request) {
  // 챌린지 기본 정보 조회
  const challenge = await env.DB.prepare(`
    SELECT * FROM challenges WHERE id = ?
  `).bind(challengeId).first();

  if (!challenge) {
    throw new Error('Challenge not found');
  }

  // 해당 챌린지의 모든 실천 과제 조회
  const practices = await env.DB.prepare(`
    SELECT * FROM practices 
    WHERE challenge_id = ? 
    ORDER BY day ASC
  `).bind(challengeId).all();

  // 클라이언트의 시간대 정보를 고려한 현재 날짜 계산
  const clientTimezone = request.headers.get('X-Client-Timezone');
  const clientTime = request.headers.get('X-Client-Time');
  
  // 클라이언트 시간이 있으면 사용, 없으면 UTC 사용
  const now = clientTime ? new Date(clientTime) : new Date();
  
  // UTC 기준으로 날짜 계산
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  
  // 클라이언트 시간대에 따라 날짜 조정
  let currentDate = utcDate;
  if (clientTimezone) {
    // UTC+9인 경우, UTC 15:00 이후에는 다음날 실천 과제 표시
    const utcHour = now.getUTCHours();
    if (clientTimezone.includes('+9') && utcHour >= 15) {
      currentDate = new Date(currentDate);
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  const startDate = new Date(challenge.start_date);
  const endDate = new Date(challenge.end_date);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  // 현재 진행 상황 계산
  let currentDay = 0;
  let progressPercentage = 0;
  let status = 'upcoming';

  console.log('Challenge detail date calculation:', {
    challengeId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    currentDate: currentDate.toISOString(),
    clientTimezone,
    clientTime
  });

  if (currentDate >= startDate && currentDate <= endDate) {
    // 현재 진행 중
    const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    currentDay = dayDiff + 1;
    progressPercentage = Math.round((currentDay / totalDays) * 100);
    status = 'current';
    console.log('Challenge is current:', { dayDiff, currentDay, totalDays });
  } else if (currentDate > endDate) {
    // 완료됨
    currentDay = totalDays;
    progressPercentage = 100;
    status = 'completed';
    console.log('Challenge is completed');
  } else {
    // 예정됨
    status = 'upcoming';
    console.log('Challenge is upcoming');
  }

  // 사용자 ID 가져오기
  const userId = request.headers.get('X-User-ID') || 'user123';
  
  // 사용자의 실천 기록 조회
  const userFeedback = await env.DB.prepare(`
    SELECT practice_day FROM practice_feedback 
    WHERE user_id = ? AND challenge_id = ?
  `).bind(userId, challengeId).all();
  
  const completedDays = new Set(userFeedback.results.map(feedback => feedback.practice_day));
  
  // 실천 과제에 완료 상태 추가 (사용자 기록 기준)
  const practicesWithStatus = practices.results.map(practice => ({
    ...practice,
    completed: completedDays.has(practice.day),
    is_today: practice.day === currentDay && status === 'current'
  }));
  
  // 실제 완료된 일수로 진행률 재계산
  const actualCompletedDays = completedDays.size;
  const actualProgressPercentage = Math.round((actualCompletedDays / totalDays) * 100);

  return {
    id: challenge.id,
    name: challenge.name,
    description: challenge.description,
    start_date: challenge.start_date,
    end_date: challenge.end_date,
    total_days: totalDays,
    current_day: currentDay,
    progress_percentage: actualProgressPercentage,
    completed_days: actualCompletedDays,
    status: status,
    practices: practicesWithStatus
  };
}

// 피드백 제출 처리
async function submitFeedback(env, request) {
  const body = await request.json();
  const { challengeId, practiceDay, moodChange, wasHelpful, practiceDescription } = body;
  
  // 사용자 ID를 헤더에서 받기
  const userId = request.headers.get('X-User-ID') || 'user123';
  
  console.log('Submitting feedback:', { userId, challengeId, practiceDay, moodChange, wasHelpful, practiceDescription });
  
  try {
    // 피드백 저장 (피드백 = 실천 완료)
    const result = await env.DB.prepare(`
      INSERT OR REPLACE INTO practice_feedback 
      (user_id, challenge_id, practice_day, mood_change, was_helpful, practice_description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(userId, challengeId, practiceDay, moodChange, wasHelpful, practiceDescription).run();
    
    // 이벤트 로깅: 실천 완료 및 피드백 제출
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
    
    console.log('Feedback submitted successfully:', result);
    
    return {
      success: true,
      message: '피드백이 성공적으로 제출되었습니다.'
    };
  } catch (error) {
    console.error('Feedback submission error:', error);
    throw new Error(`피드백 제출 실패: ${error.message}`);
  }
}

// 특정 실천 기록 조회
async function getPracticeRecord(env, challengeId, practiceDay, request) {
  const userId = request.headers.get('X-User-ID') || 'user123';
  
  // practiceDay가 null이거나 undefined인 경우 처리
  if (!practiceDay) {
    console.log('Practice day is null or undefined');
    return null;
  }
  
  console.log('Looking for record:', { userId, challengeId, practiceDay });
  
  const record = await env.DB.prepare(`
    SELECT * FROM practice_feedback 
    WHERE user_id = ? AND challenge_id = ? AND practice_day = ?
  `).bind(userId, challengeId, practiceDay).first();
  
  console.log('Found record:', record);
  
  return record;
}

// 실천 기록 히스토리 조회
async function getPracticeHistory(env, challengeId, request) {
  const userId = request.headers.get('X-User-ID') || 'user123';
  
  const records = await env.DB.prepare(`
    SELECT * FROM practice_feedback 
    WHERE user_id = ? AND challenge_id = ?
    ORDER BY practice_day ASC
  `).bind(userId, challengeId).all();
  
  return records.results;
}

// 실천 기록 수정
async function updatePracticeRecord(env, request) {
  const body = await request.json();
  const { challengeId, practiceDay, moodChange, wasHelpful, practiceDescription } = body;
  
  const userId = request.headers.get('X-User-ID') || 'user123';
  
  try {
    const result = await env.DB.prepare(`
      UPDATE practice_feedback 
      SET mood_change = ?, was_helpful = ?, practice_description = ?
      WHERE user_id = ? AND challenge_id = ? AND practice_day = ?
    `).bind(moodChange, wasHelpful, practiceDescription, userId, challengeId, practiceDay).run();
    
    if (result.changes === 0) {
      throw new Error('수정할 기록을 찾을 수 없습니다.');
    }
    
    // 수정된 기록 반환
    const updatedRecord = await getPracticeRecord(env, challengeId, practiceDay, request);
    return updatedRecord;
  } catch (error) {
    throw new Error(`기록 수정 실패: ${error.message}`);
  }
}

// timefold 봉투 생성 프록시
async function createTimefoldEnvelope(env, request) {
  const body = await request.json();
  const { challengeId, message, unlockDate } = body;
  
  const userId = request.headers.get('X-User-ID') || 'user123';
  
  try {
    // timefold API 호출
    const timefoldResponse = await fetch('https://timefold.amansman77.workers.dev/api/envelopes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Token': userId
      },
      body: JSON.stringify({
        unlockAt: new Date(unlockDate).getTime(),
        passwordProtected: true,
        encryptedMessage: message,
        userToken: userId
      })
    });

    if (!timefoldResponse.ok) {
      throw new Error(`Timefold API error: ${timefoldResponse.status}`);
    }

    const timefoldData = await timefoldResponse.json();
    
    // dandani DB에 봉투 정보 저장 (선택사항)
    try {
      await env.DB.prepare(`
        INSERT INTO timefold_envelopes (id, challenge_id, user_id, created_at, unlock_at, timefold_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        challengeId,
        userId,
        Date.now(),
        new Date(unlockDate).getTime(),
        timefoldData.id
      ).run();
    } catch (dbError) {
      console.warn('Failed to save envelope to dandani DB:', dbError);
      // DB 저장 실패는 치명적이지 않으므로 계속 진행
    }

    return {
      success: true,
      envelopeId: timefoldData.id,
      shareUrl: `https://timefold.yetimates.com/?v=3.0&id=${timefoldData.id}`,
      message: '봉투가 성공적으로 생성되었습니다.'
    };
  } catch (error) {
    console.error('Timefold envelope creation error:', error);
    throw new Error(`봉투 생성 실패: ${error.message}`);
  }
}

// timefold 봉투 조회 프록시
async function getTimefoldEnvelope(env, request) {
  const url = new URL(request.url);
  const envelopeId = url.pathname.split('/').pop();
  
  try {
    const timefoldResponse = await fetch(`https://timefold.amansman77.workers.dev/api/envelopes/${envelopeId}`, {
      headers: {
        'X-User-Token': 'anonymous'
      }
    });

    if (!timefoldResponse.ok) {
      throw new Error(`Timefold API error: ${timefoldResponse.status}`);
    }

    const timefoldData = await timefoldResponse.json();
    return timefoldData;
  } catch (error) {
    console.error('Timefold envelope fetch error:', error);
    throw new Error(`봉투 조회 실패: ${error.message}`);
  }
}

// 리텐션 지표 계산
async function calculateRetentionMetrics(env) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Day1 리텐션 계산
    const day1Retention = await env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT ue1.user_id) as total_users,
        COUNT(DISTINCT ue2.user_id) as returning_users
      FROM user_events ue1
      LEFT JOIN user_events ue2 ON ue1.user_id = ue2.user_id 
        AND ue2.event_type = 'page_visit' 
        AND date(ue2.created_at) = date(ue1.created_at, '+1 day')
      WHERE ue1.event_type = 'page_visit' 
        AND date(ue1.created_at) >= ?
        AND date(ue1.created_at) < ?
    `).bind(thirtyDaysAgo, today).first();
    
    // Week1 챌린지 완료율 계산
    const week1Completion = await env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT CASE WHEN practice_completed = 1 THEN user_id END) as completed_users
      FROM user_daily_activity
      WHERE activity_date >= ? AND activity_date < ?
    `).bind(thirtyDaysAgo, today).first();
    
    // Day7 리텐션 계산
    const day7Retention = await env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT ue1.user_id) as total_users,
        COUNT(DISTINCT ue2.user_id) as returning_users
      FROM user_events ue1
      LEFT JOIN user_events ue2 ON ue1.user_id = ue2.user_id 
        AND ue2.event_type = 'page_visit' 
        AND date(ue2.created_at) = date(ue1.created_at, '+7 days')
      WHERE ue1.event_type = 'page_visit' 
        AND date(ue1.created_at) >= ?
        AND date(ue1.created_at) < ?
    `).bind(thirtyDaysAgo, today).first();
    
    // Day30 완주율 계산
    const day30Completion = await env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(DISTINCT CASE WHEN active_days >= 30 THEN user_id END) as completed_users
      FROM user_activity_summary
    `).first();
    
    // 긍정 후기 비율 계산
    const positiveFeedback = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN mood_change = 'improved' OR was_helpful = 'yes' THEN 1 END) as positive_feedback
      FROM practice_feedback
      WHERE created_at >= ?
    `).bind(thirtyDaysAgo).first();
    
    // 지표 계산
    const day1Rate = day1Retention.total_users > 0 ? 
      (day1Retention.returning_users / day1Retention.total_users * 100).toFixed(2) : 0;
    
    const week1Rate = week1Completion.total_users > 0 ? 
      (week1Completion.completed_users / week1Completion.total_users * 100).toFixed(2) : 0;
    
    const day7Rate = day7Retention.total_users > 0 ? 
      (day7Retention.returning_users / day7Retention.total_users * 100).toFixed(2) : 0;
    
    const day30Rate = day30Completion.total_users > 0 ? 
      (day30Completion.completed_users / day30Completion.total_users * 100).toFixed(2) : 0;
    
    const positiveRate = positiveFeedback.total_feedback > 0 ? 
      (positiveFeedback.positive_feedback / positiveFeedback.total_feedback * 100).toFixed(2) : 0;
    
    return {
      metrics: {
        day1_retention: {
          value: parseFloat(day1Rate),
          target: 40,
          status: parseFloat(day1Rate) >= 40 ? 'good' : 'needs_improvement',
          total_users: day1Retention.total_users,
          returning_users: day1Retention.returning_users
        },
        week1_completion: {
          value: parseFloat(week1Rate),
          target: 50,
          status: parseFloat(week1Rate) >= 50 ? 'good' : 'needs_improvement',
          total_users: week1Completion.total_users,
          completed_users: week1Completion.completed_users
        },
        day7_retention: {
          value: parseFloat(day7Rate),
          target: 25,
          status: parseFloat(day7Rate) >= 25 ? 'good' : 'needs_improvement',
          total_users: day7Retention.total_users,
          returning_users: day7Retention.returning_users
        },
        day30_completion: {
          value: parseFloat(day30Rate),
          target: 10,
          status: parseFloat(day30Rate) >= 10 ? 'good' : 'needs_improvement',
          total_users: day30Completion.total_users,
          completed_users: day30Completion.completed_users
        },
        positive_feedback: {
          value: parseFloat(positiveRate),
          target: 70,
          status: parseFloat(positiveRate) >= 70 ? 'good' : 'needs_improvement',
          total_feedback: positiveFeedback.total_feedback,
          positive_feedback: positiveFeedback.positive_feedback
        }
      },
      calculated_at: new Date().toISOString(),
      period: {
        start: thirtyDaysAgo,
        end: today
      }
    };
    
  } catch (error) {
    console.error('Retention metrics calculation error:', error);
    throw new Error(`리텐션 지표 계산 실패: ${error.message}`);
  }
}

// 사용자 활동 통계 조회
async function getUserActivityStats(env, days = 30) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 일별 활성 사용자 수
    const dailyActiveUsers = await env.DB.prepare(`
      SELECT 
        activity_date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(CASE WHEN practice_completed = 1 THEN user_id END) as practice_users,
        COUNT(CASE WHEN feedback_submitted = 1 THEN user_id END) as feedback_users,
        COUNT(CASE WHEN ai_chat_used = 1 THEN user_id END) as ai_chat_users
      FROM user_daily_activity
      WHERE activity_date >= ?
      GROUP BY activity_date
      ORDER BY activity_date DESC
    `).bind(startDate).all();
    
    // 이벤트 타입별 통계
    const eventStats = await env.DB.prepare(`
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_events
      WHERE date(created_at) >= ?
      GROUP BY event_type
      ORDER BY count DESC
    `).bind(startDate).all();
    
    // 사용자 세션 통계
    const sessionStats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(total_visits) as avg_visits_per_session,
        AVG(total_events) as avg_events_per_session
      FROM user_sessions
      WHERE first_visit_at >= ?
    `).bind(startDate).first();
    
    return {
      period: {
        days: days,
        start_date: startDate,
        end_date: new Date().toISOString().split('T')[0]
      },
      daily_active_users: dailyActiveUsers.results,
      event_statistics: eventStats.results,
      session_statistics: sessionStats,
      generated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('User activity stats error:', error);
    throw new Error(`사용자 활동 통계 조회 실패: ${error.message}`);
  }
}

// 일일 보고서 데이터 수집
async function getDailyReportData(env) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 어제의 리텐션 지표
    const retentionMetrics = await calculateRetentionMetrics(env);
    
    // 어제의 활동 통계
    const activityStats = await getUserActivityStats(env);
    
    // 어제의 주요 지표
    const yesterdayStats = activityStats.daily_active_users.find(day => day.activity_date === yesterday);
    
    // 30일간 일별 활성 사용자 트렌드 계산
    const dailyActiveUsers = activityStats.daily_active_users;
    const last7Days = dailyActiveUsers.slice(0, 7);
    const last30Days = dailyActiveUsers.slice(0, 30);
    
    const last7DaysAvg = last7Days.length > 0 ? 
      (last7Days.reduce((sum, day) => sum + day.active_users, 0) / last7Days.length).toFixed(1) : 0;
    const last30DaysAvg = last30Days.length > 0 ? 
      (last30Days.reduce((sum, day) => sum + day.active_users, 0) / last30Days.length).toFixed(1) : 0;
    
    // 최고/최저 활성일 찾기
    const peakDay = dailyActiveUsers.reduce((max, day) => 
      day.active_users > max.active_users ? day : max, dailyActiveUsers[0] || { active_users: 0, activity_date: 'N/A' });
    const lowestDay = dailyActiveUsers.reduce((min, day) => 
      day.active_users < min.active_users ? day : min, dailyActiveUsers[0] || { active_users: 0, activity_date: 'N/A' });
    
    // 이벤트 통계에서 주요 이벤트 추출
    const practiceCompletes = activityStats.event_statistics.find(event => event.event_type === 'practice_complete');
    const aiChatStarts = activityStats.event_statistics.find(event => event.event_type === 'ai_chat_start');
    const feedbackSubmits = activityStats.event_statistics.find(event => event.event_type === 'feedback_submit');
    const pageVisits = activityStats.event_statistics.find(event => event.event_type === 'page_visit');
    const onboardingCompletes = activityStats.event_statistics.find(event => event.event_type === 'onboarding_complete');
    const challengeStarts = activityStats.event_statistics.find(event => event.event_type === 'challenge_start');
    const challengeCompletes = activityStats.event_statistics.find(event => event.event_type === 'challenge_complete');
    
    return {
      date: yesterday,
      retention_metrics: retentionMetrics,
      daily_stats: yesterdayStats || {
        activity_date: yesterday,
        active_users: 0,
        practice_users: 0,
        feedback_users: 0,
        ai_chat_users: 0
      },
      event_stats: {
        practice_completes: practiceCompletes || { count: 0, unique_users: 0 },
        ai_chat_starts: aiChatStarts || { count: 0, unique_users: 0 },
        feedback_submits: feedbackSubmits || { count: 0, unique_users: 0 },
        page_visits: pageVisits || { count: 0, unique_users: 0 },
        onboarding_completes: onboardingCompletes || { count: 0, unique_users: 0 },
        challenge_starts: challengeStarts || { count: 0, unique_users: 0 },
        challenge_completes: challengeCompletes || { count: 0, unique_users: 0 }
      },
      session_stats: activityStats.session_statistics,
      daily_trend: {
        last_7_days_avg: parseFloat(last7DaysAvg),
        last_30_days_avg: parseFloat(last30DaysAvg),
        peak_day: peakDay.activity_date,
        peak_users: peakDay.active_users,
        lowest_day: lowestDay.activity_date,
        lowest_users: lowestDay.active_users
      },
      generated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Daily report data error:', error);
    throw new Error(`일일 보고서 데이터 수집 실패: ${error.message}`);
  }
}

// 디스코드 메시지 포맷팅
function formatDiscordMessage(reportData) {
  const { date, retention_metrics, daily_stats, event_stats, session_stats } = reportData;
  
  // 상태 이모지 결정
  const getStatusEmoji = (status) => {
    switch (status) {
      case 'good': return '✅';
      case 'needs_improvement': return '⚠️';
      default: return '❌';
    }
  };
  
  // 리텐션 지표 요약
  const retentionSummary = Object.entries(retention_metrics.metrics)
    .map(([key, metric]) => {
      const emoji = getStatusEmoji(metric.status);
      const target = metric.target;
      const value = metric.value.toFixed(1);
      return `${emoji} ${key.replace(/_/g, ' ').toUpperCase()}: ${value}% (목표: ${target}%)`;
    })
    .join('\n');
  
  // 디스코드 임베드 메시지 생성
  const embed = {
    title: `📊 단단이 일일 보고서 - ${date}`,
    color: 0x00ff00, // 초록색
    fields: [
      {
        name: "📈 리텐션 지표 (30일 기준)",
        value: retentionSummary,
        inline: false
      },
      {
        name: `📊 일일 활동 통계 (${date})`,
        value: `• 활성 사용자: ${daily_stats.active_users}명\n• 실천 완료: ${daily_stats.practice_users}명\n• 피드백 제출: ${daily_stats.feedback_users}명\n• AI 상담 이용: ${daily_stats.ai_chat_users}명`,
        inline: true
      },
      {
        name: `📈 이벤트 통계 (${date})`,
        value: `• 실천 완료: ${event_stats.practice_completes.count}회 (${event_stats.practice_completes.unique_users}명)\n• AI 상담 시작: ${event_stats.ai_chat_starts.count}회 (${event_stats.ai_chat_starts.unique_users}명)\n• 피드백 제출: ${event_stats.feedback_submits.count}회 (${event_stats.feedback_submits.unique_users}명)\n• 페이지 방문: ${event_stats.page_visits?.count || 0}회 (${event_stats.page_visits?.unique_users || 0}명)\n• 온보딩 완료: ${event_stats.onboarding_completes?.count || 0}회 (${event_stats.onboarding_completes?.unique_users || 0}명)`,
        inline: true
      },
      {
        name: "🔗 세션 통계 (30일 기준)",
        value: `• 총 세션: ${session_stats.total_sessions}개\n• 고유 사용자: ${session_stats.unique_users}명\n• 평균 방문/세션: ${session_stats.avg_visits_per_session?.toFixed(1) || 0}회\n• 평균 이벤트/세션: ${session_stats.avg_events_per_session?.toFixed(1) || 0}회\n• 세션당 평균 체류시간: ${session_stats.avg_session_duration?.toFixed(1) || 0}분`,
        inline: true
      },
      {
        name: "📈 30일간 일별 활성 사용자 트렌드",
        value: `• 최근 7일 평균: ${reportData.daily_trend?.last_7_days_avg || 0}명\n• 최근 30일 평균: ${reportData.daily_trend?.last_30_days_avg || 0}명\n• 최고 활성일: ${reportData.daily_trend?.peak_day || 'N/A'} (${reportData.daily_trend?.peak_users || 0}명)\n• 최저 활성일: ${reportData.daily_trend?.lowest_day || 'N/A'} (${reportData.daily_trend?.lowest_users || 0}명)`,
        inline: false
      }
    ],
    footer: {
      text: `📅 생성 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
    },
    timestamp: new Date().toISOString()
  };
  
  return {
    content: `📊 **단단이 일일 보고서** - ${date}`,
    embeds: [embed]
  };
}

// 디스코드 메시지 전송
async function sendDiscordMessage(env, message) {
  try {
    const discordWebhookUrl = env.DISCORD_WEBHOOK_URL;
    
    if (!discordWebhookUrl) {
      throw new Error('DISCORD_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
    }
    
    const response = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
    
    return {
      success: true,
      message: '디스코드 메시지가 성공적으로 전송되었습니다.'
    };
    
  } catch (error) {
    console.error('Discord message send error:', error);
    throw new Error(`디스코드 메시지 전송 실패: ${error.message}`);
  }
}

// API 요청 처리
async function handleRequest(request, env) {
  // OPTIONS 요청 처리 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  const url = new URL(request.url);
  
  // GET 요청 처리
  if (request.method === 'GET') {
    try {
      // 오늘의 실천 과제 엔드포인트
      if (url.pathname === '/api/practice/today') {
        const practice = await getTodayPractice(env, request);
        return new Response(JSON.stringify(practice), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 챌린지 목록 엔드포인트
      if (url.pathname === '/api/challenges') {
        const challenges = await getChallenges(env, request);
        return new Response(JSON.stringify(challenges), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 챌린지 상세 조회 엔드포인트
      if (url.pathname.startsWith('/api/challenges/')) {
        const challengeId = url.pathname.split('/')[3];
        const challengeDetail = await getChallengeDetail(env, challengeId, request);
        return new Response(JSON.stringify(challengeDetail), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 실천 기록 조회 엔드포인트
      if (url.pathname === '/api/feedback/record') {
        const challengeId = url.searchParams.get('challengeId');
        const practiceDay = url.searchParams.get('practiceDay');
        
        if (!challengeId || !practiceDay) {
          return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        const record = await getPracticeRecord(env, challengeId, practiceDay, request);
        
        // 기록이 없는 경우 null 반환 (에러가 아님)
        return new Response(JSON.stringify(record), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 실천 기록 히스토리 조회 엔드포인트
      if (url.pathname === '/api/feedback/history') {
        const challengeId = url.searchParams.get('challengeId');
        
        if (!challengeId) {
          return new Response(JSON.stringify({ error: 'Missing challengeId parameter' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        const history = await getPracticeHistory(env, challengeId, request);
        return new Response(JSON.stringify(history), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // timefold 봉투 조회 엔드포인트
      if (url.pathname.startsWith('/api/timefold/envelope/')) {
        const envelopeData = await getTimefoldEnvelope(env, request);
        return new Response(JSON.stringify(envelopeData), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 리텐션 지표 조회 엔드포인트
      if (url.pathname === '/api/analytics/retention') {
        const retentionMetrics = await calculateRetentionMetrics(env, request);
        return new Response(JSON.stringify(retentionMetrics), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 사용자 활동 통계 조회 엔드포인트
      if (url.pathname === '/api/analytics/activity') {
        const days = parseInt(url.searchParams.get('days')) || 30;
        const activityStats = await getUserActivityStats(env, days);
        return new Response(JSON.stringify(activityStats), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 일일 보고서 데이터 조회 엔드포인트
      if (url.pathname === '/api/analytics/daily-report') {
        const reportData = await getDailyReportData(env, request);
        return new Response(JSON.stringify(reportData), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 클라이언트 이벤트 로깅 엔드포인트
      if (url.pathname === '/api/analytics/event') {
        const body = await request.json();
        const { event_type, event_data, timestamp } = body;
        
        // 이벤트 로깅
        await logUserEvent(env, request, event_type, event_data);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 디스코드 일일 보고서 전송 엔드포인트
      if (url.pathname === '/api/discord/daily-report') {
        const reportData = await getDailyReportData(env, request);
        const discordMessage = formatDiscordMessage(reportData);
        const result = await sendDiscordMessage(env, discordMessage);
        
        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 404 처리
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }

  // POST 요청 처리
  if (request.method === 'POST') {
    try {
      // 피드백 제출 엔드포인트
      if (url.pathname === '/api/feedback/submit') {
        const result = await submitFeedback(env, request);
        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // timefold 봉투 생성 엔드포인트
      if (url.pathname === '/api/timefold/envelope') {
        const result = await createTimefoldEnvelope(env, request);
        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 클라이언트 이벤트 로깅 엔드포인트
      if (url.pathname === '/api/analytics/event') {
        const body = await request.json();
        const { event_type, event_data, timestamp } = body;
        
        // 이벤트 로깅
        await logUserEvent(env, request, event_type, event_data);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 404 처리
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }

  // PUT 요청 처리
  if (request.method === 'PUT') {
    try {
      // 실천 기록 수정 엔드포인트
      if (url.pathname === '/api/feedback/update') {
        const result = await updatePracticeRecord(env, request);
        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 404 처리
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }

  // 405 Method Not Allowed
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
  
  // Cron Job 처리 (매일 오전 9시에 실행)
  async scheduled(event, env, ctx) {
    try {
      console.log('일일 보고서 Cron Job 시작:', new Date().toISOString());
      
      // 일일 보고서 데이터 수집
      const reportData = await getDailyReportData(env);
      
      // 디스코드 메시지 포맷팅
      const discordMessage = formatDiscordMessage(reportData);
      
      // 디스코드 메시지 전송
      const result = await sendDiscordMessage(env, discordMessage);
      
      console.log('일일 보고서 전송 완료:', result);
      
    } catch (error) {
      console.error('일일 보고서 Cron Job 실패:', error);
      
      // 에러 발생 시 디스코드에 에러 메시지 전송
      try {
        const errorMessage = {
          content: `❌ **단단이 일일 보고서 전송 실패**`,
          embeds: [
            {
              title: "❌ 단단이 일일 보고서 전송 실패",
              color: 0xff0000, // 빨간색
              fields: [
                {
                  name: "에러 메시지",
                  value: `\`\`\`${error.message}\`\`\``,
                  inline: false
                },
                {
                  name: "발생 시간",
                  value: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
                  inline: false
                }
              ],
              timestamp: new Date().toISOString()
            }
          ]
        };
        
        await sendDiscordMessage(env, errorMessage);
      } catch (discordError) {
        console.error('에러 메시지 전송도 실패:', discordError);
      }
    }
  }
}; 