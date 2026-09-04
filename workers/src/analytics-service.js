import { getUTCDate } from './core.js';
import { getUserActivityStats } from './activity-service.js';

// 2026-08-28 Story Feed/Challenge → 단일 문장 되새기기로 완전히 갈아탄 뒤로,
// challenge_selected/practice_complete/ai_chat_*/feedback_submit/onboarding_complete를
// 실제로 쏘는 화면이 하나도 없다. 예전 이 파일은 그 이벤트들만 세고 있어서
// 알람은 매일 왔지만 사실상 전부 0이었다 — phrase_* 이벤트 기준으로 다시 짰다.
const FUNNEL_WINDOW_DAYS = 30;

function toRate(numerator, denominator) {
  if (!denominator) return 0;
  return parseFloat(((numerator / denominator) * 100).toFixed(1));
}

// 캠페인 유입 → 문장 작성 → 되새기기 지속까지, 최근 30일 퍼널.
// user_id별 "가장 이른 page_visit" 한 건을 그 사람의 유입 캠페인으로 본다
// (attribution.js가 매 방문마다 utm_source를 event_data에 실어 보내므로,
// 정말 광고를 타고 들어온 방문이면 첫 방문에 utm_source가 반드시 붙어있다).
export async function getFunnelAndCampaigns(env, sinceDate) {
  const { results } = await env.DB.prepare(`
    WITH ranked_visits AS (
      SELECT
        user_id,
        created_at,
        COALESCE(json_extract(event_data, '$.utm_source'), 'organic') AS utm_source,
        COALESCE(json_extract(event_data, '$.utm_campaign'), '(캠페인 없음)') AS utm_campaign,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
      FROM user_events
      WHERE event_type = 'page_visit' AND created_at >= ?
    ),
    first_visit AS (
      SELECT user_id, utm_source, utm_campaign FROM ranked_visits WHERE rn = 1
    ),
    activated AS (
      SELECT DISTINCT user_id, MIN(date(created_at)) AS activated_date
      FROM user_events WHERE event_type = 'phrase_start' AND created_at >= ?
      GROUP BY user_id
    ),
    logged_days AS (
      SELECT user_id, MIN(date(created_at)) AS first_log_date, COUNT(DISTINCT date(created_at)) AS distinct_days
      FROM user_events WHERE event_type = 'phrase_day_logged' AND created_at >= ?
      GROUP BY user_id
    ),
    retired AS (
      SELECT DISTINCT user_id FROM user_events WHERE event_type = 'phrase_retired' AND created_at >= ?
    )
    SELECT
      fv.utm_source,
      fv.utm_campaign,
      COUNT(DISTINCT fv.user_id) AS visitors,
      COUNT(DISTINCT a.user_id) AS activated,
      COUNT(DISTINCT CASE WHEN ld.first_log_date = a.activated_date THEN a.user_id END) AS day1_logged,
      COUNT(DISTINCT CASE WHEN ld.distinct_days >= 2 THEN a.user_id END) AS retained_2plus,
      COUNT(DISTINCT r.user_id) AS retired
    FROM first_visit fv
    LEFT JOIN activated a ON a.user_id = fv.user_id
    LEFT JOIN logged_days ld ON ld.user_id = fv.user_id
    LEFT JOIN retired r ON r.user_id = fv.user_id
    GROUP BY fv.utm_source, fv.utm_campaign
    ORDER BY visitors DESC
  `).bind(sinceDate, sinceDate, sinceDate, sinceDate).all();

  const rows = results || [];
  const totals = rows.reduce((acc, row) => ({
    visitors: acc.visitors + row.visitors,
    activated: acc.activated + row.activated,
    day1_logged: acc.day1_logged + row.day1_logged,
    retained_2plus: acc.retained_2plus + row.retained_2plus,
    retired: acc.retired + row.retired,
  }), { visitors: 0, activated: 0, day1_logged: 0, retained_2plus: 0, retired: 0 });

  const campaigns = rows.map((row) => ({
    utm_source: row.utm_source,
    utm_campaign: row.utm_campaign,
    visitors: row.visitors,
    activated: row.activated,
    activation_rate: toRate(row.activated, row.visitors),
    retained_2plus: row.retained_2plus,
    retention_rate: toRate(row.retained_2plus, row.activated),
  }));

  const funnel = {
    period: { start: sinceDate, end: getUTCDate() },
    visitors: totals.visitors,
    activated: totals.activated,
    activation_rate: toRate(totals.activated, totals.visitors),
    day1_logged: totals.day1_logged,
    day1_log_rate: toRate(totals.day1_logged, totals.activated),
    retained_2plus: totals.retained_2plus,
    retention_rate: toRate(totals.retained_2plus, totals.activated),
    retired: totals.retired,
    retired_rate: toRate(totals.retired, totals.activated),
  };

  return { funnel, campaigns };
}

