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
  IconButton,
  Fade,
  Zoom
} from '@mui/material';
import { Close as CloseIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { styled, keyframes } from '@mui/material/styles';

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

// 애니메이션 정의
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const celebration = keyframes`
  0% { transform: scale(0) rotate(0deg); }
  50% { transform: scale(1.2) rotate(180deg); }
  100% { transform: scale(1) rotate(360deg); }
`;

const CelebrationIcon = styled(CheckCircleIcon)(({ theme }) => ({
  animation: `${celebration} 0.8s ease-in-out`,
  color: theme.palette.success.main,
  fontSize: '4rem',
}));

const OnboardingModal = ({ open, onClose, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // 모달이 열릴 때마다 첫 번째 스텝부터 시작
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setShowCelebration(false);
    }
  }, [open]);

  const steps = [
    {
      title: "안녕하세요, 소중한 분 🌸",
      content: "오늘 하루, 나에게 말해주세요. 괜찮아.",
      subtitle: "힘든 순간에도 당신은 충분히 소중한 존재예요",
      action: "함께 시작해볼까요?",
      emoji: "🤗"
    },
    {
      title: "작은 실천으로 나를 위로하기",
      content: "매일 하나씩, 나 자신을 다독이는 따뜻한 시간",
      subtitle: "30일 동안 나를 위한 작은 선물을 만들어가요",
      action: "실천해보기",
      emoji: "🌱→🌳"
    },
    {
      title: "오늘의 따뜻한 챌린지를 확인해보세요",
      content: "궁금한 점이 있으면 언제든 대화하기로",
      subtitle: "간단한 3개 메뉴로 구성된 단단이와 함께해요",
      action: "시작하기",
      emoji: "✨"
    }
  ];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // 온보딩 완료 시 축하 애니메이션 표시
      setShowCelebration(true);
      setTimeout(() => {
        onComplete();
      }, 2000); // 2초 후 완료 처리
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
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
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
          {showCelebration ? (
            <Fade in={showCelebration} timeout={500}>
              <Box>
                <CelebrationIcon />
                <Typography 
                  variant="h4" 
                  component="h2" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'success.main',
                    mb: 2,
                    animation: `${pulse} 1s ease-in-out infinite`
                  }}
                >
                  잘했어요! 🌸
                </Typography>
                <Typography 
                  variant="h6" 
                  component="h3" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'text.primary',
                    mb: 2
                  }}
                >
                  이제 나를 위한 따뜻한 시간을 시작해보세요
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
                  매일 작은 실천으로 나 자신을 위로하고, 감정적으로 단단해져가는 여정을 함께해요.
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    mb: 3
                  }}
                >
                  "오늘도 수고했어요. 당신은 충분히 소중한 존재예요."
                </Typography>
              </Box>
            </Fade>
          ) : (
            <>
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
            </>
          )}
        </StyledPaper>
      </DialogContent>

      {!showCelebration && (
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
      )}
    </StyledDialog>
  );
};

export default OnboardingModal;
