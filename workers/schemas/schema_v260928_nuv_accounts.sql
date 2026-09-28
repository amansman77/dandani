-- 누브 장부에서 사람마다 한 번 정하고 바꾸지 않는 두 값.
--
--   timezone  누브의 "하루"를 세는 시간대. 처음 누브를 받을 때 앱이 보낸 값으로
--             고정한다. 매번 헤더를 믿으면 시간대를 바꿔 가며 하루에 여러 개를
--             받을 수 있었다.
--   salt      장부 도장(머클 트리)에서 사용자 ID를 가리는 값.

CREATE TABLE IF NOT EXISTS nuv_accounts (
  user_id TEXT PRIMARY KEY,
  timezone TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 이미 누브가 있는 사람은 되새김 기록 시각(created_at UTC)과 log_date가 모두
-- UTC+9로 맞아떨어져서(2026-09-28 확인, 2명) 서울로 고정한다.
INSERT OR IGNORE INTO nuv_accounts (user_id, timezone, salt)
SELECT DISTINCT user_id, 'Asia/Seoul', '0x' || lower(hex(randomblob(32)))
FROM nuv_transactions;
