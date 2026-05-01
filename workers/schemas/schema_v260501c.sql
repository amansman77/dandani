CREATE TABLE IF NOT EXISTS action_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anonymous_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  success REAL DEFAULT 0,
  fail REAL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(anonymous_id, action_type)
);
