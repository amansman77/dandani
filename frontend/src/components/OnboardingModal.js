import React, { useState, useEffect } from 'react';
import { Dialog, Box, Typography } from '@mui/material';

const SERIF = '"Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important';
const SANS = '-apple-system, "system-ui", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important';

const ONBOARDING_STEPS = [
  {
    stepLabel: '무엇인가요?',
    heading: (
      <>감정이 쉽게<br />흔들리는 날이 많다면</>
    ),
    body: (
      <>
        매일 아침, 나에게 하고 싶은
        <br />말 한 문장을 적어보세요.
        <br /><br />
        단단이는 그 한 문장을
        <br /><b>매일 되새기는 아주 작은 의식</b>입니다.
      </>
    ),
  },
  {
    stepLabel: '무엇을 하나요?',
    heading: (
      <>아침마다,<br />문장 하나를 되새겨요</>
    ),
    body: (
      <>
        적어둔 문장을 매일 아침 다시 읽고
        <br />눈금을 하나씩 채워가요.
        <br /><br />
        <b>거창한 목표가 아니라,</b>
        <br />하루의 작은 다짐이에요.
      </>
    ),
  },
  {
    stepLabel: '무엇을 얻나요?',
    heading: (
      <>쌓인 아침들이,<br />기록이 됩니다</>
    ),
    body: (
      <>
        기록 탭에서 내가 되새겨온
        <br />문장들을 돌아볼 수 있어요.
        <br /><br />
        <b>문장이 바뀌어도,</b>
        <br />되새긴 시간은 남아요.
      </>
    ),
  },
];

const OnboardingModal = ({ open, onClose, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveStep(0);
    }
  }, [open]);

  const isLast = activeStep === ONBOARDING_STEPS.length - 1;
  const currentStep = ONBOARDING_STEPS[activeStep];

  const handleNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSkip = () => {
    onComplete();
  };

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
          background: 'linear-gradient(180deg, #eef2f4 0%, #f3ece2 55%, #f8f1e6 100%)',
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            {ONBOARDING_STEPS.map((step, i) => (
              <Box
                key={step.stepLabel}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: i <= activeStep ? '#c98354' : '#ddceb9',
                }}
              />
            ))}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={handleSkip}
            sx={{
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: SERIF,
              fontSize: '0.7rem',
              color: '#a39a89',
            }}
          >
            건너뛰기
          </Box>
        </Box>

        <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 4 }}>
          <Typography sx={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.85rem', color: '#a9764f', mb: 2 }}>
            {currentStep.stepLabel}
          </Typography>
          <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.5, color: '#322f29', mb: 2.5 }}>
            {currentStep.heading}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: '0.9rem',
              lineHeight: 1.85,
              color: '#6b6355',
              maxWidth: 280,
              '& b': { color: '#322f29', fontWeight: 600 },
            }}
          >
            {currentStep.body}
          </Typography>
        </Box>

        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, px: 4, pb: 5 }}>
          <Box
            component="button"
            type="button"
            onClick={handleNext}
            sx={{
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: SERIF,
              fontSize: '0.95rem',
              color: '#a9603a',
              borderBottom: '1px solid #c98354',
              paddingBottom: '3px',
              '&:hover': { opacity: 0.75 },
            }}
          >
            {isLast ? '지금 첫 문장 적으러 가기' : '다음'}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={handleBack}
            sx={{
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: activeStep === 0 ? 'default' : 'pointer',
              fontFamily: SANS,
              fontSize: '0.72rem',
              color: '#a39a89',
              visibility: activeStep === 0 ? 'hidden' : 'visible',
            }}
          >
            이전
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

export default OnboardingModal;
