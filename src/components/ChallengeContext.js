import React from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';

const ContextContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(2),
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
  border: `1px solid ${theme.palette.primary.main}`,
}));

const ProgressInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: theme.spacing(1),
}));

const ChallengeContext = ({ challenge, onViewCurrentChallenge }) => {
  if (!challenge) return null;

  return (
    <ContextContainer elevation={1}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <PlayCircleIcon sx={{ fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight="bold">
          {challenge.name}
        </Typography>
        <Chip 
          label={`${challenge.current_day}일차`}
          size="small"
          sx={{ 
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'inherit',
            fontWeight: 'bold'
          }}
        />
      </Box>
      
      <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
        {challenge.description}
      </Typography>
      
      <LinearProgress 
        variant="determinate" 
        value={challenge.progress_percentage || 0}
        sx={{ 
          height: 6, 
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.3)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
            backgroundColor: 'white',
          }
        }}
      />
      
      <ProgressInfo>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {challenge.current_day}일차 / {challenge.total_days}일
        </Typography>
        <Typography variant="caption" fontWeight="bold">
          {challenge.progress_percentage}% 완료
        </Typography>
      </ProgressInfo>
      
      {/* 현재 챌린지 실천 목록 보기 버튼 */}
      <Box sx={{ 
        mt: 2, 
        pt: 2, 
        borderTop: '1px solid rgba(255,255,255,0.2)',
        textAlign: 'center' 
      }}>
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => onViewCurrentChallenge(challenge.id)}
          sx={{ 
            textTransform: 'none',
            color: 'white',
            borderColor: 'rgba(255,255,255,0.4)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            fontSize: '0.75rem',
            padding: '6px 16px',
            borderRadius: '16px',
            fontWeight: 500,
            '&:hover': {
              borderColor: 'white',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              transform: 'translateY(-1px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          📝 실천 목록 보기
        </Button>
      </Box>
    </ContextContainer>
  );
};

export default ChallengeContext;
