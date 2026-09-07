import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';

// 앱을 열 때마다 뜨는 스플래시("발화" 안).
//
// 처음엔 첫 방문에만 띄웠다(폰트 2MB 내려받는 동안을 덮는 용도). 지금은
// 매 진입마다 띄운다 — 매일 아침 여는 앱이라 "열면 해가 뜬다"가 의식의
// 일부가 되는 쪽을 택했다. 대신 재방문엔 폰트가 이미 캐시돼 있어서 실제
// 대기는 없고 ANIM_MS만큼이 순수한 연출 시간이 된다. 길다고 느껴지면
// 여기 값만 줄이면 된다.
//
// 왜 어두운 데서 시작하나: 별(빛)은 자기보다 어두운 바닥이 있어야 보인다.
// 앱 배경(거의 흰 크림) 위에 흰 빛을 더하면 아무것도 안 보인다. 그래서
// 어스름한 톤에서 시작해 마지막에 앱의 실제 배경 그라디언트로 "발화"하며
// 착지한다 — 스플래시가 걷히는 순간 첫 화면과 색이 이어져 이음매가 없다.

// 속도는 숫자 하나가 아니라 "구간 배치"의 문제다. 그냥 길게만 늘이면
// 느린 게 아니라 늘어진 게 된다. 그래서 (1) 전체를 늘리고 (2) 빛·별·
// 여명이 겹쳐 몰려 있던 걸 앞뒤로 떼어놓고 (3) 마지막에 아무것도 안
// 움직이는 정지 구간을 두는 세 가지를 같이 했다. 여유는 대부분 (3)에서
// 나온다 — 다 끝난 화면이 잠깐 가만히 있어야 숨 돌릴 틈이 생긴다.
//
// 그 정지 구간은 예전엔 "ANIM_MS에서 문장 페이드인을 뺀 나머지"라는 식으로
// 우연히 남는 시간이었다. 문장이 머무는 시간을 따로 조절하고 싶어서
// HOLD_MS로 떼어냈다 — 이제 문장을 더 오래 두고 싶으면 이 값만 만지면
// 되고, 앞의 연출 길이(ANIM_MS)와 서로 간섭하지 않는다.
const ANIM_MS = 4200;     // 빛·별·여명·문장이 다 자리 잡기까지
const HOLD_MS = 2100;     // 그 뒤로 아무것도 안 움직이고 문장만 머무는 시간
const LINE_IN_MS = 1100;  // 문장이 떠오르는 데 걸리는 시간
const MAX_WAIT_MS = 9000; // 폰트가 아무리 늦어도 여기서는 넘긴다(ANIM_MS+HOLD_MS보다 넉넉히 커야
                          // 한다 — 여유가 좁으면 느린 회선에서 폰트를 못 기다리고 대체 글꼴로 넘어간다)
const FADE_MS = 700;      // 걷히는 것도 천천히

// 앱 배경 그라디언트(App.js의 COLOR.gradient)와 같은 색을 캔버스에서도 쓴다
const SKY = [[0, [238, 242, 244]], [0.55, [243, 236, 226]], [1, [248, 241, 230]]];
const DUSK = [58, 48, 38];

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function sampleSky(y) {
  for (let i = 0; i < SKY.length - 1; i += 1) {
    const [p0, c0] = SKY[i];
    const [p1, c1] = SKY[i + 1];
    if (y <= p1) {
      const t = (y - p0) / (p1 - p0);
      return [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)];
    }
  }
  return SKY[SKY.length - 1][1];
}

// 배경이 밝아지는 정도 (0=어스름, 1=앱 배경색).
// 별이 다 돋고 나서 여명이 시작되도록 뒤로 미뤘다 — 예전엔 별이 아직
// 태어나는 중에 날이 밝아버려서 서로 밀어냈다.
const liftAt = (t) => easeOut(clamp01((t - 0.56) / 0.26));

// 문장이 놓일 영역. 별을 여기서 밀어내고, 이 자리에 빛무리를 고이게 한다.
const bandOf = (w, h) => ({ y: h * 0.5, halfH: h * 0.15 * 0.75, halfW: w * 0.80 * 0.55 });

