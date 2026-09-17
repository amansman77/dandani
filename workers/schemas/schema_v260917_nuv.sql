-- 누브(Nuv)는 다움 플랫폼의 재화 개념을 단단이 안에서 이어받는다.
-- 잔액은 빠르게 조회할 수 있게 지갑에 저장하고, 모든 증감은 원장에 남긴다.

CREATE TABLE IF NOT EXISTS nuv_wallets (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nuv_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount != 0),
  reason TEXT NOT NULL CHECK (reason IN ('daily_reflection', 'postcard_creation')),
  reference_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, reason, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_nuv_transactions_user_created
  ON nuv_transactions(user_id, created_at DESC);

-- 원장이 잔액의 유일한 변경 경로다. INSERT 한 문장 안에서 지갑까지 갱신돼
-- 동시 요청이 와도 원장과 잔액이 서로 어긋나지 않는다.
CREATE TRIGGER IF NOT EXISTS trg_nuv_transaction_updates_wallet
AFTER INSERT ON nuv_transactions
BEGIN
  INSERT OR IGNORE INTO nuv_wallets (user_id, balance, updated_at)
  VALUES (NEW.user_id, 0, datetime('now'));
  UPDATE nuv_wallets
  SET balance = balance + NEW.amount, updated_at = datetime('now')
  WHERE user_id = NEW.user_id;
END;
