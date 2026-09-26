-- 엽서에 "그때까지 이 문장을 며칠 되새겼는가"를 남긴다.
--
-- 예전엔 누브 잔액을 찍었다가 뺐다(bc90758). 누브는 사람에 붙은 총량이고
-- 언젠가 주고받게 되면 살 수도 있어서, 증명서에 들어가면 안 되는 숫자였다.
--
-- 되새긴 날수는 다르다. 그 문장에 붙어 있고(daily_phrase_logs.phrase_id),
-- 하루에 하나씩 직접 두드려야만 늘어난다. 살 수 있는 길이 없어서 증명서에
-- 들어가도 거짓이 되지 않는다. "이 말을 31일 되새기고, 그날 그렇게 했다"가
-- 엽서 한 장에 담긴다.
--
-- 세는 기준은 실천한 날까지다(log_date <= practiced_on). 그저께 일을 오늘
-- 적을 수 있는데, 그때 오늘까지의 날수를 찍으면 "그날 31일째였다"가
-- 사실이 아니게 된다.

ALTER TABLE practice_records ADD COLUMN logged_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE digital_postcards ADD COLUMN logged_days_at_issue INTEGER;
