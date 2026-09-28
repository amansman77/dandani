import { corsHeaders, jsonResponse, logUserEvent } from './core.js';
import { HttpError, readJson } from './http-errors.js';
import { ADMIN_PATHS, requireAdmin } from './admin-auth.js';
import { handleAdminGet } from './admin-router.js';
import { createPhrase, replacePhrase } from './phrase-mutations.js';
import { getActivePhrase, logPhraseDay, retirePhrase, getPhraseHistory, getCommunityPhrases } from './phrase-service.js';
import {
  createPostcardFromPhrase, getNuvLedger, getNuvWallet, getSavedPostcards, savePostcard,
} from './nuv-service.js';
import { createPracticeRecord, getPracticeRecords } from './practice-service.js';

// Legacy services stay unregistered; see docs/adr/0005-legacy-backend-inventory.md.
async function handleGet(url, request, env) {
  if (ADMIN_PATHS.has(url.pathname)) return handleAdminGet(url, env);
  switch (url.pathname) {
    case '/api/phrases/active': return jsonResponse(await getActivePhrase(env, request));
    case '/api/phrases/history': return jsonResponse(await getPhraseHistory(env, request));
    case '/api/phrases/community': return jsonResponse(await getCommunityPhrases(env, request));
    case '/api/nuv': return jsonResponse(await getNuvWallet(env, request));
    case '/api/nuv/ledger': return jsonResponse(await getNuvLedger(env, request));
    case '/api/practices': return jsonResponse(await getPracticeRecords(env, request));
    case '/api/nuv/postcards': return jsonResponse(await getSavedPostcards(env, request));
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
  if (url.pathname === '/api/practices') {
    const result = await createPracticeRecord(env, request);
    return jsonResponse(result, 201);
  }
  // 가입 선물이 사라져서 이 경로는 더 줄 게 없다. 이미 배포된 클라이언트가
  // 아직 여기로 오기 때문에, 없애는 대신 잔액만 돌려준다(누브를 발행하지 않음).
  if (url.pathname === '/api/nuv/welcome') return jsonResponse(await getNuvWallet(env, request));

  // 엽서 만들기 — 지금 문장을 엽서로. 2026-09-24에 "실천 없이는 증명이
  // 아니다"라며 없앴다가, 09-28 엽서를 "문장을 엽서로 옮기는 일"로 다시 정하면서
  // 되살렸다. POST /api/practices는 이미 설치된 앱이 아직 부르므로 남겨 둔다.
  if (url.pathname === '/api/nuv/postcards') {
    return jsonResponse(await createPostcardFromPhrase(env, request), 201);
  }
  //   POST .../image, GET /api/nuv/postcard-files/:token — 없앴다. 이미지는
  //     서버에 보관하지 않는다. 미리보기는 브라우저가 문장·프리셋으로 그때그때
  //     다시 그리고, 밖으로 내보내는 건 OS 공유 시트가 맡는다.
  const postcardMatch = /^\/api\/nuv\/postcards\/([^/]+)\/save$/.exec(url.pathname);
  if (postcardMatch) {
    return jsonResponse(await savePostcard(env, postcardMatch[1], request));
  }
  if (url.pathname === '/api/phrases') return jsonResponse(await createPhrase(env, request));
  // 문장을 바꾸면 되새김은 새로 시작한다. 글자만 고치는 길(rewrite)을 잠깐
  // 뒀다가 걷어냈다 — 다른 말을 살기로 했으면 처음부터 세는 게 맞다는
  // 결정이었다.
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
