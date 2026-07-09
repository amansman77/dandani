export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Client-Timezone, X-Client-Time, X-User-ID, X-Session-ID, X-Started-At, User-Agent, CF-Connecting-IP',
  'Access-Control-Max-Age': '86400',
};

const ALLOWED_EVENT_TYPES = [
  'page_visit',
  'practice_view',
  'practice_complete',
  'feedback_submit',
  'challenge_start',
  'challenge_complete',
  'challenge_selected',
  'ai_chat_start',
  'ai_chat_message',
  'timefold_envelope_create',
  'onboarding_complete'
];

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

export function getRequiredUserId(request) {
  const userId = request.headers.get('X-User-ID');
  if (!userId || !userId.trim()) {
    throw new Error('X-User-ID header is required');
  }
  return userId.trim();
}

export async function logUserEvent(env, request, eventType, eventData = {}) {
  try {
    if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
      console.warn(`Invalid event type: ${eventType}. Skipping event logging.`);
      return;
    }

    const userId = request.headers.get('X-User-ID') || 'anonymous';
    const sessionId = request.headers.get('X-Session-ID') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userAgent = request.headers.get('User-Agent') || '';
    const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';

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
  } catch (error) {
    console.error('Event logging error:', error);
  }
}

export function getClientLocalDate(clientTime, clientTimezone) {
  const fallbackDate = new Date();
  const baseDate = clientTime ? new Date(clientTime) : fallbackDate;
  const validBaseDate = Number.isNaN(baseDate.getTime()) ? fallbackDate : baseDate;

  if (clientTimezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: clientTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(validBaseDate);

      const getPart = (type) => parts.find((part) => part.type === type)?.value;
      const year = parseInt(getPart('year'), 10);
      const month = parseInt(getPart('month'), 10);
      const day = parseInt(getPart('day'), 10);

      if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
        return new Date(Date.UTC(year, month - 1, day));
      }
    } catch (error) {
      console.warn('Invalid client timezone, fallback to UTC date:', clientTimezone);
    }
  }

  return new Date(Date.UTC(
    validBaseDate.getUTCFullYear(),
    validBaseDate.getUTCMonth(),
    validBaseDate.getUTCDate()
  ));
}

export function getUTCDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function normalizeUTCDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function calculateChallengeDayFromStart(startValue, currentDate, totalDays) {
  const normalizedStart = normalizeUTCDate(startValue);
  if (!normalizedStart || !currentDate) {
    return 1;
  }

  const diffDays = Math.floor((currentDate - normalizedStart) / MS_PER_DAY);
  const rawDay = diffDays + 1;
  const safeTotalDays = Math.max(1, totalDays || 1);

  if (!Number.isFinite(rawDay)) {
    return 1;
  }

  if (rawDay < 1) {
    return 1;
  }

  if (rawDay > safeTotalDays) {
    return safeTotalDays;
  }

  return rawDay;
}
