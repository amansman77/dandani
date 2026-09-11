import { corsHeaders, getUTCDate, jsonResponse, logUserEvent } from './core.js';
import {
  calculateRetentionMetrics,
  getDailyReportData
} from './analytics-service.js';
import { getUserActivityStats } from './activity-service.js';
import { formatDiscordMessage, sendDiscordMessage } from './discord-service.js';
import { generateDailyInsight, formatInsightMessage } from './insight-service.js';
import { createPhrase, getActivePhrase, logPhraseDay, retirePhrase, getPhraseHistory, getCommunityPhrases } from './phrase-service.js';

// 2026-08-28 피벗 이후 Story Feed/Challenge/Timefold 라우트는 부르는 화면이
// 없어졌고, 2026-09-06 프론트에서 그 화면들을 삭제하면서 완전히 도달 불가가
// 됐다. 인증 없이 열린 쓰기 라우트(POST /api/stories/seed 등)를 그대로 두는
// 게 부담이라 라우터에서 먼저 뗐다 — 서비스 파일(practice/story/challenge/
// timefold-service.js)은 workers/src/legacy/에 모아 되살릴 여지를 두고 남겨뒀다.
// 전체 인벤토리와 삭제 순서는 docs/adr/0005-legacy-backend-inventory.md 참고.

async function handleGet(url, request, env) {
  if (url.pathname === '/api/insight/debug') {
    const category = url.searchParams.get('category');
    return jsonResponse(await generateDailyInsight(env, new Date(), category));
  }
  if (url.pathname === '/api/phrases/active') {
    return jsonResponse(await getActivePhrase(env, request));
  }
  if (url.pathname === '/api/phrases/history') {
    return jsonResponse(await getPhraseHistory(env, request));
  }
  if (url.pathname === '/api/phrases/community') {
    return jsonResponse(await getCommunityPhrases(env, request));
  }
  if (url.pathname === '/api/analytics/retention') {
    return jsonResponse(await calculateRetentionMetrics(env));
  }
  if (url.pathname === '/api/analytics/activity') {
    const days = parseInt(url.searchParams.get('days'), 10) || 30;
    return jsonResponse(await getUserActivityStats(env, days));
  }
  if (url.pathname === '/api/analytics/daily-report') {
    const targetDate = url.searchParams.get('date');
    return jsonResponse(await getDailyReportData(env, targetDate));
  }
  if (url.pathname === '/api/analytics/event') {
    return jsonResponse({ error: 'Method Not Allowed. Use POST.' }, 405);
  }
  if (url.pathname === '/api/discord/daily-report') {
    const targetDate = url.searchParams.get('date');
    const reportData = await getDailyReportData(env, targetDate);
    const discordMessage = formatDiscordMessage(reportData);
    return jsonResponse(await sendDiscordMessage(env, discordMessage));
  }
  if (url.pathname === '/api/discord/daily-insight') {
    const insight = await generateDailyInsight(env);
    if (!insight) {
      return jsonResponse({ skipped: true, reason: 'ux category is handled by local Playwright automation' });
    }
    const discordMessage = formatInsightMessage(insight.category, insight.insightText, getUTCDate());
    return jsonResponse({ ...insight, ...(await sendDiscordMessage(env, discordMessage)) });
  }
  return jsonResponse({ error: 'Not Found' }, 404);
}

async function handlePost(url, request, env) {
  if (url.pathname === '/api/analytics/event') {
    const body = await request.json();
    const { event_type, event_data } = body;
    await logUserEvent(env, request, event_type, event_data);
    return jsonResponse({ success: true });
  }
  if (url.pathname === '/api/phrases') {
    return jsonResponse(await createPhrase(env, request));
  }
  if (url.pathname.match(/^\/api\/phrases\/[^/]+\/log$/)) {
    const phraseId = url.pathname.split('/')[3];
    return jsonResponse(await logPhraseDay(env, phraseId, request));
  }
  if (url.pathname.match(/^\/api\/phrases\/[^/]+\/retire$/)) {
    const phraseId = url.pathname.split('/')[3];
    return jsonResponse(await retirePhrase(env, phraseId, request));
  }
  return jsonResponse({ error: 'Not Found' }, 404);
}

export async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);

  try {
    if (request.method === 'GET') {
      return await handleGet(url, request, env);
    }
    if (request.method === 'POST') {
      return await handlePost(url, request, env);
    }
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  } catch (error) {
    return jsonResponse({ error: error.message }, 400);
  }
}
