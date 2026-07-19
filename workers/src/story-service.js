import { getRequiredUserId } from './service-utils.js';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const SEED_TIMEOUT_MS = 45000;

const SEED_SYSTEM_PROMPT = `너는 '단단이' 앱의 Story Feed를 채울 삶의 이야기를 쓰는 작가야.
단단이는 "상황이 나를 흔들더라도 내가 중심을 잃지 않는 것"을 돕는 감정 회복력 서비스야.
평범한 사람이 겪는 감정적으로 흔들리는 순간과, 그 순간 스스로 시도해본 아주 작은 실천 하나를 1인칭 시점으로 짧게 써줘.
실천은 10분 이내, 한 단계, 지금 바로 할 수 있는 것이어야 해. 거창한 조언이나 설교조는 피하고 담담한 경험담으로 써줘.

반드시 아래 JSON 객체 하나만 응답해, 다른 설명 텍스트나 마크다운 코드블록은 붙이지 마.
문자열 안에 줄바꿈을 쓰지 말고 한 줄로 이어서 써. 큰따옴표를 문장 안에서 쓸 때는 반드시 \\" 로 이스케이프해:
{
  "title": "이야기의 첫 문장 (한 줄, Story Feed 목록에 보여질 문장)",
  "content": "전체 이야기 (3~6문장, 1인칭, 담담한 경험담)",
  "practice_title": "오늘의 한 걸음 (한 줄, 지금 바로 할 수 있는 행동)",
  "practice_description": "그 실천에 대한 짧은 부연 설명 (1문장, 생략 가능하면 빈 문자열)"
}`;

const SEED_TOPICS = [
  '육아 중 아이에게 화를 낸 뒤의 후회',
  '운동을 싫어하지만 건강하게 살고 싶은 마음',
  '퇴근 후 핸드폰만 보다가 하루가 끝나는 허무함',
  '부모님께 먼저 연락하기 어려운 마음',
  '일에 치여 나 자신을 돌보지 못하는 느낌',
  '누군가와 비교하며 위축되는 순간',
  '거절을 못 해서 쌓인 피로',
  '잠들기 전 걱정이 많아지는 밤',
  '실수한 뒤 스스로를 탓하는 습관',
  '친구 관계에서 서운함을 말 못 하는 것',
  '반복되는 하루에 지쳐가는 느낌',
  '변화가 두려워 미루기만 하는 마음',
];

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

async function callLLM(env, userMessage, maxTokens) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEED_TIMEOUT_MS);

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SEED_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 1,
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

function parseStoryFromLLM(raw) {
  const jsonText = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  const firstBrace = jsonText.indexOf('{');
  const lastBrace = jsonText.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('LLM did not return a JSON object');
  }
  return JSON.parse(jsonText.slice(firstBrace, lastBrace + 1));
}

export async function debugNvidiaPing(env) {
  const text = await callLLM(env, '안녕이라고만 답해', 20);
  return { ok: true, text };
}

export async function seedAiStories(env, count = 12, offset = 0) {
  const inserted = [];
  const failures = [];

  for (let i = offset; i < offset + count; i += 1) {
    const topic = SEED_TOPICS[i % SEED_TOPICS.length];
    try {
      const raw = await callLLM(env, `다음 주제로 이야기 하나를 만들어줘: ${topic}`, 700);
      const story = parseStoryFromLLM(raw);
      if (!story.title || !story.content || !story.practice_title) {
        throw new Error('missing required fields');
      }

      const id = generateId('story');
      await env.DB.prepare(`
        INSERT INTO stories (id, author_type, title, content, practice_title, practice_description)
        VALUES (?, 'ai', ?, ?, ?, ?)
      `).bind(id, story.title, story.content, story.practice_title, story.practice_description || null).run();
      inserted.push({ id, title: story.title });
    } catch (error) {
      failures.push({ topic, error: error.message });
    }
  }

  return { count: inserted.length, stories: inserted, failures };
}

export async function getStoryFeed(env) {
  const { results } = await env.DB.prepare(`
    SELECT id, title, author_type, created_at
    FROM stories
    WHERE status = 'published'
    ORDER BY created_at DESC
  `).all();

  return { stories: results };
}

export async function getStoryDetail(env, storyId) {
  const story = await env.DB.prepare(`
    SELECT id, title, content, practice_title, practice_description, author_type, created_at
    FROM stories
    WHERE id = ? AND status = 'published'
  `).bind(storyId).first();

  if (!story) {
    throw new Error(`Story not found: ${storyId}`);
  }

  return story;
}

export async function tryStory(env, storyId, request) {
  const userId = getRequiredUserId(request);

  const story = await env.DB.prepare(`
    SELECT id, practice_title, practice_description FROM stories WHERE id = ? AND status = 'published'
  `).bind(storyId).first();

  if (!story) {
    throw new Error(`Story not found: ${storyId}`);
  }

  const id = generateId('try');
  await env.DB.prepare(`
    INSERT INTO story_tries (id, story_id, user_id) VALUES (?, ?, ?)
  `).bind(id, storyId, userId).run();

  return {
    tryId: id,
    practice: {
      title: story.practice_title,
      description: story.practice_description
    }
  };
}
