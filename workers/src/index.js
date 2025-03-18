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
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 오늘의 실천 과제 가져오기
async function getTodayPractice() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const practiceIndex = dayOfYear % PRACTICES.length;
  
  return PRACTICES[practiceIndex];
}

// API 요청 처리
async function handleRequest(request) {
  // OPTIONS 요청 처리 (CORS preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // GET 요청 처리
  if (request.method === 'GET') {
    const url = new URL(request.url);
    
    // 오늘의 실천 과제 엔드포인트
    if (url.pathname === '/api/practice/today') {
      const practice = await getTodayPractice();
      return new Response(JSON.stringify(practice), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 404 처리
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        ...corsHeaders
      }
    });
  }

  // 405 Method Not Allowed
  return new Response('Method Not Allowed', {
    status: 405,
    headers: {
      'Content-Type': 'text/plain',
      ...corsHeaders
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  }
}; 