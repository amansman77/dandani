import { logUserEvent } from './core.js';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-4-maverick-17b-128e-instruct';

const ACTION_TYPE_DESCRIPTIONS = {
  START: '미루기·무기력 상태에서 작은 시작을 유도하는 행동',
  CALM: '피로·불안·긴장 상태를 호흡·이완으로 진정시키는 행동',
  FOCUS: '산만함을 줄이고 짧은 집중을 시작하는 행동',
  MOVE: '무기력·답답함 상태에서 몸을 가볍게 움직이는 행동',
  RELEASE: '화남·억눌림 상태에서 감정을 밖으로 꺼내는 행동',
  REFLECT: '행동 이후 또는 하루 마무리에 의미를 정리하는 행동',
};

const PATTERN_DELTA = {
  '해냈어': { success: 1, fail: 0 },
  '조금 했어': { success: 0.5, fail: 0.5 },
  '못했어': { success: 0, fail: 1 },
};

const MIN_ATTEMPTS = 3;
const LOW_THRESHOLD = 0.3;
const HIGH_THRESHOLD = 0.7;

async function callLLM(env, systemPrompt, userMessage, maxTokens = 500) {
  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${env.NVIDIA_API_KEY}`,
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJsonFromText(raw, fallback) {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : raw);
  } catch {
    return fallback;
  }
}

async function extractEmotionVector(env, currentState, desiredState) {
  const systemPrompt = `사용자의 현재 상태와 원하는 상태를 분석해서 감정 벡터를 추출해.

반드시 아래 JSON 형식만 응답해. 다른 텍스트 없이 JSON만:
{
  "energy": "LOW | MID | HIGH",
  "emotion": "TIRED | CALM | STRESSED | ANXIOUS | IRRITATED | RESISTANCE | SCATTERED | EMPTY",
  "intent": "NONE | WEAK | STRONG"
}

기준:
- energy: 전반적인 에너지 수준 (LOW=피곤/무기력, MID=보통, HIGH=활발)
- emotion: 주된 감정 상태 (TIRED=졸림/피로, CALM=편안, STRESSED=스트레스, ANXIOUS=불안, IRRITATED=짜증/화남, RESISTANCE=하기 싫음/미루기, SCATTERED=산만/집중안됨, EMPTY=멍함/공허)
- intent: 무언가를 하려는 의지 (NONE=없음, WEAK=약간 있음, STRONG=강함)`;

  const userMessage = `현재 상태: ${currentState}\n원하는 상태: ${desiredState}`;
  const raw = await callLLM(env, systemPrompt, userMessage, 100);

  return parseJsonFromText(raw, { energy: 'LOW', emotion: 'TIRED', intent: 'NONE' });
}

function selectActionType(emotionVector) {
  const { energy, emotion, intent } = emotionVector;

  // Rule 3: 강한 감정은 먼저 안정
  if (emotion === 'ANXIOUS') return 'CALM';
  if (emotion === 'IRRITATED') return 'RELEASE';

  // Rule 2: 의지가 있으면 Action Character
  if (intent === 'WEAK' || intent === 'STRONG') {
    if (emotion === 'SCATTERED') return 'FOCUS';
    if (emotion === 'RESISTANCE') return 'START';
    if (emotion === 'TIRED') return 'CALM';
    if (emotion === 'STRESSED') return 'CALM';
    return 'START';
  }

  // Rule 1: 에너지 낮고 의지 없으면 Emotion Character
  if (energy === 'LOW') return 'CALM';

  if (emotion === 'SCATTERED' || emotion === 'STRESSED') return 'FOCUS';
  if (emotion === 'CALM') return 'REFLECT';
  if (emotion === 'EMPTY') return 'CALM';

  return 'START';
}

async function getUserPatterns(env, anonymousId) {
  if (!anonymousId) return {};

  const result = await env.DB.prepare(`
    SELECT action_type, success, fail
    FROM action_patterns
    WHERE anonymous_id = ?
  `).bind(anonymousId).all();

  const patterns = {};
  for (const row of result.results) {
    const total = row.success + row.fail;
    patterns[row.action_type] = {
      success: row.success,
      fail: row.fail,
      successRate: total > 0 ? row.success / total : null,
      total,
    };
  }
  return patterns;
}

function applyPatternToActionType(baseActionType, patterns) {
  const base = patterns[baseActionType];

  // Cold start or not enough data: use base
  if (!base || base.total < MIN_ATTEMPTS) {
    return { actionType: baseActionType, patternContext: null };
  }

  // Rule 2: base is working well → keep it
  if (base.successRate > HIGH_THRESHOLD) {
    return { actionType: baseActionType, patternContext: null };
  }

  // Rule 1: base has low success → find better alternative
  if (base.successRate < LOW_THRESHOLD) {
    let bestType = null;
    let bestRate = -1;

    for (const [type, p] of Object.entries(patterns)) {
      if (type === baseActionType) continue;
      if (p.total < 2) continue;
      if (p.successRate > bestRate) {
        bestRate = p.successRate;
        bestType = type;
      }
    }

    if (bestType && bestRate > 0.5) {
      return {
        actionType: bestType,
        patternContext: {
          avoided: baseActionType,
          chosen: bestType,
          reason: `${baseActionType} 성공률 ${Math.round(base.successRate * 100)}%로 낮아 ${bestType}로 전환`,
        },
      };
    }
  }

  return { actionType: baseActionType, patternContext: null };
}

async function updatePattern(env, anonymousId, actionType, result) {
  if (!anonymousId || !actionType || !PATTERN_DELTA[result]) return;

  const { success, fail } = PATTERN_DELTA[result];

  await env.DB.prepare(`
    INSERT INTO action_patterns (anonymous_id, action_type, success, fail)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(anonymous_id, action_type) DO UPDATE SET
      success = success + excluded.success,
      fail = fail + excluded.fail,
      updated_at = CURRENT_TIMESTAMP
  `).bind(anonymousId, actionType, success, fail).run();
}

export async function suggestAction(env, request) {
  const body = await request.json();
  const { currentState, desiredState } = body;

  if (!currentState || !desiredState) {
    throw new Error('currentState and desiredState are required');
  }

  const anonymousId = request.headers.get('X-User-ID') || null;

  const [emotionVector, patterns] = await Promise.all([
    extractEmotionVector(env, currentState, desiredState),
    getUserPatterns(env, anonymousId),
  ]);

  const baseActionType = selectActionType(emotionVector);
  const { actionType, patternContext } = applyPatternToActionType(baseActionType, patterns);

  const patternNote = patternContext
    ? `\n\n참고 (내부 패턴): 이 사용자에게 ${patternContext.avoided} 유형은 잘 맞지 않았어. 이번엔 ${patternContext.chosen}를 시도해. 메시지에서 이전과 다른 방법을 짧게 언급해줘. (예: "이번엔 다른 방법으로 해보자")`
    : '';

  const systemPrompt = `너는 단단이야. 사용자의 상태와 행동 유형이 결정됐어. 해당 유형에 맞는 구체적인 행동 하나를 제안해.

행동 유형: ${actionType} — ${ACTION_TYPE_DESCRIPTIONS[actionType]}

행동 조건:
- 하나의 행동만 제안
- 10분 이내
- 즉시 시작 가능
- 완료 기준이 명확${patternNote}

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
  const raw = await callLLM(env, systemPrompt, userMessage, 300);

  const parsed = parseJsonFromText(raw, {
    message: '좋아. 지금 상태에서 크게 바꾸려 하지 말고, 딱 하나만 해보자.',
    action: {
      description: raw,
      estimated_minutes: 5,
      completion_condition: '시작하면 완료'
    }
  });

  return {
    success: true,
    data: {
      action_type: actionType,
      emotion_vector: emotionVector,
      message: parsed.message,
      action: parsed.action,
    }
  };
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

  const raw = await callLLM(env, systemPrompt, userMessage, 400);

  const parsed = parseJsonFromText(raw, {
    reflection: '오늘도 시도해줘서 고마워. 작은 한 걸음이 쌓이면 달라져.',
    nextStep: '다음에도 같이 해보자.',
    patternNote: '',
    nextHint: ''
  });

  return { success: true, data: parsed };
}

