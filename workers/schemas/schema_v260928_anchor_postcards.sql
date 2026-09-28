-- 엽서도 밤마다 봉인한다(2026-09-28). 누브와 같은 날, 같은 컷오프로 엽서 장부의
-- 머클 루트를 따로 남긴다. 나중에 엽서 NFT를 받아 갈 때 이 루트로 확인한다.
-- 줄 모양은 nuv-anchor-service.js의 POSTCARD_LEAF_ENCODING.
ALTER TABLE nuv_anchors ADD COLUMN postcard_root TEXT;
ALTER TABLE nuv_anchors ADD COLUMN postcards INTEGER NOT NULL DEFAULT 0;
