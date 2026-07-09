import { corsHeaders, jsonResponse, logUserEvent } from './core.js';
import {
  getChallengeDetail,
  getChallenges,
  getPracticeHistory,
  getPracticeRecord,
  getTodayPractice,
  saveRecordFromAssistant,
  submitFeedback,
  updatePracticeRecord
} from './practice-service.js';
import { createTimefoldEnvelope, getTimefoldEnvelope } from './timefold-service.js';
import {
  calculateRetentionMetrics,
  getDailyReportData
} from './analytics-service.js';
import { getUserActivityStats } from './activity-service.js';
import { formatDiscordMessage, sendDiscordMessage } from './discord-service.js';

async function handleGet(url, request, env) {
  if (url.pathname === '/api/practice/today') {
    return jsonResponse(await getTodayPractice(env, request));
  }
  if (url.pathname === '/api/challenges') {
    return jsonResponse(await getChallenges(env));
  }
  if (url.pathname.startsWith('/api/challenges/')) {
    const challengeId = url.pathname.split('/')[3];
    return jsonResponse(await getChallengeDetail(env, challengeId, request));
  }
  if (url.pathname === '/api/feedback/record') {
    const challengeId = url.searchParams.get('challengeId');
    const practiceDay = url.searchParams.get('practiceDay');
    if (!challengeId || !practiceDay) {
      return jsonResponse({ error: 'Missing required parameters' }, 400);
    }
    return jsonResponse(await getPracticeRecord(env, challengeId, practiceDay, request));
  }
  if (url.pathname === '/api/feedback/history') {
    const challengeId = url.searchParams.get('challengeId');
    if (!challengeId) {
      return jsonResponse({ error: 'Missing challengeId parameter' }, 400);
    }
    return jsonResponse(await getPracticeHistory(env, challengeId, request));
  }
  if (url.pathname.startsWith('/api/timefold/envelope/')) {
    return jsonResponse(await getTimefoldEnvelope(request));
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
  return jsonResponse({ error: 'Not Found' }, 404);
}

async function handlePost(url, request, env) {
  if (url.pathname === '/api/feedback/submit') {
    return jsonResponse(await submitFeedback(env, request));
  }
  if (url.pathname === '/api/timefold/envelope') {
    return jsonResponse(await createTimefoldEnvelope(env, request));
  }
  if (url.pathname === '/api/records') {
    return jsonResponse(await saveRecordFromAssistant(env, request));
  }
  if (url.pathname === '/api/analytics/event') {
    const body = await request.json();
    const { event_type, event_data } = body;
    await logUserEvent(env, request, event_type, event_data);
    return jsonResponse({ success: true });
  }
  return jsonResponse({ error: 'Not Found' }, 404);
}

async function handlePut(url, request, env) {
  if (url.pathname === '/api/feedback/update') {
    return jsonResponse(await updatePracticeRecord(env, request));
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
      return handleGet(url, request, env);
    }
    if (request.method === 'POST') {
      return handlePost(url, request, env);
    }
    if (request.method === 'PUT') {
      return handlePut(url, request, env);
    }
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  } catch (error) {
    return jsonResponse({ error: error.message }, 400);
  }
}
