-- 피드백 시스템을 위한 테이블 추가
CREATE TABLE IF NOT EXISTS practice_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  challenge_id INTEGER NOT NULL,
  practice_day INTEGER NOT NULL,
  mood_change TEXT NOT NULL CHECK (mood_change IN ('improved', 'same', 'worse', 'unknown')),
  was_helpful TEXT NOT NULL CHECK (was_helpful IN ('yes', 'no', 'unknown')),
  practice_description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challenge_id) REFERENCES challenges(id),
  UNIQUE(user_id, challenge_id, practice_day)
);
