import { Box, Typography } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { COLOR, FONT } from '../../theme/tokens';

const SERIF = FONT.serif;

export const Scene = styled(Box)(({ theme }) => ({
  position: 'relative',
  minHeight: 'min(62vh, 480px)',
  padding: theme.spacing(6, 4, 5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}));

export const Eyebrow = styled(Typography)({
  fontFamily: SERIF,
  fontStyle: 'italic',
  fontSize: '0.85rem',
  color: COLOR.accent.eyebrow,
  position: 'relative',
});

export const Phrase = styled(Typography)({
  fontFamily: SERIF,
  fontSize: '1.7rem',
  lineHeight: 1.75,
  letterSpacing: '0.01em',
  color: COLOR.text.primary,
  whiteSpace: 'pre-wrap',
  maxWidth: 230,
  marginLeft: 'auto',
  marginRight: 'auto',
  position: 'relative',
});

// 점 7개를 순서대로 훑고 지나가는 잔잔한 파도 — 한 번만 재생하고 끝나는 등장
// 애니메이션이 아니라 계속 반복되지만, 쉬지 않고 이어지면 어지럽다는 피드백을
// 받아서 파도가 지나간 뒤엔 한참 가만히 있다가 다시 훑도록 쉬는 구간을 크게 뒀다
// (전체 주기 6.4s 중 파도 자체는 앞쪽 10%뿐, 나머지 90%는 정지).
// index별 animationDelay는 렌더 쪽에서 준다.
const tickWave = keyframes`
  0% { transform: scaleY(1); }
  5% { transform: scaleY(1.35); }
  10%, 100% { transform: scaleY(1); }
`;

export const Tick = styled(Box, { shouldForwardProp: (prop) => prop !== 'filled' })(({ filled }) => ({
  width: 3,
  borderRadius: 2,
  height: filled ? 20 : 16,
  background: filled ? COLOR.accent.line : COLOR.line.main,
  transformOrigin: 'center',
  animation: `${tickWave} 6.4s ease-in-out infinite`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
}));

export const submitStyle = {
  position: 'relative', fontFamily: FONT.serif, fontSize: '0.95rem', fontWeight: 400,
  textTransform: 'none', color: COLOR.accent.main, borderBottom: `1px solid ${COLOR.accent.line}`,
  borderRadius: 0, padding: 0, minWidth: 'auto', minHeight: 'auto', lineHeight: 'normal',
  paddingBottom: '3px', '&:hover': { background: 'transparent', opacity: 0.75 },
  '&.Mui-disabled': { color: COLOR.line.disabled, borderColor: COLOR.line.disabledSoft },
};

export const logButtonStyle = logged => ({
  position: 'relative', fontFamily: FONT.serif, fontSize: '0.92rem', fontWeight: 400,
  textTransform: 'none', color: logged ? COLOR.text.muted : COLOR.accent.main,
  border: `1.4px solid ${logged ? COLOR.line.disabled : COLOR.accent.line}`,
  borderRadius: '999px', padding: '9px 24px', minWidth: 'auto', minHeight: 'auto', lineHeight: 'normal',
  '&:hover': { background: 'rgba(201,131,84,0.08)', border: `1.4px solid ${logged ? COLOR.line.disabled : COLOR.accent.line}` },
  '&.Mui-disabled': { color: COLOR.text.muted, border: `1.4px solid ${COLOR.line.disabled}` },
});