// /api/analytics/retention 디버그 엔드포인트용 — 이름은 예전부터 쓰던 그대로
// 두되(라우터 변경 최소화), 내용은 최근 30일 유입-작성-지속 퍼널로 교체했다.
export async function calculateRetentionMetrics(env, days = FUNNEL_WINDOW_DAYS) {
  const sinceDate = getUTCDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  return getFunnelAndCampaigns(env, sinceDate);
}

// 어제(UTC) 하루치 스냅샷 — "오늘 알람에 어제 숫자가 몇이었는지" 감을 주는 용도.
async function getDailySnapshot(env, targetDate) {
  const byType = async (eventType) => {
    const row = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as unique_users
      FROM user_events
      WHERE created_at LIKE ? AND event_type = ?
    `).bind(`${targetDate}%`, eventType).first();
    return row?.unique_users || 0;
  };

  const [visitors, phrasesStarted, phrasesLoggedUsers, phrasesRetired] = await Promise.all([
    byType('page_visit'),
    byType('phrase_start'),
    byType('phrase_day_logged'),
    byType('phrase_retired'),
  ]);

  return {
    date: targetDate,
    visitors,
    phrases_started: phrasesStarted,
    phrases_logged_users: phrasesLoggedUsers,
    phrases_retired: phrasesRetired,
  };
}

export async function getDailyReportData(env, targetDate = null) {
  const yesterday = targetDate || getUTCDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const windowStart = getUTCDate(new Date(Date.now() - FUNNEL_WINDOW_DAYS * 24 * 60 * 60 * 1000));

  const [dailySnapshot, { funnel, campaigns }, activityStats] = await Promise.all([
    getDailySnapshot(env, yesterday),
    getFunnelAndCampaigns(env, windowStart),
    getUserActivityStats(env),
  ]);

  const dailyActiveUsers = activityStats.daily_active_users;
  const last7Days = dailyActiveUsers.slice(0, 7);
  const last30Days = dailyActiveUsers.slice(0, 30);
  const last7DaysSum = last7Days.reduce((sum, day) => sum + day.active_users, 0);
  const last30DaysSum = last30Days.reduce((sum, day) => sum + day.active_users, 0);
  const last7DaysAvg = last7Days.length > 0 ? (last7DaysSum / last7Days.length).toFixed(1) : 0;
  const last30DaysAvg = last30Days.length > 0 ? (last30DaysSum / last30Days.length).toFixed(1) : 0;

  const peakDay = dailyActiveUsers.reduce((max, day) =>
    day.active_users > max.active_users ? day : max, dailyActiveUsers[0] || { active_users: 0, activity_date: 'N/A' });
  const lowestDay = dailyActiveUsers.reduce((min, day) =>
    day.active_users < min.active_users ? day : min, dailyActiveUsers[0] || { active_users: 0, activity_date: 'N/A' });

  return {
    date: typeof yesterday === 'string' ? yesterday : yesterday.toString(),
    daily_snapshot: dailySnapshot,
    funnel_30d: funnel,
    campaign_breakdown: campaigns,
    daily_trend: {
      last_7_days_avg: parseFloat(last7DaysAvg),
      last_30_days_avg: parseFloat(last30DaysAvg),
      peak_day: peakDay.activity_date,
      peak_users: peakDay.active_users,
      lowest_day: lowestDay.activity_date,
      lowest_users: lowestDay.active_users
    },
    generated_at: new Date().toISOString()
  };
}
