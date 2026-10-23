import { getUTCDate } from './core.js';

// 일별 지표는 일일 보고서(daily_snapshot)와 같은 이름을 쓴다. 2026-10-23까지는 챌린지
// 시절의 practice_users·feedback_users·ai_chat_users를 돌려줬는데, 그 이벤트를 보내는
// 화면이 없어 늘 0이었다.

export async function getUserActivityStats(env, days = 30) {
  const startDate = getUTCDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

  const dailyActiveUsers = await env.DB.prepare(`
    SELECT
      date(created_at) as activity_date,
      COUNT(DISTINCT CASE WHEN event_type = 'page_visit' THEN user_id END) as active_users,
      COUNT(DISTINCT CASE WHEN event_type = 'phrase_start' THEN user_id END) as phrases_started,
      COUNT(DISTINCT CASE WHEN event_type = 'phrase_day_logged' THEN user_id END) as phrases_logged_users
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
