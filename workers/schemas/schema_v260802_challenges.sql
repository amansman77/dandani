CREATE TABLE IF NOT EXISTS user_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  story_id TEXT,
  practice_title TEXT NOT NULL,
  practice_description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_status ON user_challenges(user_id, status);

CREATE TABLE IF NOT EXISTS user_challenge_logs (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  log_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(challenge_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_user_challenge_logs_challenge ON user_challenge_logs(challenge_id);
