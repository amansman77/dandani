import React from 'react';
import { Dialog, Box, Typography } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';

const SERIF = FONT.serif;
const SANS = FONT.sans;

// 예전엔 "처음 만난 선물로 10 누브를 드려요"로 시작했다. 누브가 되새긴 날의
// 수가 된 뒤로 그 선물은 살지 않은 열흘을 주는 일이 돼서 없앴고, 첫 화면도
// 받는 이야기에서 쌓는 이야기로 바꿨다. 줄 것이 없어진 자리에 남는 건
// "매일 오면 쌓인다"는 약속 하나뿐이고, 그게 이 앱이 실제로 하는 일이다.
const ONBOARDING_CONTENT = {
  stepLabel: '첫 아침',
  heading: (
    <>매일 되새기면<br />하루가 하나씩 쌓여요</>
  ),
  body: (
    <>
      문장 하나를 고르거나 직접 쓰고,
      <br />아침마다 다시 읽어보세요.
      <br /><br />
      되새긴 하루는 <b>1 누브</b>로 남고,
      <br /><b>10 누브</b>가 쌓이면 엽서를 만들 수 있어요.
    </>
  ),
};

const OnboardingModal = ({ open, onClose, onComplete }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      disableEscapeKeyDown
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
      PaperProps={{
        sx: {
          background: COLOR.gradient,
          boxShadow: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', minHeight: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            position: 'absolute',
            top: '-15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,225,190,0.55) 0%, rgba(255,225,190,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, pt: 3 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: COLOR.accent.line,
            }}
          />
          <Box
            component="button"
            type="button"
            onClick={onComplete}
            sx={{
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: SANS,
              fontSize: '0.72rem',
              color: COLOR.text.faint,
            }}
          >
            건너뛰기
          </Box>
        </Box>

        <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 4 }}>
          <Typography sx={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.85rem', color: COLOR.accent.eyebrow, mb: 2 }}>
            {ONBOARDING_CONTENT.stepLabel}
          </Typography>
          <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.5, color: COLOR.text.primary, mb: 2.5 }}>
            {ONBOARDING_CONTENT.heading}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: '0.9rem',
              lineHeight: 1.85,
              color: COLOR.text.body,
              maxWidth: 280,
              '& b': { color: COLOR.text.primary, fontWeight: 600 },
            }}
          >
            {ONBOARDING_CONTENT.body}
          </Typography>
        </Box>

        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, px: 4, pb: 5 }}>
          <Box
            component="button"
            type="button"
            onClick={onComplete}
            sx={{
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: SERIF,
              fontSize: '0.95rem',
              color: COLOR.accent.main,
              borderBottom: `1px solid ${COLOR.accent.line}`,
              paddingBottom: '3px',
              '&:hover': { opacity: 0.75 },
            }}
          >
            첫 문장 고르기
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default OnboardingModal;
