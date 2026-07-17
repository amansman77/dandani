import { getUTCDate } from './core.js';
import { calculateRetentionMetrics, getDailyReportData } from './analytics-service.js';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-4-maverick-17b-128e-instruct';

const CATEGORIES = ['data', 'ux', 'growth', 'interview'];

const CATEGORY_LABELS = {
  data: '📊 데이터 인사이트',
  ux: '🧭 UX 관찰',
  growth: '📣 유입 채널 아이디어',
  interview: '🗣️ 사용자 인터뷰 질문',
};

const SYSTEM_PROMPT = `너는 '단단이'라는 습관/챌린지 동반자 앱의 프로덕트 기획자야.
앱 대표에게 매일 아침 인사이트 하나를 반말로 짧게 전달해.
보고서처럼 나열하지 말고, 핵심 한 가지만 짚어. 3~4문장 이내로 답해.
불확실하거나 데이터가 부족하면 솔직하게 그렇다고 말해. 없는 근거를 지어내지 마.`;

function getRotationCategory(date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  return CATEGORIES[dayIndex % CATEGORIES.length];
}

const LLM_MAX_ATTEMPTS = 2;
const LLM_RETRY_DELAY_MS = 1500;
const LLM_ATTEMPT_TIMEOUT_MS = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callLLMOnce(env, userMessage, maxTokens) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_ATTEMPT_TIMEOUT_MS);

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callLLM(env, userMessage, maxTokens = 400) {
  let lastError;

  for (let attempt = 1; attempt <= LLM_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await callLLMOnce(env, userMessage, maxTokens);
    } catch (error) {
      lastError = error.name === 'AbortError'
        ? new Error(`NVIDIA API timeout after ${LLM_ATTEMPT_TIMEOUT_MS}ms`)
        : error;
      console.error(`NVIDIA API 호출 실패 (시도 ${attempt}/${LLM_MAX_ATTEMPTS}):`, lastError.message);
      if (attempt < LLM_MAX_ATTEMPTS) {
        await sleep(LLM_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError;
}

async function buildDataPrompt(env) {
  const yesterday = getUTCDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const reportData = await getDailyReportData(env, yesterday);
  const m = reportData.retention_metrics.metrics;

  return `아래는 단단이의 실제 최신 데이터야 (기준일: ${reportData.date}).

리텐션 지표 (목표 대비 현재값):
- DAY1 RETENTION: ${m.day1_retention.value}% (목표 ${m.day1_retention.target}%)
- WEEK1 COMPLETION: ${m.week1_completion.value}% (목표 ${m.week1_completion.target}%)
- DAY7 RETENTION: ${m.day7_retention.value}% (목표 ${m.day7_retention.target}%)
- DAY30 COMPLETION: ${m.day30_completion.value}% (목표 ${m.day30_completion.target}%)
- POSITIVE FEEDBACK: ${m.positive_feedback.value}% (목표 ${m.positive_feedback.target}%)

활동 추세:
- 최근 7일 평균 활성 사용자: ${reportData.daily_trend.last_7_days_avg}명
- 최근 30일 평균 활성 사용자: ${reportData.daily_trend.last_30_days_avg}명
- 최고 활성일: ${reportData.daily_trend.peak_day} (${reportData.daily_trend.peak_users}명)
- 최저 활성일: ${reportData.daily_trend.lowest_day} (${reportData.daily_trend.lowest_users}명)

어제(${reportData.date}) 활동: 활성 ${reportData.daily_stats.active_users}명, 챌린지 선택 ${reportData.event_stats.challenge_selected.count}회, 실천 완료 ${reportData.event_stats.practice_completes.count}회, 피드백 ${reportData.event_stats.feedback_submits.count}회

이 데이터에서 정말 주목할 만한 변화나 이상치가 있으면 한 가지만 짚어줘.
표본이 워낙 작아서(하루 1~4명 수준) 대부분은 노이즈일 가능성이 높아 — 특별한 변화가 없으면 지어내지 말고 "오늘은 특별한 변화 없다"고 솔직하게 말해.`;
}

function buildGrowthPrompt() {
  return `단단이는 감정적으로 힘들 때 중심을 잃지 않게 돕는 챌린지 기반 습관 동반자 앱이야.
현재 하루 활성 사용자가 1~4명 수준이고, 마케팅 예산은 거의 없어. 한국어 사용자 대상이야.

돈을 거의 안 들이고 오늘 바로 시도해볼 수 있는 구체적인 유입 채널 아이디어 하나만 제안해줘. "SNS 마케팅 하세요" 같은 뭉뚱그린 얘기 말고, 어디에 어떤 형태로 뭘 올릴지까지 구체적으로.`;
}

function buildInterviewPrompt() {
  return `단단이는 하루 활성 사용자가 1~4명뿐이고, 재방문이 거의 없어. 왜 다시 안 돌아오는지 이유를 모르는 상태야.

지금 있는 몇 안 되는 실사용자에게 오늘 바로 물어볼 수 있는, 구체적이고 답하기 쉬운 인터뷰 질문 하나만 만들어줘. "어떠셨나요?" 같은 두루뭉술한 질문 말고, 재방문 안 하는 이유를 좁혀갈 수 있는 질문으로.`;
}

async function buildPrompt(env, category) {
  switch (category) {
    case 'data':
      return buildDataPrompt(env);
    case 'growth':
      return buildGrowthPrompt();
    case 'interview':
      return buildInterviewPrompt();
    default:
      throw new Error(`Unknown insight category: ${category}`);
  }
}

export function formatInsightMessage(category, insightText, date) {
  return {
    content: `${CATEGORY_LABELS[category]} · ${date}\n${insightText}`,
  };
}

// 'ux' 카테고리는 브라우저가 필요해서 Worker가 아니라 로컬 Playwright 자동화(automation/ux-check)가 담당한다.
export async function generateDailyInsight(env, date = new Date()) {
  const category = getRotationCategory(date);
  if (category === 'ux') {
    return null;
  }
  const prompt = await buildPrompt(env, category);
  const insightText = await callLLM(env, prompt);
  return { category, insightText };
}
