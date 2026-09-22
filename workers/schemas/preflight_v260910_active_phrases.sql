-- Read-only. Any returned row blocks the unique-index migration pending review.
SELECT user_id, COUNT(*) AS active_count
FROM daily_phrases
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;
