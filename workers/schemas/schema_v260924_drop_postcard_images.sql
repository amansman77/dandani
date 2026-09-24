-- 엽서 이미지를 서버에 보관하지 않는다.
--
-- 이미지를 쓰는 곳은 다운로드 하나뿐이었는데 그 기능을 없앴다. 엽서함의
-- 미리보기는 브라우저가 문장·프리셋으로 그때그때 다시 그리는 것이라,
-- 이 칸들을 지워도 화면은 그대로다. 같은 이유로 잃는 것도 없다 —
-- 이미지는 언제든 같은 입력에서 똑같이 다시 만들어진다.
--
-- 읽는 데 없는 데이터를 남겨두면 다음에 보는 사람이 그게 쓰인다고 믿는다.
-- 게다가 1080×1080 PNG 한 장이 800KB~1.3MB라 D1에 얹어둘 이유가 없다.

DROP INDEX IF EXISTS idx_digital_postcards_download_token;

ALTER TABLE digital_postcards DROP COLUMN image_data;
ALTER TABLE digital_postcards DROP COLUMN image_mime;
ALTER TABLE digital_postcards DROP COLUMN download_token;
