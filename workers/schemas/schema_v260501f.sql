CREATE TABLE IF NOT EXISTS user_sessions (
  token TEXT PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  google_id TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
