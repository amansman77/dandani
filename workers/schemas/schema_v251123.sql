-- challenge_selected 이벤트 타입 추가
-- Experiment v2 대응: 챌린지 선택 이벤트 추적

-- SQLite는 CHECK 제약조건을 직접 수정할 수 없으므로
-- 데이터를 보존하면서 테이블을 재생성

-- 1. 임시 테이블에 기존 데이터 백업
CREATE TABLE IF NOT EXISTS user_events_temp AS SELECT * FROM user_events;

-- 2. 기존 테이블 삭제
DROP TABLE IF EXISTS user_events;

-- 3. 새로운 테이블 생성 (challenge_selected 이벤트 타입 포함)
CREATE TABLE user_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_visit',           -- 페이지 방문
    'practice_view',        -- 실천 과제 조회
    'practice_complete',    -- 실천 완료
    'feedback_submit',      -- 피드백 제출
    'challenge_start',      -- 챌린지 시작
    'challenge_complete',   -- 챌린지 완료
    'challenge_selected',   -- 챌린지 선택 (Experiment v2)
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

-- 4. 기존 데이터 복원 (challenge_selected가 아닌 이벤트만 복원)
INSERT INTO user_events 
SELECT * FROM user_events_temp 
WHERE event_type != 'challenge_selected' OR event_type IS NULL;

-- 5. 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_user_event ON user_events(user_id, event_type);

-- 6. 임시 테이블 삭제
DROP TABLE IF EXISTS user_events_temp;

