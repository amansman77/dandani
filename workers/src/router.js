import { corsHeaders, jsonResponse, logUserEvent } from './core.js';
import { HttpError, readJson } from './http-errors.js';
import { ADMIN_PATHS, requireAdmin } from './admin-auth.js';
import { handleAdminGet } from './admin-router.js';
import { createPhrase, replacePhrase } from './phrase-mutations.js';
import { getActivePhrase, logPhraseDay, retirePhrase, getPhraseHistory, getCommunityPhrases } from './phrase-service.js';

// Legacy services stay unregistered; see docs/adr/0005-legacy-backend-inventory.md.
async function handleGet(url, request, env) {
  if (ADMIN_PATHS.has(url.pathname)) return handleAdminGet(url, env);
  switch (url.pathname) {
    case '/api/phrases/active': return jsonResponse(await getActivePhrase(env, request));
    case '/api/phrases/history': return jsonResponse(await getPhraseHistory(env, request));
    case '/api/phrases/community': return jsonResponse(await getCommunityPhrases(env, request));
    case '/api/analytics/event': return jsonResponse({ error: 'Method Not Allowed. Use POST.' }, 405);
    default: return jsonResponse({ error: 'Not Found' }, 404);
  }
}

async function collectEvent(request, env) {
  const body = await readJson(request);
  if (!body || typeof body.event_type !== 'string' ||
      (body.event_data !== undefined && (body.event_data === null || typeof body.event_data !== 'object' || Array.isArray(body.event_data)))) {
    throw new HttpError(400, 'event_type과 event_data 형식을 확인해 주세요.');
  }
  await logUserEvent(env, request, body.event_type, body.event_data);
  return jsonResponse({ success: true });
}

async function handlePost(url, request, env) {
  if (url.pathname === '/api/analytics/event') return collectEvent(request, env);
  if (url.pathname === '/api/phrases') return jsonResponse(await createPhrase(env, request));
  const match = /^\/api\/phrases\/([^/]+)\/(replace|log|retire)$/.exec(url.pathname);
  if (!match) return jsonResponse({ error: 'Not Found' }, 404);
  const handlers = { replace: replacePhrase, log: logPhraseDay, retire: retirePhrase };
  return jsonResponse(await handlers[match[2]](env, match[1], request));
}

export async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const url = new URL(request.url);
  try {
    if (ADMIN_PATHS.has(url.pathname)) await requireAdmin(request, env);
    if (request.method === 'GET') return await handleGet(url, request, env);
    if (request.method === 'POST') return await handlePost(url, request, env);
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
    // Boundary catch: do not expose SQL, upstream payloads or secrets to clients/logs.
    const requestId = crypto.randomUUID();
    console.error({ event: 'request_failed', request_id: requestId, error_type: error.name });
    return jsonResponse({ error: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.', request_id: requestId }, 500);
  }
}
