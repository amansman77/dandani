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
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  border: 'none',
  boxShadow: 'none',
}));

const OnboardingModal = ({ open, onClose, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);

  // 모달이 열릴 때마다 첫 번째 스텝부터 시작
  useEffect(() => {
    if (open) {
      setActiveStep(0);
    }
  }, [open]);

  const steps = [
    {
      title: "안녕! 나는 단단이야 🌱",
      content: "감정적으로 힘들 때 중심을 잃지 않게 도와줄게",
      subtitle: "상황이 나를 흔들더라도, 내가 중심을 잃지 않는 것",
      action: "함께 시작해볼까?",
      emoji: "🤗"
    },
    {
      title: "하루에 하나라도 해보자",
      content: "작은 실천이 모여 감정적으로 단단해지는 연습",
      subtitle: "30일 동안 매일 하나씩 이루어가는 경험",
      action: "실천해보기",
      emoji: "🌱→🌳"
    },
    {
      title: "오늘의 실천 과제를 확인해보세요",
      content: "궁금한 점이 있으면 대화하기 탭으로",
      subtitle: "4개의 탭으로 구성된 단단이와 함께해요",
      action: "시작하기",
      emoji: "✨"
    }
  ];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      onComplete();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStep = steps[activeStep];

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogContent sx={{ p: 0 }}>
        {/* 닫기 버튼 */}
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

        {/* 스텝 인디케이터 */}
        <Box sx={{ px: 3, pb: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel 
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontSize: '0.75rem',
                      color: index <= activeStep ? 'primary.main' : 'text.secondary'
                    }
                  }}
                >
                  {index === 0 ? '만남' : index === 1 ? '이해' : '시작'}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* 메인 콘텐츠 */}
        <StyledPaper elevation={0}>
          <Typography 
            variant="h4" 
            component="h2" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              color: 'primary.main',
              mb: 2
            }}
          >
            {currentStep.emoji}
          </Typography>
          
          <Typography 
            variant="h5" 
            component="h3" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              color: 'text.primary',
              mb: 2
            }}
          >
            {currentStep.title}
          </Typography>
          
          <Typography 
            variant="body1" 
            paragraph 
            sx={{ 
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: 'text.secondary',
              mb: 2
            }}
          >
            {currentStep.content}
          </Typography>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              fontStyle: 'italic',
              mb: 3
            }}
          >
            {currentStep.subtitle}
          </Typography>
        </StyledPaper>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
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
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={handleSkip}
              sx={{ 
                textTransform: 'none',
                color: 'text.secondary'
              }}
            >
              건너뛰기
            </Button>
            
            <Button
              onClick={handleNext}
              variant="contained"
              sx={{ 
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 'bold'
              }}
            >
              {activeStep === steps.length - 1 ? '시작하기' : '다음'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </StyledDialog>
  );
};

export default OnboardingModal;
