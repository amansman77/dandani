-- 추천/인기 챌린지 필드 추가
-- 챌린지 선택 화면에서 추천/인기 챌린지를 데이터로 관리

-- challenges 테이블에 is_recommended, is_popular 필드 추가
ALTER TABLE challenges ADD COLUMN is_recommended INTEGER DEFAULT 0;
ALTER TABLE challenges ADD COLUMN is_popular INTEGER DEFAULT 0;

-- 기존 인기 챌린지 설정 (ID: 6, 7, 12)
-- UPDATE challenges SET is_popular = 1 WHERE id IN (6, 7, 12);

-- 추천 챌린지는 최신 챌린지 중 하나를 선택하거나, 수동으로 설정 가능
-- 예: 최신 챌린지(ID: 12)를 추천으로 설정
-- UPDATE challenges SET is_recommended = 1 WHERE id = 12;

