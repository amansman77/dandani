-- 챌린지 테이블 생성
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기존 챌린지 데이터 삽입 (먼저 실행)
INSERT INTO challenges (name, description, start_date, end_date) VALUES
('감정 단련 챌린지', '감정적으로 단단해지는 30일 연습', '2024-03-01', '2024-03-30'),
('자기 연민 챌린지', '나에게 따뜻해지는 30일', '2024-04-01', '2024-04-30');

-- 기존 practices 테이블을 백업
CREATE TABLE IF NOT EXISTS practices_backup AS SELECT * FROM practices;

-- 기존 practices 테이블 삭제
DROP TABLE IF EXISTS practices;

-- 새로운 구조로 practices 테이블 생성
CREATE TABLE practices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL,
  day INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challenge_id) REFERENCES challenges(id),
  UNIQUE(challenge_id, day)
);

-- 기존 데이터 복원 (challenge_id = 1로 설정)
INSERT INTO practices (challenge_id, day, title, description, category)
SELECT 1, day, title, description, category FROM practices_backup;

-- 백업 테이블 삭제
DROP TABLE IF EXISTS practices_backup;

-- 기존 챌린지 데이터 삽입
INSERT INTO challenges (name, description, start_date, end_date) VALUES
('감정 단련 챌린지', '감정적으로 단단해지는 30일 연습', '2024-03-01', '2024-03-30'),
('자기 연민 챌린지', '나에게 따뜻해지는 30일', '2024-04-01', '2024-04-30');

-- 4월 자기 연민 챌린지 데이터 삽입
INSERT INTO practices (challenge_id, day, title, description, category) VALUES
(2, 1, "자기 비난 멈추기", "오늘만큼은 나를 비난하지 않기", "Self-Compassion"),
(2, 2, "긍정적 자기 대화", "“나는 괜찮아“라고 스스로에게 말해보기", "Self-Compassion"),
(2, 3, "실수에 대한 연민", "실수한 나에게 “괜찮아, 누구나 실수해“라고 말해보기", "Self-Compassion"),
(2, 4, "있는 그대로의 나 받아들이기", "오늘 나를 있는 그대로 받아들여보기", "Self-Compassion"),
(2, 5, "자기에게 따뜻한 말하기", "누군가에게 했던 따뜻한 말을 나에게 해보기", "Self-Compassion"),
(2, 6, "힘든 순간 기록하기", "하루 중 힘들었던 순간을 글로 적고, “그럴 수도 있어“라고 덧붙이기", "Self-Compassion"),
(2, 7, "불완전함 바라보기", "나의 불완전함을 탓하지 않고, 그저 바라보기", "Self-Compassion"),
(2, 8, "공통된 경험 인정하기", "“나만 그런 게 아니야“라고 스스로에게 말해보기", "Self-Compassion"),
(2, 9, "감정 기록하기", "힘든 감정을 무시하지 말고, 있는 그대로 적어보기", "Self-Compassion"),
(2, 10, "감정 느끼기", "하루에 한 번, 감정을 억누르지 않고 그대로 느껴보기", "Self-Compassion"),
(2, 11, "최선 다하기 인정", "“나는 지금 최선을 다하고 있어“라고 말해보기", "Self-Compassion"),
(2, 12, "감정 마주하기", "감정을 외면하지 않고 따뜻하게 마주하는 시간 갖기", "Self-Compassion"),
(2, 13, "공감하기", "나와 같은 고민을 가진 사람을 상상하며 공감하기", "Self-Compassion"),
(2, 14, "위로 찾기", "“지금 이 순간, 나에게 가장 필요한 위로는 뭘까?“ 적어보기", "Self-Compassion"),
(2, 15, "자기 위로하기", "“지금 나를 위로하자면 무슨 말을 해줄까?“ 적어보기", "Self-Compassion"),
(2, 16, "장점 찾기", "나의 장점을 한 가지라도 떠올려 보기", "Self-Compassion"),
(2, 17, "자기 칭찬하기", "오늘 하루, 나를 칭찬할 수 있는 점 하나 찾아보기", "Self-Compassion"),
(2, 18, "자기 선물하기", "나를 위한 작은 선물(산책, 음악, 휴식 등) 준비하기", "Self-Compassion"),
(2, 19, "자기에게 편지쓰기", "감정적으로 힘든 나에게 편지 쓰기", "Self-Compassion"),
(2, 20, "감정 수용하기", "힘든 감정이 올라올 때, 나에게 “그럴 수도 있지“라고 말해보기", "Self-Compassion"),
(2, 21, "자기 친구되기", "오늘만큼은 “나는 나의 친구“라고 생각하며 하루 보내기", "Self-Compassion"),
(2, 22, "위로 말 찾기", "“내가 힘들 때 가장 위로되는 말은 무엇인가?“ 찾기", "Self-Compassion"),
(2, 23, "따뜻한 말하기", "오늘 하루 동안 내게 따뜻한 말을 3번 해보기", "Self-Compassion"),
(2, 24, "자기 존중하기", "나를 존중하는 선택 하나 실천해보기", "Self-Compassion"),
(2, 25, "실패 수용하기", "실패하거나 놓친 일을 탓하지 않기", "Self-Compassion"),
(2, 26, "연민으로 다시 보기", "스스로 실망스러웠던 일을 적고, 연민의 시선으로 다시 써보기", "Self-Compassion"),
(2, 27, "감정 곡선 그리기", "오늘 나의 감정 곡선을 그려보고, 자신에게 따뜻한 말 한 마디 남기기", "Self-Compassion"),
(2, 28, "현재 인정하기", "“지금 이대로도 괜찮다“고 스스로 인정해보기", "Self-Compassion"),
(2, 29, "성장 인정하기", "자기 연민이 나를 더 단단하게 만들었다고 느낀 순간 떠올려보기", "Self-Compassion"),
(2, 30, "마무리 인정하기", "“나는 충분히 잘 살아가고 있다“고 말하며 마무리하기", "Self-Compassion");
