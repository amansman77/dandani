import { logUserEvent } from './core.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

async function callClaude(env, systemPrompt, userMessage, maxTokens = 500) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function parseJsonFromText(raw, fallback) {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return fallback;
  }
}

export async function suggestAction(env, request) {
  const body = await request.json();
  const { currentState, desiredState } = body;

  if (!currentState || !desiredState) {
    throw new Error('currentState and desiredState are required');
  }

  const systemPrompt = `너는 단단이야. 사용자의 현재 감정 상태와 원하는 상태를 듣고, 지금 당장 실행할 수 있는 작은 행동 하나를 제안해.

행동 조건:
- 하나의 행동만 제안
- 10분 이내
- 즉시 시작 가능
- 완료 기준이 명확

반드시 아래 JSON 형식만 응답해. 다른 텍스트 없이 JSON만:
{
  "message": "사용자에게 건네는 말 (1-2문장, 따뜻하고 공감적으로)",
  "action": {
    "description": "행동 설명 (구체적으로, 1-2문장)",
    "estimated_minutes": 숫자,
    "completion_condition": "완료 기준 (한 줄)"
  }
}`;

  const userMessage = `현재 상태: ${currentState}\n원하는 상태: ${desiredState}`;
  const raw = await callClaude(env, systemPrompt, userMessage, 400);

  const parsed = parseJsonFromText(raw, {
    message: '좋아. 지금 상태에서 크게 바꾸려 하지 말고, 딱 하나만 해보자.',
    action: {
      description: raw,
      estimated_minutes: 5,
      completion_condition: '시작하면 완료'
    }
  });

  return { success: true, data: parsed };
}

export async function generateReflection(env, request) {
  const body = await request.json();
  const { currentState, desiredState, suggestedAction, result, afterFeeling } = body;

  if (!currentState || !result || !afterFeeling) {
    throw new Error('currentState, result, afterFeeling are required');
  }

  const systemPrompt = `너는 단단이야. 사용자가 행동을 시도하고 결과를 알려줬어. 따뜻하게 회고해주고, 다음 연결 메시지를 남겨줘.

반드시 아래 JSON 형식만 응답해. 다른 텍스트 없이 JSON만:
{
  "reflection": "오늘의 회고 (2-3문장, 따뜻하고 진심으로)",
  "nextStep": "다음 연결 메시지 (1-2문장)",
  "patternNote": "내부 패턴 메모 (짧게, 분석적)",
  "nextHint": "다음 제안 힌트 (짧게)"
}`;

  const resultLabel = result === '못했어'
    ? '시작 못함'
    : result === '조금 했어'
      ? '시작했지만 완료 못함'
      : '완료';

  const actionDesc = typeof suggestedAction === 'object' && suggestedAction?.description
    ? suggestedAction.description
    : String(suggestedAction || '');

  const userMessage = `현재 상태: ${currentState}
원하는 상태: ${desiredState}
제안된 행동: ${actionDesc}
결과: ${resultLabel}
느낌: ${afterFeeling}`;

  const raw = await callClaude(env, systemPrompt, userMessage, 400);

  const parsed = parseJsonFromText(raw, {
    reflection: '오늘도 시도해줘서 고마워. 작은 한 걸음이 쌓이면 달라져.',
    nextStep: '다음에도 같이 해보자.',
    patternNote: '',
    nextHint: ''
  });

  return { success: true, data: parsed };
}

export async function saveActionFlow(env, request) {
  const body = await request.json();
  const {
    currentState,
    desiredState,
    suggestedAction,
    result,
    started,
    completed,
    afterFeeling,
    reflection,
    nextHint,
    patternNote
  } = body;

  if (!currentState || !desiredState) {
    throw new Error('currentState and desiredState are required');
  }

  const anonymousId = request.headers.get('X-User-ID') || null;

  await env.DB.prepare(`
    INSERT INTO action_flows (
      anonymous_id, current_state, desired_state, suggested_action,
      result, started, completed, after_feeling, reflection, next_hint, pattern_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    anonymousId,
    currentState,
    desiredState,
    JSON.stringify(suggestedAction || {}),
    result || '',
    started ? 1 : 0,
    completed ? 1 : 0,
    afterFeeling || '',
    reflection || '',
    nextHint || '',
    patternNote || ''
  ).run();

  await logUserEvent(env, request, 'action_flow_complete', {
    result,
    started,
    completed
  });

  return { success: true };
}
