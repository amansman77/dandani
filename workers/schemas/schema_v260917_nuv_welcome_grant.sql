-- 이미 누브 초기 스키마가 적용된 환경에서 welcome_grant 사유를 추가한다.
-- SQLite는 CHECK 제약을 직접 변경할 수 없어 원장을 보존하며 테이블을 교체한다.

DROP TRIGGER IF EXISTS trg_nuv_transaction_updates_wallet;

CREATE TABLE nuv_transactions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount != 0),
  reason TEXT NOT NULL CHECK (reason IN ('welcome_grant', 'daily_reflection', 'postcard_creation')),
  reference_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, reason, reference_id)
);

INSERT INTO nuv_transactions_new (id, user_id, amount, reason, reference_id, created_at)
SELECT id, user_id, amount, reason, reference_id, created_at FROM nuv_transactions;

DROP TABLE nuv_transactions;
ALTER TABLE nuv_transactions_new RENAME TO nuv_transactions;

CREATE INDEX idx_nuv_transactions_user_created
  ON nuv_transactions(user_id, created_at DESC);

CREATE TRIGGER trg_nuv_transaction_updates_wallet
AFTER INSERT ON nuv_transactions
BEGIN
  INSERT OR IGNORE INTO nuv_wallets (user_id, balance, updated_at)
  VALUES (NEW.user_id, 0, datetime('now'));
  UPDATE nuv_wallets
  SET balance = balance + NEW.amount, updated_at = datetime('now')
  WHERE user_id = NEW.user_id;
END;
