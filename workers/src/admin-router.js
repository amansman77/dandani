import { jsonResponse, getUTCDate } from './core.js';
import { HttpError } from './http-errors.js';
import { calculateRetentionMetrics, getDailyReportData } from './analytics-service.js';
import { getUserActivityStats } from './activity-service.js';
import { formatDiscordMessage, sendDiscordMessage } from './discord-service.js';
import { generateDailyInsight, formatInsightMessage } from './insight-service.js';

const MAX_ACTIVITY_DAYS = 365;
const INSIGHT_CATEGORIES = new Set(['data', 'ux', 'growth', 'interview']);

function activityDays(url) {
  const value = url.searchParams.get('days') ?? '30';
  const days = Number(value);
  if (!/^\d+$/.test(value) || !Number.isInteger(days) || days < 1 || days > MAX_ACTIVITY_DAYS) {
    throw new HttpError(400, 'days는 1~365 사이의 정수여야 합니다.');
  }
  return days;
}

function reportDate(url) {
  const value = url.searchParams.get('date');
  if (value === null) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || getUTCDate(parsed) !== value) {
    throw new HttpError(400, 'date는 유효한 YYYY-MM-DD 날짜여야 합니다.');
  }
  return value;
}

async function debugInsight(url, env) {
  const category = url.searchParams.get('category');
  if (category !== null && !INSIGHT_CATEGORIES.has(category)) {
    throw new HttpError(400, '알 수 없는 인사이트 종류입니다.');
  }
  return generateDailyInsight(env, new Date(), category);
}

async function sendInsight(env) {
  const insight = await generateDailyInsight(env);
  if (!insight) return { skipped: true, reason: 'ux category is handled by local Playwright automation' };
  const message = formatInsightMessage(insight.category, insight.insightText, getUTCDate());
  return { ...insight, ...(await sendDiscordMessage(env, message)) };
}

export async function handleAdminGet(url, env) {
  switch (url.pathname) {
    case '/api/analytics/retention':
      return jsonResponse(await calculateRetentionMetrics(env));
    case '/api/analytics/activity':
      return jsonResponse(await getUserActivityStats(env, activityDays(url)));
    case '/api/analytics/daily-report':
      return jsonResponse(await getDailyReportData(env, reportDate(url)));
    case '/api/insight/debug':
      return jsonResponse(await debugInsight(url, env));
    case '/api/discord/daily-report': {
      const report = await getDailyReportData(env, reportDate(url));
      return jsonResponse(await sendDiscordMessage(env, formatDiscordMessage(report)));
    }
    case '/api/discord/daily-insight':
      return jsonResponse(await sendInsight(env));
    default:
      return jsonResponse({ error: 'Not Found' }, 404);
  }
}
