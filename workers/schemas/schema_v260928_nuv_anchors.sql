-- 누브 장부 도장. 하루(서울 기준)에 한 줄, 그날 00:30 KST까지의 누적 장부를
-- 머클 트리로 묶은 루트. 트리는 저장하지 않는다 — 원장과 cutoff_at만 있으면
-- 언제든 같은 루트로 다시 계산된다(nuv-anchor-service.js).
--
-- status
--   awaiting_chain  루트는 만들었고 체인 기록은 도장 지갑을 기다리는 중
--   anchored        체인에 기록됨(tx_hash)
--   failed          체인 기록 시도가 실패함 — 다음 시도에서 다시 올린다

CREATE TABLE IF NOT EXISTS nuv_anchors (
  day TEXT PRIMARY KEY,
  cutoff_at TEXT NOT NULL,
  root TEXT NOT NULL,
  people INTEGER NOT NULL,
  total_nuv INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('awaiting_chain', 'anchored', 'failed')),
  tx_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  anchored_at TEXT
);
