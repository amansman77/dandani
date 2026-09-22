import React from 'react';
import { Box } from '@mui/material';
import { COLOR } from '../theme/tokens';

// 오늘 탭에서 매일 쓰는 두 가지만 손 닿는 자리에 띄운다. 문장이 길어지면
// 되새기기 버튼이 화면 아래로 밀려서, 스크롤과 무관하게 늘 같은 자리에 있어야
// 한다. 편집(문장 바꾸기)은 아주 가끔 쓰는 일이라 헤더에 남겼다 — 가끔 쓰는 건
// 위에, 매일 쓰는 건 아래에.
//
// 두 버튼은 크기·모양·테두리 두께가 같다. 처음엔 되새기기를 더 크고 꽉 채워서
// 위계를 주려 했는데, 같은 화면에 같은 성격의 물건이 둘인데 크기가 다르면
// 디자인이 깨져 보인다는 지적이 맞았다. 대신 위계는 "색이 채워졌는가" 하나로만
// 준다 — 오늘 할 일이 남았을 때만 되새기기가 채워져 있다.
//
// 되새긴 뒤엔 채움이 빠진다. 아이콘만으로는 "오늘도 되새겼어요"라는 말을 쓸 수
// 없어서, 그 말을 색이 대신한다. 이때 공유와 헷갈리지 않도록 되새기기는 옅은
// 회색 선으로, 공유는 액션색 선으로 둔다(아이콘도 다르다).

const SIZE = 52;
const GAP = 12;

const baseSx = {
  width: SIZE,
  height: SIZE,
  borderRadius: '50%',
  border: '1.4px solid',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  pointerEvents: 'auto',
  WebkitTapHighlightColor: 'transparent',
  transition: 'background-color .2s ease, border-color .2s ease',
  '&:disabled': { cursor: 'default' },
};

const CheckIcon = ({ color }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

const ShareIcon = ({ color }) => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="2.6" />
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="18" cy="19" r="2.6" />
    <path d="M8.4 10.8l7.2-4.1M8.4 13.2l7.2 4.1" />
  </svg>
);

const FloatingActions = ({ done, logging, onLog, onViewHistory, onShare }) => (
  <Box
    sx={{
      position: 'fixed',
      right: 18,
      // 문장 고르는 화면의 "직접 쓸래요"와 같은 높이에 맞춘다 — 화면마다 떠 있는
      // 버튼이 제각각이면 그게 더 어수선하다.
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 62px)',
      zIndex: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: `${GAP}px`,
      pointerEvents: 'none',
    }}
  >
    <Box
      component="button"
      type="button"
      onClick={onShare}
      aria-label="이 문장 공유하기"
      sx={{
        ...baseSx,
        background: COLOR.surface.sheet,
        borderColor: COLOR.accent.line,
        boxShadow: '0 3px 12px rgba(80,64,46,0.14)',
        '&:hover': { background: '#fff' },
      }}
    >
      <ShareIcon color={COLOR.accent.main} />
    </Box>

    <Box
      component="button"
      type="button"
      disabled={!done && logging}
      onClick={done ? onViewHistory : onLog}
      aria-label={done ? '오늘도 되새겼어요 — 기록 보기' : '오늘의 문장 되새기기'}
      sx={{
        ...baseSx,
        background: done ? COLOR.surface.sheet : COLOR.accent.main,
        borderColor: done ? COLOR.line.main : COLOR.accent.main,
        boxShadow: done ? '0 3px 12px rgba(80,64,46,0.10)' : '0 6px 18px rgba(80,64,46,0.28)',
        opacity: !done && logging ? 0.6 : 1,
        '&:hover': { background: done ? '#fff' : COLOR.accent.strong },
      }}
    >
      <CheckIcon color={done ? COLOR.text.faint : '#ffffff'} />
    </Box>
  </Box>
);

export default FloatingActions;
