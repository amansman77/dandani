-- 기존 9월 챌린지 기간 변경 (challenge_id 7번)
UPDATE challenges 
SET start_date = '2025-11-01', end_date = '2025-11-30'
WHERE id = 7;

-- 기존 10월 챌린지 기간 변경 (challenge_id 8번)
UPDATE challenges 
SET start_date = '2025-12-01', end_date = '2025-12-31'
WHERE id = 8;

-- 새로운 단단이 기본 30일 챌린지 추가 (9월용)
INSERT INTO challenges (name, description, start_date, end_date, created_at)
VALUES 
('단단이 기본 30일 챌린지 (9월)',
 '매일 간단한 마음챙김 실천을 통해 감정적으로 단단해지는 습관을 만드는 30일 프로그램',
 '2025-09-01', '2025-09-30', datetime('now'));

-- 새로운 단단이 기본 30일 챌린지 추가 (10월용)
INSERT INTO challenges (name, description, start_date, end_date, created_at)
VALUES 
('단단이 기본 30일 챌린지 (10월)',
 '매일 간단한 마음챙김 실천을 통해 감정적으로 단단해지는 습관을 만드는 30일 프로그램',
 '2025-10-01', '2025-10-31', datetime('now'));

-- 9월용 단단이 기본 30일 챌린지 실천 과제 추가 (challenge_id 10번)
-- 1~5일: 깊은 숨 3번 쉬기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(10, 1, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now')),
(10, 2, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now')),
(10, 3, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now')),
(10, 4, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now')),
(10, 5, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now'));

-- 6~10일: 거울 보며 미소짓기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(10, 6, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now')),
(10, 7, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now')),
(10, 8, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now')),
(10, 9, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now')),
(10, 10, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now'));

-- 11~15일: 손바닥 비비고 따뜻함 느끼기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(10, 11, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now')),
(10, 12, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now')),
(10, 13, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now')),
(10, 14, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now')),
(10, 15, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now'));

-- 16~20일: 오늘 감사한 것 1가지 떠올리기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(10, 16, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now')),
(10, 17, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now')),
(10, 18, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now')),
(10, 19, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now')),
(10, 20, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now'));

-- 21~25일: 눈 감고 주변 소리 10초 듣기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(10, 21, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now')),
(10, 22, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now')),
(10, 23, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now')),
(10, 24, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now')),
(10, 25, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now'));

-- 26~30일: 가슴에 손 얹고 "괜찮아" 속으로 말하기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(10, 26, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now')),
(10, 27, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now')),
(10, 28, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now')),
(10, 29, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now')),
(10, 30, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now'));

-- 10월용 단단이 기본 30일 챌린지 실천 과제 추가 (challenge_id 9번)
-- 1~5일: 깊은 숨 3번 쉬기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(9, 1, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now')),
(9, 2, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now')),
(9, 3, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now')),
(9, 4, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now')),
(9, 5, '깊은 숨 3번 쉬기', '지금 자리에서 천천히 깊은 숨을 3번 들이마시고 내쉬어 보세요.', '호흡', datetime('now'));

-- 6~10일: 거울 보며 미소짓기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(9, 6, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now')),
(9, 7, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now')),
(9, 8, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now')),
(9, 9, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now')),
(9, 10, '거울 보며 미소짓기', '거울이나 화면을 보며 활짝 웃어보세요. 기분이 달라집니다.', '표정', datetime('now'));

-- 11~15일: 손바닥 비비고 따뜻함 느끼기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(9, 11, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now')),
(9, 12, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now')),
(9, 13, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now')),
(9, 14, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now')),
(9, 15, '손바닥 비비기', '양 손바닥을 5초 동안 비벼 따뜻함을 느껴보세요.', '감각', datetime('now'));

-- 16~20일: 오늘 감사한 것 1가지 떠올리기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(9, 16, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now')),
(9, 17, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now')),
(9, 18, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now')),
(9, 19, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now')),
(9, 20, '감사한 것 떠올리기', '오늘 감사한 일 한 가지를 마음속으로 떠올려 보세요.', '감사', datetime('now'));

-- 21~25일: 눈 감고 주변 소리 10초 듣기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(9, 21, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now')),
(9, 22, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now')),
(9, 23, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now')),
(9, 24, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now')),
(9, 25, '주변 소리 듣기', '눈을 감고 주변의 소리를 10초 동안 집중해 들어보세요.', '청각', datetime('now'));

-- 26~30일: 가슴에 손 얹고 "괜찮아" 속으로 말하기
INSERT INTO practices (challenge_id, day, title, description, category, created_at) VALUES
(9, 26, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now')),
(9, 27, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now')),
(9, 28, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now')),
(9, 29, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now')),
(9, 30, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now'));
(9, 31, '가슴에 손 얹기', '가슴에 손을 얹고 조용히 "괜찮아"라고 속으로 말해보세요.', '자기연민', datetime('now'));
