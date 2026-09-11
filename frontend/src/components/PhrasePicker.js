import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import Loader from './Loader';
import { fetchPhrasePool, metaLabel } from '../utils/phrasePool';

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

const PhrasePicker = ({ onPick, onWriteOwn }) => {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPhrasePool().then((pool) => { if (alive) setItems(pool); });
    return () => { alive = false; };
  }, []);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography
        sx={{
          fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.78rem',
          color: COLOR.accent.eyebrow, mb: 1.5,
        }}
      >
        오늘부터, 나에게
      </Typography>
      <Typography
        sx={{
          fontFamily: SERIF, fontWeight: 700, fontSize: '1.15rem', lineHeight: 1.55,
          color: COLOR.text.primary, textAlign: 'center', mb: 3,
        }}
      >
        다른 사람들은 이런 문장으로
        <br />아침을 열고 있어요
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
              onClick={() => onPick(it.phrase)}
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
              <Typography
                sx={{
                  fontFamily: SANS, fontSize: '0.66rem', mt: 0.5,
                  fontWeight: it.isRecommended ? 700 : 400,
                  color: it.isRecommended ? COLOR.accent.main : COLOR.text.muted,
                }}
              >
                {metaLabel(it)}
              </Typography>
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
            border: `1.4px solid ${COLOR.accent.line}`,
            borderRadius: 999,
            // 페이지 배경이 그라디언트라 스크롤 위치마다 뒤 색이 달라진다.
            // 폭 전체를 덮는 띠로 가리려 했더니 어느 지점에선 카드 글씨가 비쳐
            // 지저분했다. 알약 하나로 띄우면 뒤 색과 무관하게 늘 또렷하다.
            background: COLOR.surface.sheet,
            boxShadow: '0 4px 16px rgba(80,64,46,0.14)',
            cursor: 'pointer',
            fontFamily: SANS,
            fontSize: '0.82rem',
            fontWeight: 600,
            color: COLOR.accent.main,
            padding: '11px 22px',
            WebkitTapHighlightColor: 'transparent',
            '&:hover': { background: '#fff' },
          }}
        >
          내 문장을 직접 쓸래요
        </Box>
      </Box>
    </Box>
  );
};

export default PhrasePicker;
