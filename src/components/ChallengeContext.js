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
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[2],
  position: 'relative',
  overflow: 'hidden',
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
        <Box sx={{ flex: 1 }}>
          <Box sx={{
            backgroundColor: 'primary.light',
            color: 'white',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            mb: 1,
            display: 'inline-block'
          }}>
            <Typography variant="body2" sx={{ 
              fontWeight: 600,
              fontSize: '0.875rem'
            }}>
              9월 진행중인 실천
            </Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {challenge.name}
          </Typography>
        </Box>
        <Chip 
          label={`${challenge.current_day}일차`}
          size="small"
          sx={{ 
            backgroundColor: 'success.main',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.75rem'
          }}
        />
        {/* 편지 칩 추가 */}
        <Chip
          label="편지"
          size="small"
          sx={{
            backgroundColor: 'warning.main',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'warning.dark',
              transform: 'scale(1.05)'
            },
            transition: 'all 0.2s ease-in-out'
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
          height: 8, 
          borderRadius: 4,
          backgroundColor: 'divider',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            backgroundColor: 'success.main',
            // 진행률 50% 이상 시 편지 힌트 표시
            ...(challenge.progress_percentage >= 50 && {
              background: 'linear-gradient(90deg, success.main 0%, warning.main 100%)',
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
        borderTop: '1px solid',
        borderColor: 'divider',
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
            color: 'secondary.main', // 메인 레드
            borderColor: 'secondary.main',
            backgroundColor: 'transparent',
            fontSize: '0.75rem',
            padding: '8px 16px',
            borderRadius: 2,
            fontWeight: 600,
            '&:hover': {
              borderColor: 'secondary.dark',
              backgroundColor: 'secondary.main',
              color: 'white',
              transform: 'translateY(-1px)',
              boxShadow: theme => theme.shadows[2]
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
            color: 'warning.main', // 서브 핑크
            borderColor: 'warning.main',
            backgroundColor: 'transparent',
            fontSize: '0.75rem',
            padding: '8px 16px',
            borderRadius: 2,
            fontWeight: 600,
            '&:hover': {
              borderColor: 'warning.dark',
              backgroundColor: 'warning.main',
              color: 'white',
              transform: 'translateY(-1px)',
              boxShadow: theme => theme.shadows[2]
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
              color: 'info.main', // 서브 그레이
              borderColor: 'info.main',
              backgroundColor: 'transparent',
              fontSize: '0.75rem',
              padding: '8px 16px',
              borderRadius: 2,
              fontWeight: 600,
              '&:hover': {
                borderColor: 'info.dark',
                backgroundColor: 'info.main',
                color: 'white',
                transform: 'translateY(-1px)',
                boxShadow: theme => theme.shadows[2]
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
          mt: 3,
          p: 3,
          backgroundColor: 'success.light',
          borderRadius: 2,
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'success.main'
        }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            챌린지 완료!
          </Typography>
          <Typography variant="caption" sx={{ mb: 2, display: 'block', color: 'text.secondary' }}>
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
              backgroundColor: 'success.main',
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              '&:hover': {
                backgroundColor: 'success.dark',
                transform: 'translateY(-1px)',
                boxShadow: theme => theme.shadows[2]
              },
              transition: 'all 0.2s ease-in-out'
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
