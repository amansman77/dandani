import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TodayIcon from '@mui/icons-material/Today';
import PracticeRecordModal from './PracticeRecordModal';
import { getUserId } from '../utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const DetailContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 800,
  margin: '0 auto',
}));

const HeaderContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(2),
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
  border: `1px solid ${theme.palette.primary.main}`,
}));

const PracticeItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'completed' && prop !== 'isToday'
})(({ theme, completed, isToday }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  borderRadius: theme.spacing(1),
  backgroundColor: isToday 
    ? theme.palette.primary[50] 
    : completed 
      ? theme.palette.success[50] 
      : theme.palette.background.paper,
  border: isToday 
    ? `2px solid ${theme.palette.primary.main}` 
    : `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: isToday 
      ? theme.palette.primary[100] 
      : completed 
        ? theme.palette.success[100] 
        : theme.palette.action.hover,
  }
}));

const ChallengeDetail = ({ challengeId, onBack }) => {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 기록 모달 관련 상태
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedPractice, setSelectedPractice] = useState(null);

  useEffect(() => {
    fetchChallengeDetail();
  }, [challengeId]);

  const fetchChallengeDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = getUserId();
      
      // 챌린지 상세 정보와 사용자의 실천 기록을 함께 가져오기
      const [challengeResponse, feedbackResponse] = await Promise.allSettled([
        fetch(`${API_URL}/api/challenges/${challengeId}`, {
          headers: {
            'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            'X-Client-Time': new Date().toISOString(),
            'X-User-ID': userId
          }
        }),
        fetch(`${API_URL}/api/feedback/history?challengeId=${challengeId}`, {
          headers: {
            'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            'X-Client-Time': new Date().toISOString(),
            'X-User-ID': userId
          }
        })
      ]);

      if (challengeResponse.status === 'rejected' || !challengeResponse.value.ok) {
        throw new Error(`Failed to fetch challenge detail: ${challengeResponse.value?.status || 'Network error'}`);
      }

      const challengeData = await challengeResponse.value.json();
      
      console.log('Challenge detail data:', challengeData);
      
      // 사용자의 실천 기록이 있으면 완료 상태 업데이트
      if (feedbackResponse.status === 'fulfilled' && feedbackResponse.value.ok) {
        const feedbackData = await feedbackResponse.value.json();
        const completedDays = new Set(feedbackData.map(feedback => feedback.practice_day));
        
        console.log('User feedback data:', feedbackData);
        console.log('Completed days:', Array.from(completedDays));
        
        // 실천 과제에 완료 상태 추가
        challengeData.practices = challengeData.practices.map(practice => ({
          ...practice,
          completed: completedDays.has(practice.day)
        }));
        
        // 진행률 재계산
        const completedCount = completedDays.size;
        challengeData.progress_percentage = Math.round((completedCount / challengeData.total_days) * 100);
        challengeData.completed_days = completedCount;
      }

      setChallenge(challengeData);
    } catch (err) {
      console.error('Failed to fetch challenge detail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (practice) => {
    if (practice.is_today) {
      return <TodayIcon color="primary" />;
    }
    if (practice.completed) {
      return <CheckCircleIcon color="success" />;
    }
    return <RadioButtonUncheckedIcon color="disabled" />;
  };

  const getStatusText = () => {
    switch (challenge?.status) {
      case 'current':
        return '진행중';
      case 'completed':
        return '완료';
      case 'upcoming':
        return '예정';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (challenge?.status) {
      case 'current':
        return 'primary';
      case 'completed':
        return 'success';
      case 'upcoming':
        return 'default';
      default:
        return 'default';
    }
  };

  // 실천 과제 클릭 핸들러
  const handlePracticeClick = (practice) => {
    if (practice.completed) {
      setSelectedPractice(practice);
      setRecordModalOpen(true);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        챌린지 정보를 불러오는 중 오류가 발생했습니다: {error}
      </Alert>
    );
  }

  if (!challenge) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        챌린지를 찾을 수 없습니다.
      </Alert>
    );
  }

  return (
    <DetailContainer>
      {/* 헤더 */}
      <HeaderContainer elevation={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton 
            onClick={onBack}
            sx={{ color: 'white', mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {challenge.name}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
              {challenge.description}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label={getStatusText()}
                color={getStatusColor()}
                variant={challenge.status === 'current' ? 'filled' : 'outlined'}
              />
              <Typography variant="body2">
                {challenge.current_day}일차 / {challenge.total_days}일
              </Typography>
              {challenge.completed_days && (
                <Chip 
                  label={`${challenge.completed_days}일 완료`}
                  color="success"
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={challenge.progress_percentage || 0}
          sx={{ 
            height: 8, 
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.3)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              backgroundColor: 'white',
            }
          }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            진행률
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {challenge.progress_percentage}% 완료
          </Typography>
        </Box>
      </HeaderContainer>

      {/* 실천 과제 목록 */}
      <Paper elevation={2} sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight="bold">
            실천 과제 목록
          </Typography>
        </Box>
        
        <List sx={{ p: 0 }}>
          {challenge.practices.map((practice) => (
            <PracticeItem 
              key={practice.id}
              completed={practice.completed}
              isToday={practice.is_today}
              onClick={() => handlePracticeClick(practice)}
              sx={{ 
                cursor: practice.completed ? 'pointer' : 'default',
                '&:hover': practice.completed ? {
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                } : {}
              }}
            >
              <ListItemIcon>
                {getStatusIcon(practice)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      variant="body1" 
                      fontWeight={practice.is_today ? 'bold' : practice.completed ? 'bold' : 'normal'}
                      color={practice.is_today ? 'primary.main' : practice.completed ? 'success.main' : 'text.primary'}
                    >
                      {practice.title}
                    </Typography>
                    {practice.is_today && (
                      <Chip 
                        label="오늘" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    )}
                    {practice.completed && !practice.is_today && (
                      <Chip 
                        label="완료" 
                        size="small" 
                        color="success" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {practice.description}
                  </Typography>
                }
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={`${practice.day}일차`}
                  size="small"
                  variant="outlined"
                  color={practice.completed ? 'success' : 'default'}
                />
                {practice.completed && (
                  <Chip 
                    label="✓" 
                    size="small" 
                    color="success" 
                    sx={{ minWidth: 'auto', width: 24, height: 24 }}
                  />
                )}
              </Box>
            </PracticeItem>
          ))}
        </List>
      </Paper>

      {/* 실천 기록 모달 */}
      <PracticeRecordModal
        open={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        practice={selectedPractice}
        challenge={challenge}
        onUpdate={() => {
          // 기록 업데이트 후 챌린지 정보 다시 가져오기
          fetchChallengeDetail();
        }}
      />
    </DetailContainer>
  );
};

export default ChallengeDetail;
