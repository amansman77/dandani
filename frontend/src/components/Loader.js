import React from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@emotion/react';
import { COLOR } from '../theme/tokens';

// 기다리는 표시. 예전엔 MUI 기본 스피너(도는 원)를 그대로 썼는데, 종이와 빛으로
// 된 화면에서 그것만 재질이 달랐다.
//
// 스플래시의 "빛이 번진다"를 선 하나로 줄인 모양이다. 앱에서 가장 강한 인상을
// 이미 가진 문법이라 새 기호를 만들 필요가 없다. 되새김 눈금을 빌려오는 안도
// 있었지만, 그건 "며칠 이어왔다"는 뜻이 이미 붙은 기호라 "기다려라"로 겹쳐
// 쓰면 뜻이 두 개가 된다(되새김 화면엔 진짜 눈금이 바로 아래 있다).
//
// 빛은 왕복하지 않고 한 방향으로만 흐른다. 왕복하면 되돌아오는 순간이 "멈췄다"로
// 보여서, 느린 네트워크에서 오히려 불안해진다.

const sweep = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
`;

// accent.line(#c98354)의 rgb. 그라디언트 양끝을 투명하게 빼야 해서 rgba가 필요하다.
const GLOW = '201, 131, 84';

const Loader = ({ small = false, sx }) => (
  <Box
    role="status"
    aria-label="불러오는 중"
    sx={{
      position: 'relative',
      width: small ? 76 : 150,
      height: 2,
      borderRadius: '2px',
      background: COLOR.line.faint,
      overflow: 'hidden',
      ...sx,
    }}
  >
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        borderRadius: '2px',
        background: `linear-gradient(90deg,
          transparent 0%,
          rgba(${GLOW}, 0.15) 28%,
          ${COLOR.accent.line} 50%,
          rgba(${GLOW}, 0.15) 72%,
          transparent 100%)`,
        animation: `${sweep} 1.55s cubic-bezier(.45, 0, .35, 1) infinite`,
        // 동작 줄이기를 켠 기기에선 흐르지 않고, 빛이 가운데 머문 상태로 둔다.
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          transform: 'none',
          opacity: 0.55,
        },
      }}
    />
  </Box>
);

export default Loader;
