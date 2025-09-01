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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Client-Timezone, X-Client-Time',
  'Access-Control-Max-Age': '86400',
};

// 오늘의 실천 과제 가져오기
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
      return practice;
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

  return allPractices;
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

// API 요청 처리
async function handleRequest(request, env) {
  // OPTIONS 요청 처리 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // GET 요청 처리
  if (request.method === 'GET') {
    const url = new URL(request.url);
    
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