function buildStars(w, h) {
  const cx = w / 2;
  const cy = h * 0.46;
  const maxR = Math.min(w, h) * 0.46;
  const band = bandOf(w, h);
  const pts = [];
  for (let i = 0; i < 26; i += 1) {
    // 문장 자리에 걸리면 다시 뽑는다 — 별이 글자 위를 지나가면 읽는 데 방해가 된다
    let x; let y; let r; let tries = 0;
    do {
      const th = Math.random() * TAU;
      r = maxR * (0.18 + Math.pow(Math.random(), 0.55) * 0.82);
      x = cx + Math.cos(th) * r;
      y = cy + Math.sin(th) * r * 1.25;
      tries += 1;
    } while (tries < 24 && Math.abs(y - band.y) < band.halfH && Math.abs(x - cx) < band.halfW);

    pts.push({
      x,
      y,
      // 빛의 가장자리가 자기 자리에 닿는 순간 태어난다 — 불티처럼.
      // 마지막 별이 절반쯤에 태어나 여명 전까지 잠시 머문다.
      born: 0.05 + (r / maxR) * 0.45,
      size: lerp(1.4, 2.8, Math.random()),
      bright: Math.random() < 0.2,
      ph: Math.random() * TAU,
    });
  }
  return pts;
}

function drawStar(ctx, p, alpha, s, tw) {
  const r = p.size * s;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.4);
  g.addColorStop(0, `rgba(255,252,244,${alpha})`);
  g.addColorStop(0.34, `rgba(255,231,190,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(255,225,180,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.4, 0, TAU); ctx.fill();

  ctx.fillStyle = `rgba(255,253,247,${alpha})`;
  ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.62, 0, TAU); ctx.fill();

  if (!p.bright) return;
  // 십자 광채는 소수에만 — 전부 주면 반짝임이 싸구려로 보인다
  const L = r * (4.6 + tw * 1.5);
  const core = `rgba(255,248,232,${alpha * 0.62})`;
  let lg = ctx.createLinearGradient(p.x - L, p.y, p.x + L, p.y);
  lg.addColorStop(0, 'rgba(255,240,210,0)');
  lg.addColorStop(0.5, core);
  lg.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = lg; ctx.fillRect(p.x - L, p.y - 0.5, L * 2, 1);
  lg = ctx.createLinearGradient(p.x, p.y - L, p.x, p.y + L);
  lg.addColorStop(0, 'rgba(255,240,210,0)');
  lg.addColorStop(0.5, core);
  lg.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = lg; ctx.fillRect(p.x - 0.5, p.y - L, 1, L * 2);
}

const SplashScreen = ({ onDone }) => {
  const canvasRef = useRef(null);
  const [leaving, setLeaving] = useState(false);
  const [showLine, setShowLine] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext('2d');
    let raf = null;
    let stars = [];
    let W = 0;
    let H = 0;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = buildStars(W, H);
    };

    const draw = (t, now) => {
      const lift = liftAt(t);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      SKY.forEach(([p]) => {
        const c = sampleSky(p);
        g.addColorStop(p, `rgb(${lerp(DUSK[0], c[0], lift) | 0},${lerp(DUSK[1], c[1], lift) | 0},${lerp(DUSK[2], c[2], lift) | 0})`);
      });
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      const R = Math.hypot(W, H) * 0.60;
      const grow = easeOut(clamp01((t - 0.03) / 0.52)) * R;
      if (grow > 0) {
        const warm = 1 - lift * 0.75;
        const rg = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, grow);
        rg.addColorStop(0, `rgba(255,214,166,${0.32 * warm})`);
        rg.addColorStop(0.68, `rgba(255,198,146,${0.15 * warm})`);
        rg.addColorStop(0.94, `rgba(255,224,180,${0.28 * warm})`);
        rg.addColorStop(1, 'rgba(255,206,150,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      stars.forEach((p) => {
        const age = (t - p.born) / 0.22;
        if (age <= 0) return;
        const appear = easeOut(clamp01(age));
        const s = lerp(1.5, 1, appear);
        const tw = 0.5 + 0.5 * Math.sin(now / 900 + p.ph);
        // 날이 밝으면 별은 사라진다 — 밝은 바닥에선 어차피 안 보이기도 하고
        const a = appear * (1 - lift * 0.94) * lerp(0.5, 1, tw);
        if (a > 0.004) drawStar(ctx, p, a, s, tw);
      });
      ctx.restore();

      // 문장이 떠오르는 것과 같이 그 자리에 빛이 고인다 — 어둠으로 자리를
      // 만들면 대비는 세지만 끝 화면이 어두워져 앱 배경으로 착지하는 이음매가
      // 깨진다. 빛으로 만들면 지금 구조를 그대로 두고 집중만 얻는다.
      const spread = easeOut(clamp01((t - 0.54) / 0.26));
      if (spread > 0) {
        const band = bandOf(W, H);
        const rx = W * 0.66 * spread;
        const ry = H * 0.17 * spread;
        const rMax = Math.max(rx, ry);
        const a = 0.92 * spread;
        const rg = ctx.createRadialGradient(W / 2, band.y, 0, W / 2, band.y, rMax);
        rg.addColorStop(0, `rgba(255,252,244,${a})`);
        rg.addColorStop(0.46, `rgba(253,246,234,${a * 0.72})`);
        rg.addColorStop(1, 'rgba(250,242,228,0)');
        ctx.save();
        // 가로로 납작한 타원으로 — 두 줄짜리 문장 형태에 맞춘다
        ctx.translate(W / 2, band.y);
        ctx.scale(1, ry / rMax);
        ctx.translate(-W / 2, -band.y);
        ctx.fillStyle = rg;
        ctx.fillRect(0, band.y - rMax, W, rMax * 2);
        ctx.restore();
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const started = performance.now();
    if (reduced) {
      draw(1, started);          // 모션을 원치 않으면 착지한 화면만
      setShowLine(true);
    } else {
      const frame = (now) => {
        draw(clamp01((now - started) / ANIM_MS), now);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    // 글자는 여명이 시작되는 순간 같이 들어온다 — 별이 잦아들면서 글이
    // 떠오르는 교대가 되게. LINE_IN_MS에 걸쳐 천천히 나타나고, 다 뜬 뒤엔
    // HOLD_MS만큼 그대로 머문다.
    const lineTimer = reduced ? null : setTimeout(() => setShowLine(true), ANIM_MS * 0.56);

    // 실제로 기다리는 대상: 폰트. 단, 아무리 늦어도 MAX_WAIT_MS에서 넘긴다.
    const fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready.catch(() => {})
      : Promise.resolve();
    const floor = new Promise((res) => setTimeout(res, reduced ? 1400 : ANIM_MS + HOLD_MS));
    const ceiling = new Promise((res) => setTimeout(res, MAX_WAIT_MS));

    let exitTimer = null;
    Promise.race([Promise.all([fontsReady, floor]), ceiling]).then(() => {
      setLeaving(true);
      exitTimer = setTimeout(onDone, FADE_MS);
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (lineTimer) clearTimeout(lineTimer);
      if (exitTimer) clearTimeout(exitTimer);
      window.removeEventListener('resize', resize);
    };
  }, [onDone]);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        inset: 0,
        // MUI Dialog(1300)보다 위 — 온보딩 모달을 덮어야 한다
        zIndex: 2000,
        background: COLOR.gradient,
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <Box component="canvas" ref={canvasRef} sx={{ position: 'absolute', inset: 0, display: 'block' }} />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 40px',
          textAlign: 'center',
          // 원래는 온보딩 본문(0.9rem)과 크기까지 똑같이 맞춰서, 스플래시가
          // 걷혀도 이 줄만은 제자리에 남아 있는 것처럼 보이게 했었다(세로 위치
          // 차이 1.8px). 지금은 문장을 더 크게 보여달라는 요청으로 1.15rem이라,
          // 그 "그대로 이어지는" 효과는 포기했다 — 대신 스플래시의 한 줄이
          // 자기 무게를 갖는 쪽을 택했다. 되돌리려면 0.9rem으로만 내리면 된다.
          fontFamily: FONT.sans,
          fontSize: '1.15rem',
          lineHeight: 1.8,
          color: COLOR.text.body,
          opacity: showLine ? 1 : 0,
          transform: showLine ? 'translateY(0)' : 'translateY(5px)',
          transition: `opacity ${LINE_IN_MS}ms ease-out, transform ${LINE_IN_MS}ms ease-out`,
        }}
      >
        {/* 온보딩과 같은 자리에서 줄을 나눠, 다음 화면으로 넘어갈 때 결이 이어지게 */}
        <span>
          매일 아침, 나에게 하고 싶은
          <br />말 한 문장을 적어보세요.
        </span>
      </Box>
    </Box>
  );
};

export default SplashScreen;
