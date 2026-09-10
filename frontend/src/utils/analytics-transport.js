import { getUserId } from './userId';
import { getClientTimeHeaders } from './clientTime';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const POSTHOG_WAIT_MS = 3000;
const POSTHOG_POLL_MS = 100;

const BACKEND_ALLOWED_EVENT_TYPES = new Set([
  'page_visit',
  'practice_view',
  'practice_complete',
  'feedback_submit',
  'challenge_start',
  'challenge_complete',
  'challenge_selected',
  'challenge_upsell_shown',
  'challenge_upsell_declined',
  'challenge_day_logged',
  'phrase_onboarding_shown',
  'phrase_example_used',
  'phrase_start',
  'phrase_day_logged',
  'phrase_retired',
  'phrase_shared',
  'ai_chat_start',
  'ai_chat_message',
  'timefold_envelope_create',
  'onboarding_complete'
]);

const BACKEND_EVENT_TYPE_ALIAS = {
  challenge_completed: 'challenge_complete',
  record_created: 'feedback_submit'
};

const POSTHOG_EVENT_MAP = {
  page_visit: '$pageview',
  challenge_selected: 'challenge_selected',
  practice_complete: 'practice_complete',
  feedback_submit: 'practice_recorded',
  assistant_opened: 'assistant_opened',
  assistant_skipped: 'assistant_skipped',
  assistant_completed: 'assistant_completed',
  record_created: 'record_created',
  challenge_completed: 'challenge_completed',
};

function getSessionId() {
  let sessionId = sessionStorage.getItem('dandani_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('dandani_session_id', sessionId);
  }
  return sessionId;
}

function capturePostHog(eventName, properties) {
  if (!window.posthog) return false;
  // Analytics and the phrase API share the same ID, including the first visit.
  window.posthog.identify(getUserId());
  window.posthog.capture(eventName, {
    service_id: 'dandani',
    environment: process.env.REACT_APP_ENVIRONMENT || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev'),
    ...properties,
    timestamp: new Date().toISOString(),
  });
  return true;
}

function tryCapture(eventName, properties) {
  try {
    return capturePostHog(eventName, properties);
  } catch (error) {
    // Third-party analytics is an optional boundary; never log payloads or IDs.
    console.debug({ event: 'posthog_capture_failed', error_type: error.name });
    return true;
  }
}

export function logPostHogEvent(eventName, properties = {}) {
  if (typeof window === 'undefined' || tryCapture(eventName, properties)) return;
  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed += POSTHOG_POLL_MS;
    if (tryCapture(eventName, properties) || elapsed >= POSTHOG_WAIT_MS) clearInterval(timer);
  }, POSTHOG_POLL_MS);
}

export async function logEvent(eventType, eventData = {}) {
  try {
    const userId = getUserId();
    const mappedEvent = POSTHOG_EVENT_MAP[eventType];
    if (mappedEvent) logPostHogEvent(mappedEvent, { ...eventData, event_type: eventType });
    const backendEventType = BACKEND_EVENT_TYPE_ALIAS[eventType] || eventType;
    if (!BACKEND_ALLOWED_EVENT_TYPES.has(backendEventType)) return;
    const response = await fetch(`${API_BASE_URL}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId,
        'X-Session-ID': getSessionId(),
        ...getClientTimeHeaders(),
      },
      body: JSON.stringify({ event_type: backendEventType, event_data: eventData }),
    });
    if (!response.ok) console.debug({ event: 'analytics_request_failed', status: response.status });
  } catch (error) {
    // Storage/network failures must not interrupt the user's phrase action.
    console.debug({ event: 'analytics_unavailable', error_type: error.name });
  }
}
