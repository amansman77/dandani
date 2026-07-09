const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-4-maverick-17b-128e-instruct';

const MIN_CYCLES = 3;

async function callLLM(env, systemPrompt, userMessage, maxTokens = 300) {
  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJson(raw, fallback) {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return fallback;
  }
}

export async function checkEligibility(env, request) {
  const anonymousId = await getAnonymousId(env, request);
  if (!anonymousId) return { eligible: false, reason: 'no_user' };

  const result = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM action_flows WHERE anonymous_id = ? AND started = 1`
  ).bind(anonymousId).first();

  const count = result?.count || 0;
  return { eligible: count >= MIN_CYCLES, cycle_count: count, min_cycles: MIN_CYCLES };
}

async function getAuthAnonymousId(env, request) {
  const token = request.headers.get('X-Session-Token');
  if (!token) return null;
  const session = await env.DB.prepare(
    `SELECT anonymous_id FROM user_sessions WHERE token = ?`
  ).bind(token).first();
  return session?.anonymous_id || null;
}

// 세션 토큰이 있으면 세션의 anonymous_id 우선, 없으면 X-User-ID 사용
async function getAnonymousId(env, request) {
  const sessionId = await getAuthAnonymousId(env, request);
  return sessionId || request.headers.get('X-User-ID') || null;
}

export async function generateIdentityDandani(env, request) {
  const anonymousId = await getAuthAnonymousId(env, request);
  if (!anonymousId) return { success: false, reason: 'auth_required' };

  const eligibility = await checkEligibility(env, request);
  if (!eligibility.eligible) {
    return { success: false, reason: 'not_eligible', cycle_count: eligibility.cycle_count };
  }

  const [patternsResult, flowsResult, profileResult] = await Promise.all([
    env.DB.prepare(
      `SELECT action_type, success, fail FROM action_patterns WHERE anonymous_id = ?`
    ).bind(anonymousId).all(),
    env.DB.prepare(
      `SELECT current_state, action_type, result, after_feeling FROM action_flows
       WHERE anonymous_id = ? AND started = 1 ORDER BY created_at DESC LIMIT 8`
    ).bind(anonymousId).all(),
    env.DB.prepare(
      `SELECT name FROM user_profiles WHERE anonymous_id = ?`
    ).bind(anonymousId).first(),
  ]);

  const patterns = patternsResult.results || [];
  const flows = flowsResult.results || [];
  const userName = profileResult?.name || '친구';

  // Dominant action by weighted success score
  let dominantAction = flows[0]?.action_type || 'START';
  let bestScore = -1;
  for (const p of patterns) {
    const total = (p.success || 0) + (p.fail || 0);
    if (total === 0) continue;
    const score = (p.success / total) * Math.min(total, 5);
    if (score > bestScore) { bestScore = score; dominantAction = p.action_type; }
  }

  const emotionPattern = patterns
    .filter(p => (p.success || 0) + (p.fail || 0) > 0)
    .map(p => {
      const total = p.success + p.fail;
      return `${p.action_type} ${Math.round((p.success / total) * 100)}%`;
    })
    .join(', ');

  const flowSummary = flows.slice(0, 5)
    .map(f => `[${f.action_type}] ${f.current_state} → ${f.result}`)
    .join('\n');

  const systemPrompt = `사용자의 행동 패턴 데이터를 바탕으로 이 시기의 단단이를 정의해.

반드시 아래 JSON 형식만 응답해. 다른 텍스트 없이 JSON만:
{
  "title": "이 시기를 표현한 단단이 이름 (예: '시작하는 단단이', '숨 고르는 단단이')",
  "description": "이 시기의 나를 표현하는 한 문장 (예: '피곤해도 시작은 놓치지 않는 시기의 나')"
}

규칙:
- title은 '~하는 단단이' 형식, 12자 이내
- description은 1인칭 관점, 따뜻하게, 25자 이내
- 실제 행동 패턴을 반영해서 구체적으로`;

  const userMessage = `이름: ${userName}
주요 행동: ${dominantAction}
패턴: ${emotionPattern || '없음'}
최근 흐름:
${flowSummary || '없음'}`;

  const raw = await callLLM(env, systemPrompt, userMessage, 200);
  const generated = parseJson(raw, {
    title: '나만의 단단이',
    description: '지금 이 시기의 나를 담은 단단이',
  });

  return {
    success: true,
    data: {
      title: generated.title || '나만의 단단이',
      description: generated.description || '지금 이 시기의 나를 담은 단단이',
      dominant_action: dominantAction,
      emotion_pattern: emotionPattern,
    },
  };
}

export async function saveIdentityDandani(env, request) {
  const anonymousId = await getAuthAnonymousId(env, request);
  if (!anonymousId) return { success: false, reason: 'auth_required' };

  const { title, description, dominant_action, emotion_pattern } = await request.json();
  if (!title || !description || !dominant_action) {
    return { success: false, error: 'missing fields' };
  }

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM identity_dandanis WHERE anonymous_id = ?`
  ).bind(anonymousId).first();
  const slotIndex = countResult?.count || 0;

  const result = await env.DB.prepare(
    `INSERT INTO identity_dandanis (anonymous_id, title, description, dominant_action, emotion_pattern, slot_index)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(anonymousId, title, description, dominant_action, emotion_pattern || null, slotIndex).run();

  return { success: true, id: result.meta?.last_row_id };
}

export async function getIdentityCollection(env, request) {
  const anonymousId = await getAnonymousId(env, request);
  if (!anonymousId) return { success: true, data: [] };

  const result = await env.DB.prepare(
    `SELECT id, title, description, dominant_action, emotion_pattern, created_at
     FROM identity_dandanis WHERE anonymous_id = ? ORDER BY created_at ASC`
  ).bind(anonymousId).all();

  return { success: true, data: result.results || [] };
}
