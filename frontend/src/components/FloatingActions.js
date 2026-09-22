import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';

// 오늘 탭에서 손 닿는 자리에 띄우는 버튼들. 문장이 길어지면 되새기기가 화면
// 아래로 밀려서, 스크롤과 무관하게 늘 같은 자리에 있어야 한다.
//
// 되새기기는 접지 않는다. 이 앱에서 유일하게 매일 하는 동작이라 한 번에
// 닿아야 하고, 한 탭 더 들어가면 매일 한 번씩 손해를 본다. 가끔 쓰는 것들
// (실천 남기기·공유)만 위쪽 버튼 하나에 접어두고, 누르면 펼쳐진다.
//
// 셋을 나란히 세우지 않은 이유는 예전에 한 번 확인했다 — 우측 하단에 물건이
// 셋이 되면 티커 카드를 가리고, 매일 쓰는 일과 가끔 쓰는 일이 같은 값이 된다.
// 접어두면 쉬고 있을 땐 동그라미 둘, 펼쳤을 때만 셋이 된다.

const SIZE = 52;
const SMALL = 46;
const GAP = 12;

const circleSx = {
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
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="2.6" />
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="18" cy="19" r="2.6" />
    <path d="M8.4 10.8l7.2-4.1M8.4 13.2l7.2 4.1" />
  </svg>
);

// 실천은 쓰는 일이다. 펜이어야 "두드리는 것"과 구별된다.
const PenIcon = ({ color }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.5 4.5l5 5L9 20H4v-5z" />
    <path d="M12.5 6.5l5 5" />
  </svg>
);

// 접힌 상태의 표시. 펼치면 같은 자리에서 닫기(×)로 바뀐다.
const MoreIcon = ({ color, open }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" aria-hidden="true"
    style={{ transition: 'transform .2s ease', transform: open ? 'rotate(45deg)' : 'none' }}>
    {open
      ? <><path d="M12 5v14" /><path d="M5 12h14" /></>
      : <><circle cx="5.5" cy="12" r="1.5" fill={color} stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
        <circle cx="18.5" cy="12" r="1.5" fill={color} stroke="none" /></>}
  </svg>
);

function ExpandedAction({ label, onClick, children, delay }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end',
      pointerEvents: 'auto', animation: `dandaniFabIn .18s ease ${delay}ms both`,
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
      {/* 아이콘만으로는 "실천 남기기"인지 "공유"인지 매번 기억해야 한다.
          펼쳤을 때만 보이는 글자라 평소 화면은 그대로 조용하다. */}
      <Box sx={{ fontFamily: FONT.sans, fontSize: '0.72rem', color: COLOR.text.body,
        background: COLOR.surface.sheet, border: `1px solid ${COLOR.line.faint}`,
        borderRadius: 999, padding: '5px 11px', whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(80,64,46,0.10)' }}>
        {label}
      </Box>
      <Box component="button" type="button" onClick={onClick} aria-label={label}
        sx={{ ...circleSx, width: SMALL, height: SMALL,
          background: COLOR.surface.sheet, borderColor: COLOR.accent.line,
          boxShadow: '0 3px 12px rgba(80,64,46,0.14)',
          '&:hover': { background: '#fff' } }}>
        {children}
      </Box>
    </Box>
  );
}

const FloatingActions = ({ done, logging, onLog, onViewHistory, onShare, onWritePractice }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // 펼쳐둔 채 다른 곳을 누르면 닫힌다. 화면을 덮는 레이어를 깔지 않는 건,
  // 덮으면 그 한 번의 탭이 "닫기"에만 쓰이고 누르려던 것에는 안 닿기 때문이다.
  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = action => () => { setOpen(false); action?.(); };

  return (
    <Box ref={rootRef}
      sx={{
        position: 'fixed',
        right: 18,
        // 문장 고르는 화면의 "직접 쓸래요"와 같은 높이 — 화면마다 떠 있는
        // 버튼이 제각각이면 그게 더 어수선하다.
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 62px)',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: `${GAP}px`,
        pointerEvents: 'none',
        '@keyframes dandaniFabIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'none' },
        },
      }}
    >
      {open && (
        <>
          <ExpandedAction label="실천 남기기" onClick={run(onWritePractice)} delay={0}>
            <PenIcon color={COLOR.accent.main} />
          </ExpandedAction>
          <ExpandedAction label="이 문장 공유하기" onClick={run(onShare)} delay={40}>
            <ShareIcon color={COLOR.accent.main} />
          </ExpandedAction>
        </>
      )}

      <Box
        component="button"
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label={open ? '닫기' : '실천 남기기, 공유하기'}
        sx={{
          ...circleSx, width: SIZE, height: SIZE,
          background: COLOR.surface.sheet,
          borderColor: open ? COLOR.accent.main : COLOR.accent.line,
          boxShadow: '0 3px 12px rgba(80,64,46,0.14)',
          '&:hover': { background: '#fff' },
        }}
      >
        <MoreIcon color={COLOR.accent.main} open={open} />
      </Box>

      {/* 되새기기는 접지 않는다. 오늘 할 일이 남아 있을 때만 색이 차 있고,
          되새긴 뒤엔 채움이 빠진다 — 아이콘만으로는 "오늘도 되새겼어요"라는
          말을 쓸 수 없어서 그 말을 색이 대신한다. 이때 위 버튼과 헷갈리지
          않도록 옅은 회색 선으로 둔다. */}
      <Box
        component="button"
        type="button"
        disabled={!done && logging}
        onClick={done ? onViewHistory : onLog}
        aria-label={done ? '오늘도 되새겼어요 — 기록 보기' : '오늘의 문장 되새기기'}
        sx={{
          ...circleSx, width: SIZE, height: SIZE,
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
};

export default FloatingActions;
