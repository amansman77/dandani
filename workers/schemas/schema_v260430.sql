-- ADR-PROD-001: Action Flow MVP 흐름 데이터 저장 테이블

CREATE TABLE IF NOT EXISTS action_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anonymous_id TEXT,
  current_state TEXT NOT NULL,
  desired_state TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  result TEXT,
  started INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  after_feeling TEXT,
  reflection TEXT,
  next_hint TEXT,
  pattern_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
