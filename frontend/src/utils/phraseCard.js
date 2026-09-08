// 내 문장을 이미지 카드로 그린다.
//
// 링크 공유는 미리보기가 URL마다 고정이라 모두 같은 그림이 나가지만, 이미지는
// 문장마다 다르게 만들 수 있다. 그리고 인스타는 웹에서 열 수 있는 길이 아예
// 없는데(메타 문서상 네이티브 전용), OS 공유 시트에 이미지 '파일'을 넘기면
// 거기 인스타가 뜬다 — 이미지가 인스타로 가는 실질적인 유일한 경로다.
//
// 그림 문법은 스플래시·og 이미지와 같은 것을 쓴다: 빛무리, 가산 합성으로 찍는
// 별, 문장 자리에는 별을 두지 않기.

const SIZE = 1080;          // 정사각 — 카톡·인스타 피드·트위터 어디나 무난하다
const MARGIN = 120;
const MAX_TEXT_W = SIZE - MARGIN * 2;
const TAU = Math.PI * 2;

export const PRESETS = [
  { id: 'morning', label: '아침' },
  { id: 'dawn', label: '새벽' },
  { id: 'paper', label: '종이' },
  { id: 'light', label: '빛' },
];

// 프리셋마다 배경과 글자색이 한 벌로 움직인다 — 배경만 바꾸면 대비가 깨진다.
const THEME = {
  morning: { text: '#3b352c', meta: '#8c8578', rule: '#c9b79c', mark: '#a9764f' },
  dawn:    { text: '#f6efe2', meta: '#c3b6a1', rule: '#8a7a63', mark: '#e0c49a' },
  paper:   { text: '#413a30', meta: '#8f8778', rule: '#cdbda4', mark: '#a9764f' },
  light:   { text: '#453d31', meta: '#8c8578', rule: '#c9b79c', mark: '#a9764f' },
};

const lerp = (a, b, t) => a + (b - a) * t;

// 같은 문장이면 늘 같은 별자리가 나오도록 문장에서 시드를 만든다.
const seededRandom = (seed) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
const seedOf = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

const paintGradient = (ctx, stops) => {
  const g = ctx.createLinearGradient(0, 0, 0, SIZE);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
};

const paintHalo = (ctx, strength) => {
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE * 0.62);
  g.addColorStop(0, `rgba(255,252,244,${0.95 * strength})`);
  g.addColorStop(0.45, `rgba(253,246,234,${0.6 * strength})`);
  g.addColorStop(1, 'rgba(250,242,228,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
};

// 글자가 놓이는 자리에는 별을 찍지 않는다 — 뒤가 어수선해지면 못 읽는다.
// 문장 띠뿐 아니라 하단 "단단이" 마크 자리도 비워야 한다.
const isBlocked = (x, y) => {
  if (Math.abs(y - SIZE * 0.5) < SIZE * 0.22) return true;          // 문장·기록
  return y > SIZE * 0.86 && Math.abs(x - SIZE / 2) < 210;           // 마크
};

