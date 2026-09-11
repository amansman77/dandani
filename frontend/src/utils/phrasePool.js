import { getUserId } from './userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

// 실제 다른 사용자 데이터 사이사이에, 편집팀이 고른 문장을 섞어 넣는다
// (항상 맨 앞에 고정하면 "다른 사람들의 아침"인데도 짜여진 것처럼 보인다는
// 피드백으로, 실유저 항목과 완전히 뒤섞는 쪽으로 바꿨다). 절대 실제 유저인
// 척(가짜 닉네임·가짜 N일째)하지 않고 "단단이 추천"으로 명확히 구분해서
// 보여준다 — 이 티커는 "다른 사람들도 진짜 쓰고 있다"는 신뢰를 파는
// 곳이라, 가짜 활동을 섞으면 그 신뢰 자체가 무너진다.
// 책이나 다른 작품에서 그대로 인용한 문장은 "추천"이 아니라 출처 표시가
// 맞다 — source를 달면 "책 제목 中"으로 뜨고(전집이 아니라 원 출처를
// 밝히는 인용구 관례), "단단이 추천" 대신 이걸 보여준다.
export const RECOMMENDED_ITEMS = [
  {
    // EXAMPLE_PHRASES[0]("행복한 일은 매일 있다고 생각한다")의 짧은 자기
    // 다짐형과는 별개 — 이건 그 원문 그대로의 인용이라 출처가 다르게 붙는다.
    phrase: '매일 행복하진 않지만, 행복한 일은 매일 있어.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    // EXAMPLE_PHRASES[2]("기분 좋은 하루를 그려본다")의 짧은 자기 다짐형과는
    // 별개 — 이건 그 원문 그대로의 인용이라 출처가 다르게 붙는다.
    phrase: '기분 좋은 하루를 보내는 모습을 짧게 떠올리며 오늘 하루 다 잘될 거라고 마음속으로 확신한다.',
    isRecommended: true,
    source: '나는 아침마다 삶의 감각을 깨운다',
  },
  {
    phrase: '나의 선택이 옳다는 생각이 들 때는, 남의 말은 그저 흘려보내는 것이 어떨까요?',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '나를 즐겁게 해주는 지금 눈앞의 순간에 집중하세요.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '세상에는 자기 입장을 정당화하기 위해 다른 사람을 습관적으로 비판하는 사람도 있어요. 때로는 그런 사람의 비난은 흘려들으며 나를 지킬 필요가 있습니다.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '친해지고 싶은 사람이 있다면 일단 말을 걸어보세요.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '다정한 사람은 상대에게 수치심을 느끼게 하지 않아요.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '괴로워하고 고민하는 사이 마음은 단단해져요.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '세상에서 일어나는 다양한 일을 ‘상식’이라는 한마디로 정리할 수 있을까요? 그런 말을 습관적으로 꺼내는 사람은 깊이 생각하지 않는 사람일지 몰라요. 그러니 그에게 휘둘리지 말아요.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '나라는 존재를 이루고 있는 요소 중 하나가 기억입니다. 좋은 기억은 많이 남기고 나쁜 기억을 흘려보내면 행복한 나로 살아갈 수 있을 거예요.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '사람들의 의견이나 세상의 상식 같은 불확실한 것에 흔들리지 마세요.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '닮고 싶은 사람을 찾아보세요.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '사람들이 뭐라고 하든 자신이 옳다고 믿는 길이 최선의 길입니다. 자신감을 갖고 오늘을 살아가세요.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    phrase: '‘내가 바라는 3년 후의 내 모습’을 생각하며 이상적인 자신의 모습을 그려본다.',
    isRecommended: true,
    source: '나는 아침마다 삶의 감각을 깨운다',
  },
  {
    phrase: '오늘도 나에게 와준 하루라는 시간에 감사하며 “고마워”라고 말로 표현하면 마음이 한결 따뜻해진다.',
    isRecommended: true,
    source: '나는 아침마다 삶의 감각을 깨운다',
  },
];

// 추천 항목과 실제 유저 항목을 합친 배열 전체를 섞는다 — 추천이 항상
// 맨 앞줄을 차지하지 않고, 실제 사용자 문장들 사이 아무 자리에나 나오게
// (Fisher–Yates).
export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 티커와 첫 문장 고르기 화면이 같은 재료를 쓴다. 실제 사용자 문장을 못 받아와도
// 추천 문장만으로 화면이 비지 않게 항상 합쳐서 돌려준다.
export async function fetchPhrasePool() {
  let list = [];
  try {
    const response = await fetch(`${API_URL}/api/phrases/community`, {
      headers: { 'X-User-ID': getUserId() },
    });
    if (response.ok) {
      const data = await response.json();
      list = data.items || [];
    }
  } catch (err) {
    // 부가 데이터라 실패해도 조용히 넘어간다
  }
  return shuffle([...RECOMMENDED_ITEMS, ...list]);
}

// 실제 유저 항목은 "닉네임 · N일째"를, 추천 항목은 가짜 활동을 안 만들고
// 출처가 있으면 "『책 제목』 中", 없으면 "단단이 추천"이라고 표시한다.
export const metaLabel = (it) => {
  if (it.isRecommended) {
    return it.source ? `『${it.source}』 中` : '단단이 추천';
  }
  return `${it.nickname} · ${it.logged_days === 0 ? '오늘부터' : `${it.logged_days}일째`}`;
};
