import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Avatar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';

const StyledPaper = styled(Paper)(({ theme, type }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  borderRadius: theme.spacing(2),
  border: type === 'current' ? `2px solid ${theme.palette.primary.main}` : 'none',
  boxShadow: type === 'current' 
    ? '0 4px 20px rgba(25, 118, 210, 0.15)' 
    : '0 2px 8px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)',
  }
}));

const PracticeBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.grey[200]}`,
  marginTop: theme.spacing(2),
}));

const ChallengeCard = ({ challenge, type }) => {
  const getStatusIcon = () => {
    switch (type) {
      case 'current':
        return <PlayCircleIcon sx={{ color: 'primary.main' }} />;
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'upcoming':
        return <ScheduleIcon sx={{ color: 'text.secondary' }} />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    switch (type) {
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
    switch (type) {
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getProgressText = () => {
    if (type === 'upcoming') {
      return `시작까지 ${challenge.days_until_start}일 남음`;
    }
    
    const currentDays = challenge.current_day || challenge.completed_days || 0;
    const totalDays = challenge.total_days;
    const percentage = challenge.progress_percentage || 0;
    
    return `${currentDays}일차 / ${totalDays}일 (${percentage}% 완료)`;
  };

  const getPracticeText = () => {
    if (type === 'current' && challenge.today_practice) {
      return challenge.today_practice.title;
    }
    if (type === 'completed' && challenge.last_practice) {
      return challenge.last_practice.title;
    }
    return null;
  };

  const getPracticeLabel = () => {
    switch (type) {
      case 'current':
        return '오늘의 실천';
      case 'completed':
        return '마지막 실천';
      default:
        return '';
    }
  };

  return (
    <StyledPaper elevation={2} type={type}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 24, height: 24, bgcolor: 'transparent' }}>
            {getStatusIcon()}
          </Avatar>
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            {challenge.name}
          </Typography>
        </Box>
        <Chip 
          label={getStatusLabel()}
          color={getStatusColor()}
          size="small"
          variant={type === 'current' ? 'filled' : 'outlined'}
        />
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
        {challenge.description}
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {formatDate(challenge.start_date)} ~ {formatDate(challenge.end_date)}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight="medium">
          {getProgressText()}
        </Typography>
      </Box>
      
      {type !== 'upcoming' && (
        <LinearProgress 
          variant="determinate" 
          value={challenge.progress_percentage || 0}
          sx={{ 
            mb: 2, 
            height: 8, 
            borderRadius: 4,
            backgroundColor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
            }
          }}
        />
      )}
      
      {getPracticeText() && (
        <PracticeBox>
          <Typography variant="body2" fontWeight="medium" color="text.primary" mb={1}>
            {getPracticeLabel()}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
            {getPracticeText()}
          </Typography>
        </PracticeBox>
      )}
    </StyledPaper>
  );
};

export default ChallengeCard;
