import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import Loader from './Loader';
import { fetchPhrasePool, metaLabel } from '../utils/phrasePool';
import { logPhraseListSeen, logPhraseListEngaged } from '../utils/analytics';

const SANS = FONT.sans;
const SERIF = FONT.serif;

// 처음 온 사람에게 빈 칸부터 내밀지 않는다.
//
// 어제 들어온 방문자 둘 다 온보딩까지만 보고 나갔고 문장을 쓴 사람은 0명이었다.
// 막힌 지점이 "쓸 말이 안 떠오른다"라면 고칠 것은 입구의 크기가 아니라 첫 화면이
// 요구하는 행동 자체다 — 그래서 "쓰기" 대신 "고르기"를 기본으로 둔다.
//
// 다만 이 앱의 전제는 "나에게 하고 싶은 말"이라, 남의 문장을 그대로 쓰면 내 것이라는
// 감각이 옅어진다. 그래서 고르면 곧바로 시작하지 않고 그 문장을 입력칸에 담아
// 고쳐 쓸 수 있는 화면으로 넘긴다. 고르기는 대신이 아니라 출발점이다.

const cardSx = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: `1px solid ${COLOR.line.soft}`,
  background: 'rgba(255,255,255,0.82)',
  borderRadius: '12px',
  padding: '12px 14px',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  transition: 'border-color .18s ease, background .18s ease',
  '&:hover': { borderColor: COLOR.accent.line, background: 'rgba(255,255,255,0.95)' },
};

// 목록이 화면에 떠 있었다고 인정하는 최소 시간. 광고를 누르고 로딩 중에
// 나가버린 사람과, 실제로 목록을 마주한 사람을 가르는 선이다.
const SEEN_MS = 1500;