export async function getActionFlowHistory(env, request) {
  const anonymousId = request.headers.get('X-User-ID') || null;
  if (!anonymousId) {
    return { flows: [] };
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

  const result = await env.DB.prepare(`
    SELECT id, current_state, desired_state, suggested_action,
           result, started, completed, after_feeling, reflection, next_hint, created_at
    FROM action_flows
    WHERE anonymous_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(anonymousId, limit).all();

  const flows = result.results.map((row) => ({
    ...row,
    suggested_action: (() => { try { return JSON.parse(row.suggested_action); } catch { return {}; } })(),
    started: row.started === 1,
    completed: row.completed === 1,
  }));

  return { flows };
}

export async function saveActionFlow(env, request) {
  const body = await request.json();
  const {
    currentState,
    desiredState,
    suggestedAction,
    actionType,
    emotionVector,
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
      anonymous_id, current_state, desired_state, suggested_action, action_type,
      emotion_energy, emotion_type, emotion_intent,
      result, started, completed, after_feeling, reflection, next_hint, pattern_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    anonymousId,
    currentState,
    desiredState,
    JSON.stringify(suggestedAction || {}),
    actionType || null,
    emotionVector?.energy || null,
    emotionVector?.emotion || null,
    emotionVector?.intent || null,
    result || '',
    started ? 1 : 0,
    completed ? 1 : 0,
    afterFeeling || '',
    reflection || '',
    nextHint || '',
    patternNote || ''
  ).run();

  // Update pattern learning
  if (anonymousId && actionType && result) {
    await updatePattern(env, anonymousId, actionType, result);
  }

  await logUserEvent(env, request, 'action_flow_complete', {
    result,
    started,
    completed
  });

  return { success: true };
}