const paintStars = (ctx, rnd, count) => {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i += 1) {
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      x = rnd() * SIZE;
      y = rnd() * SIZE;
      tries += 1;
    } while (tries < 40 && isBlocked(x, y));

    const size = lerp(1.6, 4.0, rnd());
    const a = 0.3 + rnd() * 0.45;
    const g = ctx.createRadialGradient(x, y, 0, x, y, size * 4.2);
    g.addColorStop(0, `rgba(255,252,244,${a})`);
    g.addColorStop(0.34, `rgba(255,231,190,${a * 0.55})`);
    g.addColorStop(1, 'rgba(255,225,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, size * 4.2, 0, TAU);
    ctx.fill();

    ctx.fillStyle = `rgba(255,253,247,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
};

const paintBackground = (ctx, preset, rnd) => {
  if (preset === 'dawn') {
    paintGradient(ctx, [[0, '#2b241c'], [0.55, '#3a3026'], [1, '#4a3d2f']]);
    paintStars(ctx, rnd, 46);
    const g = ctx.createRadialGradient(SIZE / 2, SIZE * 0.52, 0, SIZE / 2, SIZE * 0.52, SIZE * 0.5);
    g.addColorStop(0, 'rgba(255,214,150,0.20)');
    g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
    return;
  }
  if (preset === 'paper') {
    ctx.fillStyle = '#f5eee1';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(169,118,79,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 44, SIZE - 88, SIZE - 88);
    return;
  }
  if (preset === 'light') {
    paintGradient(ctx, [[0, '#f4efe6'], [1, '#f9f3e9']]);
    paintHalo(ctx, 1);
    paintStars(ctx, rnd, 18);
    return;
  }
  // morning — 앱 배경 그라디언트 그대로
  paintGradient(ctx, [[0, '#eef2f4'], [0.55, '#f3ece2'], [1, '#f8f1e6']]);
  paintHalo(ctx, 0.55);
};

// 한국어는 공백이 드물어서 단어 단위로만 자르면 한 줄이 넘쳐버린다.
// 공백 우선으로 자르되, 한 덩어리가 폭을 넘으면 글자 단위로 마저 자른다.
const wrapText = (ctx, text, maxWidth) => {
  const lines = [];
  let line = '';
  const flush = () => { if (line) { lines.push(line); line = ''; } };

  text.split(/(\s+)/).forEach((chunk) => {
    if (!chunk) return;
    if (/^\s+$/.test(chunk)) {
      if (line && ctx.measureText(`${line} `).width <= maxWidth) line += ' ';
      return;
    }
    if (ctx.measureText(line + chunk).width <= maxWidth) { line += chunk; return; }
    flush();
    if (ctx.measureText(chunk).width <= maxWidth) { line = chunk; return; }
    chunk.split('').forEach((ch) => {
      if (ctx.measureText(line + ch).width > maxWidth) flush();
      line += ch;
    });
  });
  flush();
  return lines;
};

// 짧은 문장은 크게, 긴 문장은 작게 — 줄 수가 5줄을 넘지 않는 선에서 가장 큰 크기.
const fitPhrase = (ctx, text) => {
  for (let size = 84; size >= 38; size -= 2) {
    ctx.font = `700 ${size}px Pretendard, sans-serif`;
    const lines = wrapText(ctx, text, MAX_TEXT_W);
    if (lines.length <= 5) return { size, lines };
  }
  ctx.font = '700 38px Pretendard, sans-serif';
  return { size: 38, lines: wrapText(ctx, text, MAX_TEXT_W).slice(0, 5) };
};

// 캔버스는 웹폰트가 준비되기 전에 그리면 조용히 기본 폰트로 렌더된다.
const ensureFonts = async () => {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('700 84px Pretendard'),
      document.fonts.load('400 30px Pretendard'),
    ]);
    await document.fonts.ready;
  } catch (err) { /* 폰트를 못 받아도 그리기는 계속한다 */ }
};

export const renderPhraseCard = async ({ phrase, visitDays, preset = 'morning' }) => {
  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const theme = THEME[preset] || THEME.morning;
  const rnd = seededRandom(seedOf(phrase || 'dandani'));

  paintBackground(ctx, preset, rnd);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const { size, lines } = fitPhrase(ctx, `“${phrase}”`);
  const lineHeight = size * 1.6;
  const blockH = lines.length * lineHeight;
  // 문장 덩어리를 카드 한가운데. 예전엔 40px 위로 올렸는데, 그러면 기록과
  // 하단 마크 사이가 벌어져서 아래쪽이 비어 보였다.
  let y = SIZE / 2 - blockH / 2 + size * 0.72;

  ctx.fillStyle = theme.text;
  ctx.font = `700 ${size}px Pretendard, sans-serif`;
  lines.forEach((l) => { ctx.fillText(l, SIZE / 2, y); y += lineHeight; });

  const ruleY = y - lineHeight + size * 0.5 + 56;
  ctx.strokeStyle = theme.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SIZE / 2 - 34, ruleY);
  ctx.lineTo(SIZE / 2 + 34, ruleY);
  ctx.stroke();

  if (visitDays) {
    ctx.fillStyle = theme.meta;
    ctx.font = '400 30px Pretendard, sans-serif';
    ctx.fillText(`${visitDays}번째 아침`, SIZE / 2, ruleY + 62);
  }

  ctx.fillStyle = theme.mark;
  ctx.font = '500 26px Pretendard, sans-serif';
  const tracking = 26 * 0.3;
  ctx.letterSpacing = '0.3em';
  ctx.fillText('단단이', SIZE / 2 + tracking / 2, SIZE - 88);
  ctx.letterSpacing = '0px';

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
};

export const CARD_SIZE = SIZE;