const PhrasePicker = ({ onPick, onWriteOwn }) => {
  const [items, setItems] = useState(null);
  const seenRef = useRef(false);
  const engagedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchPhrasePool().then((pool) => { if (alive) setItems(pool); });
    return () => { alive = false; };
  }, []);

  // "떴다"가 아니라 "봤다". 목록이 그려진 뒤 탭이 실제로 앞에 있는 채로
  // SEEN_MS를 버텨야 인정한다. 중간에 나가거나 탭을 가리면 안 찍힌다 —
  // 그 부재가 "보기도 전에 떠났다"는 신호다.
  const shownAtRef = useRef(null);
  const markSeen = () => {
    if (seenRef.current) return;
    seenRef.current = true;
    logPhraseListSeen(shownAtRef.current ? Date.now() - shownAtRef.current : 0);
  };

  useEffect(() => {
    if (!items || seenRef.current) return undefined;
    shownAtRef.current = Date.now();
    const timer = setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      markSeen();
    }, SEEN_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // 스크롤은 "훑어봤다"는 가장 싼 증거다. 한 번만 남긴다.
  useEffect(() => {
    if (!items) return undefined;
    const onScroll = () => {
      if (engagedRef.current || window.scrollY < 40) return;
      engagedRef.current = true;
      // 스크롤했다는 건 당연히 본 것이다. SEEN_MS를 못 채웠어도 인정한다.
      markSeen();
      logPhraseListEngaged('scroll');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [items]);

  const handlePick = (text) => {
    if (!engagedRef.current) {
      engagedRef.current = true;
      // 빨리 고른 사람은 SEEN_MS를 채우기 전에 화면을 떠난다. 그때 seen을
      // 안 남기면, 가장 잘 반응한 사람이 "보지도 않고 나갔다"로 집계된다.
      // 골랐다는 건 본 것이다.
      markSeen();
      logPhraseListEngaged('tap');
    }
    onPick(text);
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography
        sx={{
          fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.78rem',
          color: COLOR.accent.eyebrow, mb: 1.5,
        }}
      >
        첫 엽서, 나에게
      </Typography>
      {/* 예전엔 "다른 사람들은 이런 문장으로 아침을 열고 있어요"였는데, 그건
          상황 설명이지 할 일이 아니다. 처음 온 사람이 이 화면에서 무엇을 해야
          하는지가 제목에 있어야 한다. */}
      <Typography
        sx={{
          fontFamily: SERIF, fontWeight: 700, fontSize: '1.15rem', lineHeight: 1.55,
          color: COLOR.text.primary, textAlign: 'center', mb: 1.25,
        }}
      >
        첫 엽서에 담을
        <br />문장 하나를 골라보세요
      </Typography>
      <Typography
        sx={{
          fontFamily: SANS, fontSize: '0.74rem', lineHeight: 1.65,
          color: COLOR.text.muted, textAlign: 'center', mb: 3,
        }}
      >
        처음 받은 10 누브로 엽서를 만들 수 있어요.
        <br />마음에 드는 문장을 고르거나 직접 써보세요.
      </Typography>

      {items === null ? (
        <Box sx={{ py: 5 }}><Loader /></Box>
      ) : (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.25, pb: 9 }}>
          {items.map((it, i) => (
            <Box
              key={`${it.phrase}-${i}`}
              component="button"
              type="button"
              onClick={() => handlePick(it.phrase)}
              sx={cardSx}
            >
              <Typography
                sx={{
                  fontFamily: SERIF, fontWeight: 700, fontSize: '0.88rem',
                  lineHeight: 1.5, color: COLOR.text.primary,
                }}
              >
                “{it.phrase}”
              </Typography>
              {/* 카드가 눌린다는 단서가 cursor:pointer와 :hover뿐이었는데, 폰엔
                  hover가 없다. 그래서 카드는 "읽는 것"으로만 보였다. 카드마다
                  액션을 글자로 박아둔다 — 37개에 버튼을 다 넣으면 시끄러워서,
                  같은 뜻을 가장 가벼운 형태로 둔다. */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mt: 0.5 }}>
                <Typography
                  sx={{
                    fontFamily: SANS, fontSize: '0.66rem',
                    fontWeight: it.isRecommended ? 700 : 400,
                    color: it.isRecommended ? COLOR.accent.main : COLOR.text.muted,
                  }}
                >
                  {metaLabel(it)}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SANS, fontSize: '0.66rem', fontWeight: 700,
                    color: COLOR.accent.main, whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  엽서에 담기 ›
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* 쓰러 온 사람에게 한 단계가 늘어나는 게 이 안의 유일한 손해다. 그래서 이
          입구는 목록 끝이 아니라 화면에 붙어 있어야 한다 — 처음엔 목록 맨 아래에
          뒀는데, 문장이 34개라 거기까지 스크롤해야 보였다. 그건 "항상 곁에"가
          아니라 그냥 숨긴 것이다.
          처음엔 sticky로 했는데 그건 "화면 밖으로 나가지 않게" 붙잡아둘 뿐이라,
          3000px 아래에 있는 요소를 화면 안으로 끌어오지는 못한다(측정으로 확인).
          fixed로 하단 탭 위에 띄우고, 목록이 그 아래로 흘러들어가게 그라디언트를
          깐다. */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 62px)',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={onWriteOwn}
          sx={{
            pointerEvents: 'auto',
            // 예전엔 액션색 테두리 + 그림자여서, 화면에서 가장 눈에 띄는 물건이
            // 이것이었다. 정작 눌러야 할 카드는 밋밋했고. 위계가 뒤집혀 있었다.
            // 여기선 "원하는 게 없을 때의 길"이므로 조용해야 한다.
            border: `1px solid ${COLOR.line.main}`,
            borderRadius: 999,
            // 페이지 배경이 그라디언트라 스크롤 위치마다 뒤 색이 달라진다.
            // 폭 전체를 덮는 띠로 가리려 했더니 어느 지점에선 카드 글씨가 비쳐
            // 지저분했다. 알약 하나로 띄우면 뒤 색과 무관하게 늘 또렷하다.
            background: COLOR.surface.sheet,
            boxShadow: '0 2px 10px rgba(80,64,46,0.10)',
            cursor: 'pointer',
            fontFamily: SANS,
            fontSize: '0.78rem',
            fontWeight: 500,
            color: COLOR.text.muted,
            padding: '10px 18px',
            WebkitTapHighlightColor: 'transparent',
            '&:hover': { background: '#fff', color: COLOR.accent.main },
          }}
        >
          내 엽서 문장은 직접 쓸래요
        </Box>
      </Box>
    </Box>
  );
};

export default PhrasePicker;
