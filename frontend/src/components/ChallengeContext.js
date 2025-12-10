import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

const ContextContainer = styled(Paper)(({ theme }) => ({
  padding: '30px',
  marginBottom: theme.spacing(3),
  borderRadius: '12px',
  backgroundColor: 'white',
  color: '#21211c',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  border: '3px solid #3f7198',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.15)',
  },
}));

const ProgressInfo = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: theme.spacing(1),
}));

// Progress Bar shimmer 애니메이션
const progressShimmer = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

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
        <Box sx={{ flex: 1 }}>
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #3f7198, #5a8bb0)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            marginBottom: '20px',
            boxShadow: '0px 3px 10px rgba(63, 113, 152, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            '&:hover': {
              transform: 'scale(1.02)',
              boxShadow: '0px 4px 15px rgba(63, 113, 152, 0.4)'
            }
          }}>
            <Typography sx={{ 
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'white',
              letterSpacing: '0.3px'
            }}>
              나의 챌린지
            </Typography>
          </Box>
          <Typography variant="subtitle1" sx={{
            fontSize: '1.4rem',
            fontWeight: 700,
            marginBottom: '15px',
            color: 'inherit'
          }}>
            {challenge.name}
          </Typography>
        </Box>
      </Box>
      
      <Typography variant="body2" sx={{ 
        fontSize: '1rem',
        marginBottom: '20px',
        color: 'inherit',
        opacity: 0.9
      }}>
        {challenge.description}
      </Typography>
      
      <Box sx={{ marginBottom: '20px' }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '10px' 
        }}>
          <Typography sx={{ 
            fontSize: '0.9rem', 
            fontWeight: 600, 
            color: 'inherit' 
          }}>
            진행률
          </Typography>
          <Typography sx={{ 
            fontSize: '0.9rem', 
            fontWeight: 700, 
            color: 'inherit' 
          }}>
            {challenge.progress_percentage || 0}%
          </Typography>
        </Box>
        <Box sx={{ 
          width: '100%', 
          height: '10px', 
          backgroundColor: 'rgba(0, 0, 0, 0.1)', 
          borderRadius: '10px', 
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
        }}>
          <Box sx={{ 
            height: '100%', 
            borderRadius: '10px', 
            background: 'linear-gradient(90deg, rgba(63, 113, 152, 0.8), rgba(90, 139, 176, 1), rgba(63, 113, 152, 0.8))',
            backgroundSize: '200% 100%',
            width: `${challenge.progress_percentage || 0}%`,
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: `${progressShimmer} 2.5s ease-in-out infinite`,
            boxShadow: '0 2px 8px rgba(63, 113, 152, 0.3)',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
              backgroundSize: '200% 100%',
              animation: `${progressShimmer} 2.5s ease-in-out infinite`,
              borderRadius: '10px',
            }
          }} />
        </Box>
      </Box>
      
      <ProgressInfo>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {challenge.current_day}일차 / {challenge.total_days}일
        </Typography>
      </ProgressInfo>
      
      {/* 버튼 영역 확장 */}
      <Box sx={{ 
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => onViewCurrentChallenge(challenge.id)}
          sx={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '12px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
            border: '2px solid',
            flex: 1,
            minWidth: '120px',
            color: '#3f7198',
            borderColor: '#3f7198',
            backgroundColor: 'rgba(63, 113, 152, 0.1)',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#3f7198',
              color: 'white',
              transform: 'translateY(-2px)'
            }
          }}
        >
          상세보기
        </Button>
        
        {/* 편지 만들기 버튼 */}
        <Button 
          variant="outlined" 
          size="small"
          onClick={handleCreateEnvelope}
          disabled={isCreatingEnvelope}
          sx={{ 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '12px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
            border: '2px solid',
            flex: 1,
            minWidth: '120px',
            color: '#579f59',
            borderColor: '#579f59',
            backgroundColor: 'rgba(87, 159, 89, 0.1)',
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#579f59',
              color: 'white',
              transform: 'translateY(-2px)'
            }
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.3s ease',
              border: '2px solid',
              flex: 1,
              minWidth: '120px',
              color: '#ee7c6f',
              borderColor: '#ee7c6f',
              backgroundColor: 'rgba(238, 124, 111, 0.1)',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#ee7c6f',
                color: 'white',
                transform: 'translateY(-2px)'
              }
            }}
          >
            편지 목록
          </Button>
        )}
      </Box>
    </ContextContainer>
  );
};

export default ChallengeContext;
