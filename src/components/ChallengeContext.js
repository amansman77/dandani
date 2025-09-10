import React, { useState } from 'react';
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

const ChallengeContext = ({ challenge, onViewCurrentChallenge, onCreateEnvelope, onViewEnvelopeList }) => {
  const [isCreatingEnvelope, setIsCreatingEnvelope] = useState(false);
  
  if (!challenge) return null;

  const handleCreateEnvelope = async () => {
    if (onCreateEnvelope) {
      setIsCreatingEnvelope(true);
      try {
        await onCreateEnvelope(challenge.id);
      } finally {
        setIsCreatingEnvelope(false);
      }
    }
  };

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
        {/* 편지 칩 추가 */}
        <Chip
          label="편지"
          size="small"
          sx={{
            backgroundColor: 'rgba(255,255,255,0.3)',
            color: 'inherit',
            fontWeight: 'bold',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.5)',
              transform: 'scale(1.05)'
            }
          }}
          onClick={handleCreateEnvelope}
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
            // 진행률 50% 이상 시 편지 힌트 표시
            ...(challenge.progress_percentage >= 50 && {
              background: 'linear-gradient(90deg, white 0%, #ffd700 100%)',
              '&::after': {
                content: '"✉"',
                position: 'absolute',
                right: '-10px',
                top: '-8px',
                fontSize: '12px'
              }
            })
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
      
      {/* 버튼 영역 확장 */}
      <Box sx={{ 
        mt: 2, 
        pt: 2, 
        borderTop: '1px solid rgba(255,255,255,0.2)',
        textAlign: 'center',
        display: 'flex',
        gap: 1,
        justifyContent: 'center'
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
          실천 목록 보기
        </Button>
        
        {/* 편지 만들기 버튼 */}
        <Button 
          variant="outlined" 
          size="small"
          onClick={handleCreateEnvelope}
          disabled={isCreatingEnvelope}
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
          {isCreatingEnvelope ? '생성 중...' : '나에게 편지쓰기'}
        </Button>
        
        {/* 편지 목록 보기 버튼 */}
        {onViewEnvelopeList && (
          <Button 
            variant="outlined" 
            size="small"
            onClick={onViewEnvelopeList}
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
            편지 목록
          </Button>
        )}
      </Box>
      
      {/* 챌린지 완료 시 편지 열람 유도 */}
      {challenge.progress_percentage === 100 && (
        <Box sx={{
          mt: 2,
          p: 2,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 1,
          textAlign: 'center'
        }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            챌린지 완료!
          </Typography>
          <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>
            과거의 나에게 보낸 편지가 열렸어요
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              // 편지 열람 로직 (향후 구현)
              alert('편지 열람 기능은 곧 추가될 예정입니다!');
            }}
            sx={{
              backgroundColor: 'white',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.9)',
                transform: 'scale(1.05)'
              }
            }}
          >
            편지 열어보기
          </Button>
        </Box>
      )}
    </ContextContainer>
  );
};

export default ChallengeContext;
