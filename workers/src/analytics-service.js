import { getUTCDate } from './core.js';
import { getUserActivityStats } from './activity-service.js';

export async function calculateRetentionMetrics(env) {
  const today = getUTCDate();
  const thirtyDaysAgo = getUTCDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const day1Retention = await env.DB.prepare(`
    SELECT
      COUNT(DISTINCT ue1.user_id) as total_users,
      COUNT(DISTINCT ue2.user_id) as returning_users
    FROM user_events ue1
    LEFT JOIN user_events ue2 ON ue1.user_id = ue2.user_id
      AND ue2.event_type = 'page_visit'
      AND date(ue2.created_at) = date(ue1.created_at, '+1 day')
    WHERE ue1.event_type = 'page_visit'
      AND date(ue1.created_at) >= ?
      AND date(ue1.created_at) < ?
  `).bind(thirtyDaysAgo, today).first();

  const week1Completion = await env.DB.prepare(`
    SELECT
      COUNT(DISTINCT user_id) as total_users,
      COUNT(DISTINCT CASE WHEN event_type = 'practice_complete' THEN user_id END) as completed_users
    FROM user_events
    WHERE created_at >= ? AND created_at < ?
  `).bind(thirtyDaysAgo, today).first();

  const day7Retention = await env.DB.prepare(`
    SELECT
      COUNT(DISTINCT ue1.user_id) as total_users,
      COUNT(DISTINCT ue2.user_id) as returning_users
    FROM user_events ue1
    LEFT JOIN user_events ue2 ON ue1.user_id = ue2.user_id
      AND ue2.event_type = 'page_visit'
      AND date(ue2.created_at) = date(ue1.created_at, '+7 days')
    WHERE ue1.event_type = 'page_visit'
      AND date(ue1.created_at) >= ?
      AND date(ue1.created_at) < ?
  `).bind(thirtyDaysAgo, today).first();

  const day30Completion = await env.DB.prepare(`
    SELECT
      COUNT(DISTINCT user_id) as total_users,
      COUNT(DISTINCT CASE WHEN active_days >= 30 THEN user_id END) as completed_users
    FROM (
      SELECT
        user_id,
        COUNT(DISTINCT date(created_at)) as active_days
      FROM user_events
      WHERE event_type = 'page_visit'
      GROUP BY user_id
    ) user_activity_summary
  `).first();

  const positiveFeedback = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_feedback,
      COUNT(CASE WHEN mood_change = 'improved' OR was_helpful = 'yes' THEN 1 END) as positive_feedback
    FROM practice_feedback
    WHERE created_at >= ?
  `).bind(thirtyDaysAgo).first();

  const day1Rate = day1Retention.total_users > 0
    ? (day1Retention.returning_users / day1Retention.total_users * 100).toFixed(2) : 0;
  const week1Rate = week1Completion.total_users > 0
    ? (week1Completion.completed_users / week1Completion.total_users * 100).toFixed(2) : 0;
  const day7Rate = day7Retention.total_users > 0
    ? (day7Retention.returning_users / day7Retention.total_users * 100).toFixed(2) : 0;
  const day30Rate = day30Completion.total_users > 0
    ? (day30Completion.completed_users / day30Completion.total_users * 100).toFixed(2) : 0;
  const positiveRate = positiveFeedback.total_feedback > 0
    ? (positiveFeedback.positive_feedback / positiveFeedback.total_feedback * 100).toFixed(2) : 0;

  return {
    metrics: {
      day1_retention: {
        value: parseFloat(day1Rate),
        target: 40,
        status: parseFloat(day1Rate) >= 40 ? 'good' : 'needs_improvement',
        total_users: day1Retention.total_users,
        returning_users: day1Retention.returning_users
      },
      week1_completion: {
        value: parseFloat(week1Rate),
        target: 50,
        status: parseFloat(week1Rate) >= 50 ? 'good' : 'needs_improvement',
        total_users: week1Completion.total_users,
        completed_users: week1Completion.completed_users
      },
      day7_retention: {
        value: parseFloat(day7Rate),
        target: 25,
        status: parseFloat(day7Rate) >= 25 ? 'good' : 'needs_improvement',
        total_users: day7Retention.total_users,
        returning_users: day7Retention.returning_users
      },
      day30_completion: {
        value: parseFloat(day30Rate),
        target: 10,
        status: parseFloat(day30Rate) >= 10 ? 'good' : 'needs_improvement',
        total_users: day30Completion.total_users,
        completed_users: day30Completion.completed_users
      },
      positive_feedback: {
        value: parseFloat(positiveRate),
        target: 70,
        status: parseFloat(positiveRate) >= 70 ? 'good' : 'needs_improvement',
        total_feedback: positiveFeedback.total_feedback,
        positive_feedback: positiveFeedback.positive_feedback
      }
    },
    calculated_at: new Date().toISOString(),
    period: {
      start: thirtyDaysAgo,
      end: today
    }
  };
}

async function getDailyStatsFromEvents(env, targetDate) {
  try {
    const activeUsers = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM user_events
      WHERE created_at LIKE ?
    `).bind(`${targetDate}%`).first();

    const practiceUsers = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as practice_users
      FROM user_events
      WHERE created_at LIKE ? AND event_type = 'practice_complete'
    `).bind(`${targetDate}%`).first();

    const feedbackUsers = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as feedback_users
      FROM user_events
      WHERE created_at LIKE ? AND event_type = 'feedback_submit'
    `).bind(`${targetDate}%`).first();

    const aiChatUsers = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as ai_chat_users
      FROM user_events
      WHERE created_at LIKE ? AND event_type IN ('ai_chat_start', 'ai_chat_message')
    `).bind(`${targetDate}%`).first();

    return {
      activity_date: typeof targetDate === 'string' ? targetDate : targetDate.toString(),
      active_users: activeUsers.active_users || 0,
      practice_users: practiceUsers.practice_users || 0,
      feedback_users: feedbackUsers.feedback_users || 0,
      ai_chat_users: aiChatUsers.ai_chat_users || 0
    };
  } catch (error) {
    console.error('Daily stats from events error:', error);
    return {
      activity_date: typeof targetDate === 'string' ? targetDate : targetDate.toString(),
      active_users: 0,
      practice_users: 0,
      feedback_users: 0,
      ai_chat_users: 0
    };
  }
}

function validateDataConsistency(dailyStats, eventStats) {
  const issues = [];

  if (dailyStats.active_users > eventStats.page_visits.unique_users) {
    issues.push(`활성 사용자(${dailyStats.active_users})가 페이지 방문 사용자(${eventStats.page_visits.unique_users})보다 많음`);
  }
  if (eventStats.practice_completes.unique_users > dailyStats.active_users) {
    issues.push(`실천 완료 사용자(${eventStats.practice_completes.unique_users})가 활성 사용자(${dailyStats.active_users})보다 많음`);
  }
  if (eventStats.feedback_submits.unique_users > dailyStats.active_users) {
    issues.push(`피드백 제출 사용자(${eventStats.feedback_submits.unique_users})가 활성 사용자(${dailyStats.active_users})보다 많음`);
  }
  if (eventStats.ai_chat_starts.unique_users > dailyStats.active_users) {
    issues.push(`AI 상담 사용자(${eventStats.ai_chat_starts.unique_users})가 활성 사용자(${dailyStats.active_users})보다 많음`);
  }

  return issues;
}

export async function getDailyReportData(env, targetDate = null) {
  const yesterday = targetDate || getUTCDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const retentionMetrics = await calculateRetentionMetrics(env);
  const activityStats = await getUserActivityStats(env);
  const yesterdayStats = await getDailyStatsFromEvents(env, yesterday);

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

  const yesterdayEventStats = await env.DB.prepare(`
    SELECT
      event_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM user_events
    WHERE created_at LIKE ?
    GROUP BY event_type
    ORDER BY count DESC
  `).bind(`${yesterday}%`).all();

  const byType = (type) => yesterdayEventStats.results.find((event) => event.event_type === type) || { count: 0, unique_users: 0 };
  const eventStats = {
    practice_completes: byType('practice_complete'),
    ai_chat_starts: byType('ai_chat_start'),
    feedback_submits: byType('feedback_submit'),
    page_visits: byType('page_visit'),
    onboarding_completes: byType('onboarding_complete'),
    challenge_completes: byType('challenge_complete'),
    challenge_selected: byType('challenge_selected')
  };

  let dailyStats;
  if (yesterdayStats && yesterdayStats.active_users > 0) {
    dailyStats = yesterdayStats;
  } else {
    const activeUsers = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM user_events
      WHERE created_at LIKE ?
    `).bind(`${yesterday}%`).first();

    const practiceUsers = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as practice_users
      FROM user_events
      WHERE created_at LIKE ? AND event_type = 'practice_complete'
    `).bind(`${yesterday}%`).first();

    const feedbackUsers = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as feedback_users
      FROM user_events
      WHERE created_at LIKE ? AND event_type = 'feedback_submit'
    `).bind(`${yesterday}%`).first();

    const aiChatUsers = await env.DB.prepare(`
      SELECT COUNT(DISTINCT user_id) as ai_chat_users
      FROM user_events
      WHERE created_at LIKE ? AND event_type IN ('ai_chat_start', 'ai_chat_message')
    `).bind(`${yesterday}%`).first();

    dailyStats = {
      activity_date: yesterday,
      active_users: activeUsers.active_users || 0,
      practice_users: practiceUsers.practice_users || 0,
      feedback_users: feedbackUsers.feedback_users || 0,
      ai_chat_users: aiChatUsers.ai_chat_users || 0
    };
  }

  const consistencyIssues = validateDataConsistency({
    active_users: eventStats.page_visits?.unique_users || 0,
    practice_users: eventStats.practice_completes.unique_users,
    feedback_users: eventStats.feedback_submits.unique_users,
    ai_chat_users: eventStats.ai_chat_starts.unique_users
  }, eventStats);

  return {
    date: typeof yesterday === 'string' ? yesterday : yesterday.toString(),
    retention_metrics: retentionMetrics,
    daily_stats: dailyStats,
    event_stats: eventStats,
    daily_trend: {
      last_7_days_avg: parseFloat(last7DaysAvg),
      last_30_days_avg: parseFloat(last30DaysAvg),
      peak_day: peakDay.activity_date,
      peak_users: peakDay.active_users,
      lowest_day: lowestDay.activity_date,
      lowest_users: lowestDay.active_users
    },
    data_consistency: {
      issues: consistencyIssues,
      is_consistent: consistencyIssues.length === 0
    },
    generated_at: new Date().toISOString()
  };
}
