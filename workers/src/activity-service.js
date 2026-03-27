import { getUTCDate } from './core.js';

export async function getUserActivityStats(env, days = 30) {
  const startDate = getUTCDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

  const dailyActiveUsers = await env.DB.prepare(`
    SELECT
      date(created_at) as activity_date,
      COUNT(DISTINCT CASE WHEN event_type = 'page_visit' THEN user_id END) as active_users,
      COUNT(CASE WHEN event_type = 'practice_complete' THEN user_id END) as practice_users,
      COUNT(CASE WHEN event_type = 'feedback_submit' THEN user_id END) as feedback_users,
      COUNT(CASE WHEN event_type IN ('ai_chat_start', 'ai_chat_message') THEN user_id END) as ai_chat_users
    FROM user_events
    WHERE created_at >= ?
    GROUP BY date(created_at)
    ORDER BY date(created_at) DESC
  `).bind(startDate).all();

  const eventStats = await env.DB.prepare(`
    SELECT
      event_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM user_events
    WHERE date(created_at) >= ?
    GROUP BY event_type
    ORDER BY count DESC
  `).bind(startDate).all();

  return {
    period: {
      days,
      start_date: startDate,
      end_date: new Date().toISOString().split('T')[0]
    },
    daily_active_users: dailyActiveUsers.results,
    event_statistics: eventStats.results,
    generated_at: new Date().toISOString()
  };
}
