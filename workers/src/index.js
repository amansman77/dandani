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
  'Access-Control-Allow-Headers': 'Content-Type, X-Client-Timezone, X-Client-Time, X-User-ID',
  'Access-Control-Max-Age': '86400',
};

// 오늘의 실천 과제와 기록 상태 가져오기
async function getTodayPractice(env, request) {
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
  }
}; 