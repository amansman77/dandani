import React from 'react';
import { Box, Typography, Paper, Button, Fade, Divider } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import ChallengeContext from './ChallengeContext';
import YesterdayRecordSection from './YesterdayRecordSection';

const PracticeCard = styled(Paper)(({ theme }) => ({
  padding: '35px',
  marginTop: theme.spacing(4),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  backgroundColor: '#3f7198',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.15)',
  },
}));

const PracticeCardContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'cardHeight' && prop !== 'shouldAnimate' && prop !== 'isMeasuring',
})(({ cardHeight, shouldAnimate, isMeasuring }) => ({
  height: isMeasuring ? 'auto' : (cardHeight > 0 ? `${cardHeight}px` : '0px'),
  opacity: shouldAnimate ? 1 : (isMeasuring ? 1 : 0),
  overflow: shouldAnimate ? 'visible' : 'hidden',
  transition: shouldAnimate ? 'height 1.5s ease-out, opacity 0.4s ease-out' : 'height 0s, opacity 0s',
}));

const CompletedPaper = styled(Paper)(({ theme }) => ({
  padding: '25px 35px',
  marginTop: theme.spacing(4),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  backgroundColor: '#579f59',
  background: 'linear-gradient(135deg, #579f59, #7bb17d)',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0px 8px 30px rgba(87, 159, 89, 0.3)',
  },
}));

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const shine = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

const AnimatedButton = styled(Button)({
  animation: `${pulse} 2s ease-in-out infinite`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
    backgroundSize: '200% 100%',
    animation: `${shine} 3s ease-in-out infinite`,
    pointerEvents: 'none',
  },
  '& > *': {
    position: 'relative',
    zIndex: 1,
  },
});

const TodayPracticeSection = ({
  currentChallenge,
  userState,
  practice,
  hasDetailedRecord,
  yesterdayRecord,
  practiceCardRef,
  practiceCardInnerRef,
  practiceCardHeight,
  shouldAnimateCard,
  isMeasuringHeight,
  onOpenCompletionFlow,
  onOpenRecordModal,
  onViewCurrentChallenge,
  onCreateEnvelope,
  onViewEnvelopeList
}) => {
  return (
    <>
      <YesterdayRecordSection
        practiceDescription={yesterdayRecord?.practice_description}
        onContinueToday={() => practiceCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
      />

      {!practice?.isRecorded && practice && (
        <PracticeCardContainer
          ref={practiceCardRef}
          cardHeight={practiceCardHeight}
          shouldAnimate={shouldAnimateCard}
          isMeasuring={isMeasuringHeight}
        >
          <Box ref={practiceCardInnerRef}>
            <PracticeCard elevation={3}>
              <Typography variant="h6" color="primary.contrastText" gutterBottom sx={{
                fontSize: '2.2rem',
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'white',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                오늘의 추천 실천
              </Typography>
              <Divider
                sx={{
                  my: 3,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  borderWidth: '1px'
                }}
              />
              <Typography variant="body1" paragraph sx={{
                fontSize: '1.4rem',
                lineHeight: 1.6,
                color: 'white',
                textAlign: 'center',
                marginBottom: '25px'
              }}>
                {practice?.description}
              </Typography>

              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <AnimatedButton
                  variant="contained"
                  size="large"
                  onClick={onOpenCompletionFlow}
                  sx={{
                    borderRadius: '10px',
                    padding: '22px 44px',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    borderWidth: '3px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    minWidth: '160px',
                    margin: '5px',
                    textAlign: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    fontFamily: "'Noto Serif KR', serif",
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      borderColor: 'rgba(255, 255, 255, 0.7)',
                      animation: 'pulse 1s ease-in-out infinite',
                    }
                  }}
                >
                  실천 완료하기
                </AnimatedButton>
              </Box>
            </PracticeCard>
          </Box>
        </PracticeCardContainer>
      )}

      {!hasDetailedRecord && practice?.isRecorded && (
        <Fade in={practice?.isRecorded} timeout={2000}>
          <CompletedPaper elevation={3}>
            <Typography variant="h5" paragraph sx={{
              fontSize: '1.5rem',
              lineHeight: 1.5,
              textAlign: 'center',
              marginBottom: '20px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 1)',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              animation: 'fadeToGray 2s ease-in-out forwards',
              '@keyframes fadeToGray': {
                '0%': {
                  opacity: 1,
                  color: 'rgba(255, 255, 255, 1)'
                },
                '100%': {
                  opacity: 0.9,
                  color: 'rgba(255, 255, 255, 0.9)'
                }
              }
            }}>
              오늘의 실천을 완료했어요.
            </Typography>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <AnimatedButton
                variant="contained"
                size="large"
                onClick={onOpenRecordModal}
                sx={{
                  borderRadius: '10px',
                  padding: '22px 44px',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  borderWidth: '3px',
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  minWidth: '160px',
                  margin: '5px',
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontFamily: "'Noto Serif KR', serif",
                  boxSizing: 'border-box',
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    borderColor: 'rgba(255, 255, 255, 0.9)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.3)'
                  }
                }}
              >
                실천 기록하기
              </AnimatedButton>
            </Box>
          </CompletedPaper>
        </Fade>
      )}

      <Box sx={{ mt: 4 }} />

      <ChallengeContext
        challenge={currentChallenge}
        userState={userState}
        onViewCurrentChallenge={onViewCurrentChallenge}
        onCreateEnvelope={onCreateEnvelope}
        onViewEnvelopeList={onViewEnvelopeList}
      />
    </>
  );
};

export default TodayPracticeSection;
