import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Paper,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '20px',
    padding: theme.spacing(2),
    maxWidth: '500px',
    width: '100%',
  },
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  borderRadius: '16px',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #dfe8f5 100%)',
  border: 'none',
  boxShadow: 'none',
}));

const ONBOARDING_STEPS = [
  {
    title: '감정이 쉽게 흔들리는 날이 많다면',
    content: '하루 1분, 나와 닮은 이야기 하나를 읽어보세요\n\n단단이는\n다른 사람의 이야기 속 작은 실천으로\n나를 돌아보는 서비스입니다',
    checklist: [
      '감정이 쉽게 흔들릴 때가 있다면',
      '혼자 정리할 시간이 필요하다면',
      '하루를 돌아보고 싶다면'
    ],
    stepLabel: '무엇인가요?'
  },
  {
    title: '나와 닮은 이야기를 찾아보세요',
    content: '이야기 속 주인공이 실제로 해본\n작은 실천을 함께 해볼 수 있어요\n\n예:\n- 눈 감고 호흡만 5분간 세어보기\n- 오늘 하루 중 나만의 작은 의식 만들기\n- 지금 느낀 걸 한 줄로 남기기',
    stepLabel: '무엇을 하나요?'
  },
  {
    title: '실천 후 느낌을 남겨보세요',
    content: '짧게 느낌을 기록하면\n내 감정의 흐름이 내 피드에 쌓입니다\n\n지금 이야기 하나를 골라 시작해보세요',
    stepLabel: '무엇을 얻나요?'
  }
];

const OnboardingModal = ({ open, onClose, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveStep(0);
    }
  }, [open]);

  const handleNext = () => {
    if (activeStep === ONBOARDING_STEPS.length - 1) {
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

  const currentStep = ONBOARDING_STEPS[activeStep];

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton
            onClick={handleSkip}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'grey.100' }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          sx={{ textAlign: 'center', color: 'text.secondary', opacity: 0.8, px: 3, mb: 1 }}
        >
          감정적으로 힘들 때 중심을 잃지 않게 해주는 동반자
        </Typography>

        <Box sx={{ px: 3, pb: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {ONBOARDING_STEPS.map((step, index) => (
              <Step key={index}>
                <StepLabel
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontSize: '0.75rem',
                      color: index <= activeStep ? 'primary.main' : 'text.secondary'
                    }
                  }}
                >
                  {step.stepLabel}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <StyledPaper elevation={0}>
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: 'text.primary',
              mb: 2,
              whiteSpace: 'pre-line',
              lineHeight: 1.4
            }}
          >
            {currentStep.title}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              fontSize: '1.05rem',
              lineHeight: 1.7,
              color: 'text.secondary',
              whiteSpace: 'pre-line'
            }}
          >
            {currentStep.content}
          </Typography>

          {currentStep.checklist && currentStep.checklist.length > 0 && (
            <Box sx={{ mt: 3, textAlign: 'left' }}>
              {currentStep.checklist.map((item) => (
                <Typography
                  key={item}
                  variant="body2"
                  sx={{
                    mb: 0.8,
                    color: 'text.primary',
                    fontWeight: 500
                  }}
                >
                  {`✔ ${item}`}
                </Typography>
              ))}
            </Box>
          )}
        </StyledPaper>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, flexDirection: 'column', gap: 1.5 }}>
        <Button
          onClick={handleNext}
          variant="contained"
          fullWidth
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            py: 1,
            fontWeight: 'bold'
          }}
        >
          {activeStep === ONBOARDING_STEPS.length - 1 ? '지금 1분만 해보기' : '다음'}
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            sx={{
              textTransform: 'none',
              color: 'text.secondary'
            }}
          >
            이전
          </Button>

          <Button
            onClick={handleSkip}
            sx={{
              textTransform: 'none',
              color: 'text.secondary'
            }}
          >
            건너뛰기
          </Button>
        </Box>
      </DialogActions>
    </StyledDialog>
  );
};

export default OnboardingModal;
