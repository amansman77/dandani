// 오늘 화면의 배경. 카드 생성기(utils/phraseCard.js)가 캔버스로 그리는 네 가지와
// 같은 이름·같은 인상을 CSS로 옮긴 것이다.
//
// 같은 그림을 두 벌로 들고 있는 이유는 매체가 달라서다 — 화면은 CSS가 그려야
// 글자를 그 위에 얹고 크기에 따라 흐르게 둘 수 있고, 내보낼 PNG는 캔버스라야
// 만들 수 있다. 대신 id와 label은 한쪽에서만 정의해서(BACKGROUNDS) 두 곳이
// 어긋나지 않게 한다.
//
// 사진은 쓰지 않는다. 참고한 앱(성경)의 정체성은 사진이고, 이 앱의 것은
// 종이와 빛이다.

const STARS = [
  '1.6px 1.6px at 14% 12%', '1.4px 1.4px at 71% 9%', '1.8px 1.8px at 41% 21%',
  '1.3px 1.3px at 88% 27%', '1.5px 1.5px at 24% 33%', '1.2px 1.2px at 57% 15%',
  '1.5px 1.5px at 22% 76%', '1.7px 1.7px at 64% 84%', '1.4px 1.4px at 9% 88%',
  '1.3px 1.3px at 83% 72%', '1.6px 1.6px at 47% 92%', '1.2px 1.2px at 36% 67%',
].map((p, i) => `radial-gradient(${p}, rgba(255,250,238,${0.55 + (i % 4) * 0.12}), transparent 62%)`);

export const BACKGROUNDS = [
  {
    id: 'morning',
    label: '아침',
    dark: false,
    backgroundColor: '#f3ece2',
    backgroundImage: [
      'radial-gradient(ellipse 78% 42% at 50% 42%, rgba(255,252,244,0.80) 0%, rgba(253,246,234,0.32) 52%, rgba(250,242,228,0) 78%)',
      'linear-gradient(180deg, #eef2f4 0%, #f3ece2 55%, #f8f1e6 100%)',
    ].join(', '),
  },
  {
    id: 'dawn',
    label: '새벽',
    dark: true,
    backgroundColor: '#3a3026',
    backgroundImage: [
      ...STARS,
      'radial-gradient(ellipse 66% 38% at 50% 52%, rgba(255,214,150,0.20) 0%, rgba(255,214,150,0) 72%)',
      'linear-gradient(180deg, #2b241c 0%, #3a3026 55%, #4a3d2f 100%)',
    ].join(', '),
  },
  {
    id: 'paper',
    label: '종이',
    dark: false,
    backgroundColor: '#f5eee1',
    backgroundImage: 'none',
  },
  {
    id: 'light',
    label: '빛',
    dark: false,
    backgroundColor: '#f7f1e7',
    backgroundImage: [
      'radial-gradient(ellipse 86% 46% at 50% 44%, rgba(255,253,247,0.98) 0%, rgba(253,246,234,0.55) 46%, rgba(250,242,228,0) 74%)',
      'linear-gradient(180deg, #f4efe6 0%, #f9f3e9 100%)',
    ].join(', '),
  },
];

export const DEFAULT_BACKGROUND = 'morning';

export const getBackground = (id) =>
  BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[0];

// 배경이 어두우면 글자·테두리가 통째로 뒤집혀야 한다. 배경만 바꾸고 글자색을
// 두면 대비가 무너진다(스플래시를 만들 때 같은 실수를 한 적이 있다).
export const inkFor = (dark) => (dark
  ? {
    primary: '#f6efe2',
    muted: '#c3b6a1',
    faint: '#a2957f',
    accent: '#e5c79d',
    accentLine: 'rgba(229,199,157,0.72)',
    tick: 'rgba(246,239,226,0.28)',
    navBg: 'rgba(31,26,20,0.92)',
    hairline: 'rgba(255,255,255,0.10)',
  }
  : {
    primary: '#322f29',
    muted: '#8c8578',
    faint: '#a39a89',
    accent: '#a9603a',
    accentLine: '#c98354',
    tick: '#ddceb9',
    navBg: '#f8f1e6',
    hairline: 'rgba(128,128,128,0.18)',
  });

const STORAGE_KEY = 'dandani_phrase_background';

export const readBackground = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return BACKGROUNDS.some((b) => b.id === saved) ? saved : DEFAULT_BACKGROUND;
  } catch (err) {
    return DEFAULT_BACKGROUND;
  }
};

export const writeBackground = (id) => {
  try { localStorage.setItem(STORAGE_KEY, id); } catch (err) { /* 저장 못 해도 이번 세션엔 적용된다 */ }
};
