-- 사용자 리텐션 추적을 위한 테이블 추가
-- 사용자 활동 이벤트 로깅 테이블
CREATE TABLE IF NOT EXISTS user_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_visit',           -- 페이지 방문
    'practice_view',        -- 실천 과제 조회
    'practice_complete',    -- 실천 완료
    'feedback_submit',      -- 피드백 제출
    'challenge_start',      -- 챌린지 시작
    'challenge_complete',   -- 챌린지 완료
    'ai_chat_start',        -- AI 상담 시작
    'ai_chat_message',      -- AI 상담 메시지
    'timefold_envelope_create', -- Timefold 봉투 생성
    'onboarding_complete'   -- 온보딩 완료
  )),
  event_data TEXT,          -- JSON 형태의 추가 데이터
  session_id TEXT,          -- 세션 식별자
  user_agent TEXT,          -- 사용자 에이전트
  ip_address TEXT,          -- IP 주소 (마스킹된 형태)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 세션 테이블
CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  first_visit_at DATETIME NOT NULL,
  last_visit_at DATETIME NOT NULL,
  total_visits INTEGER DEFAULT 1,
  total_events INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 리텐션 지표 테이블 (일별 집계)
CREATE TABLE IF NOT EXISTS retention_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'day1_retention',
    'week1_completion', 
    'day7_retention',
    'day30_completion',
    'positive_feedback_rate'
  )),
  metric_value REAL NOT NULL,
  total_users INTEGER NOT NULL,
  active_users INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_date, metric_type)
);

-- 사용자 일별 활동 요약 테이블
CREATE TABLE IF NOT EXISTS user_daily_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  activity_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  practice_completed BOOLEAN DEFAULT FALSE,
  feedback_submitted BOOLEAN DEFAULT FALSE,
  ai_chat_used BOOLEAN DEFAULT FALSE,
  total_events INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 0, -- 초 단위
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, activity_date)
);

-- 리텐션 지표 계산을 위한 뷰
CREATE VIEW IF NOT EXISTS retention_summary AS
SELECT 
  metric_date,
  metric_type,
  metric_value,
  total_users,
  active_users,
  ROUND((active_users * 100.0 / total_users), 2) as percentage
FROM retention_metrics
ORDER BY metric_date DESC, metric_type;

-- 사용자 활동 요약 뷰
CREATE VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
  user_id,
  COUNT(DISTINCT activity_date) as active_days,
  COUNT(CASE WHEN practice_completed = 1 THEN 1 END) as practice_days,
  COUNT(CASE WHEN feedback_submitted = 1 THEN 1 END) as feedback_days,
  COUNT(CASE WHEN ai_chat_used = 1 THEN 1 END) as ai_chat_days,
  SUM(total_events) as total_events,
  AVG(session_duration) as avg_session_duration
FROM user_daily_activity
GROUP BY user_id;
