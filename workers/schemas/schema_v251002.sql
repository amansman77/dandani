-- 사용하지 않는 테이블 제거 스크립트
-- 실행 전 백업 권장

-- 1. user_sessions 테이블 제거 (세션 관리 구조 제거됨)
DROP TABLE IF EXISTS user_sessions;

-- 2. user_daily_activity 테이블 제거 (user_events로 통일됨)
DROP TABLE IF EXISTS user_daily_activity;

-- 3. 관련 뷰도 제거
DROP VIEW IF EXISTS user_activity_summary;

-- 4. retention_metrics 테이블은 여전히 사용 중이므로 유지
-- retention_summary 뷰도 유지

-- 확인용 쿼리 (실행 후 테이블 목록 확인)
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
