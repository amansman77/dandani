import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
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

const ChallengeCelebrationCard = ({
  currentChallenge,
  onChallengeCompletion,
  onViewCurrentChallenge
}) => {
  return (
    <StyledPaper elevation={3} sx={{
      backgroundColor: '#579f59',
      background: 'linear-gradient(135deg, #579f59, #7bb17d)',
    }}>
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h4" sx={{
          fontSize: '2.5rem',
          fontWeight: 700,
          color: 'white',
          marginBottom: '20px',
          fontFamily: "'Noto Serif KR', serif"
        }}>
          🎉 축하합니다!
        </Typography>
        <Typography variant="h5" sx={{
          fontSize: '1.8rem',
          fontWeight: 600,
          color: 'white',
          marginBottom: '15px',
          opacity: 0.95
        }}>
          {currentChallenge?.name} 완료
        </Typography>
        <Typography variant="body1" sx={{
          fontSize: '1.2rem',
          color: 'white',
          marginBottom: '30px',
          opacity: 0.9,
          lineHeight: 1.6
        }}>
          {currentChallenge?.total_days}일 동안의 여정을 완주하셨습니다.<br />
          작은 실천이 모여 큰 변화를 만들었어요.
        </Typography>

        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          alignItems: 'center',
          mt: 4
        }}>
          <Button
            variant="contained"
            size="large"
            onClick={onChallengeCompletion}
            sx={{
              borderRadius: '10px',
              padding: '18px 40px',
              fontSize: '1.3rem',
              fontWeight: 700,
              textTransform: 'none',
              color: '#579f59',
              backgroundColor: 'white',
              minWidth: '200px',
              boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                transform: 'translateY(-2px)',
                boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.3)'
              }
            }}
          >
            새 챌린지 시작하기
          </Button>

          <Button
            variant="outlined"
            size="medium"
            onClick={() => onViewCurrentChallenge(currentChallenge?.id)}
            sx={{
              borderRadius: '8px',
              padding: '12px 30px',
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.7)',
              borderWidth: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'white'
              }
            }}
          >
            완료한 챌린지 보기
          </Button>
        </Box>
      </Box>
    </StyledPaper>
  );
};

export default ChallengeCelebrationCard;
