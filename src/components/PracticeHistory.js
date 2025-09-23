import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  CheckCircle, 
  CalendarToday,
  Visibility,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Help
} from '@mui/icons-material';
import { getUserId } from '../utils/userId';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
}));

const HistoryItem = styled(ListItem)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.grey[200]}`,
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.grey[50],
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  }
}));

const PracticeHistory = ({ challengeId, onViewRecord }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordDetailOpen, setRecordDetailOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!challengeId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
      const userId = getUserId();
      
      const response = await fetch(`${API_URL}/api/feedback/history?challengeId=${challengeId}`, {
        headers: {
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString(),
          'X-User-ID': userId
        }
      });
      
      if (response.ok) {
        const historyData = await response.json();
        setRecords(historyData);
      } else {
        throw new Error('기록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('History fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    if (challengeId) {
      fetchHistory();
    }
  }, [challengeId, fetchHistory]);

  const handleViewRecord = async (record) => {
    setSelectedRecord(record);
    setRecordDetailOpen(true);
  };

  const getMoodChangeIcon = (moodChange) => {
    switch (moodChange) {
      case 'improved':
        return <TrendingUp color="success" />;
      case 'worse':
        return <TrendingDown color="error" />;
      case 'same':
        return <TrendingFlat color="info" />;
      default:
        return <Help color="action" />;
    }
  };

  const getMoodChangeText = (moodChange) => {
    const moodMap = {
      'improved': '좋아졌어요',
      'same': '그대로예요',
      'worse': '나빠졌어요',
      'unknown': '잘 모르겠다'
    };
    return moodMap[moodChange] || moodChange;
  };

  const getMoodChangeColor = (moodChange) => {
    const colorMap = {
      'improved': 'success',
      'same': 'info',
      'worse': 'error',
      'unknown': 'default'
    };
    return colorMap[moodChange] || 'default';
  };

  const getHelpfulText = (wasHelpful) => {
    const helpfulMap = {
      'yes': '도움됨',
      'no': '도움안됨',
      'unknown': '모르겠음'
    };
    return helpfulMap[wasHelpful] || wasHelpful;
  };

  const getHelpfulColor = (wasHelpful) => {
    const colorMap = {
      'yes': 'success',
      'no': 'error',
      'unknown': 'default'
    };
    return colorMap[wasHelpful] || 'default';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  if (!challengeId) {
    return (
      <StyledPaper>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            챌린지를 선택해주세요
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            기록을 보려면 먼저 챌린지를 선택해주세요.
          </Typography>
        </Box>
      </StyledPaper>
    );
  }

  if (loading) {
    return (
      <StyledPaper>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </StyledPaper>
    );
  }

  if (error) {
    return (
      <StyledPaper>
        <Typography variant="h6" color="error" align="center">
          오류가 발생했습니다: {error}
        </Typography>
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button variant="outlined" onClick={fetchHistory}>
            다시 시도
          </Button>
        </Box>
      </StyledPaper>
    );
  }

  if (records.length === 0) {
    return (
      <StyledPaper>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            아직 실천 기록이 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            첫 번째 실천을 기록해보세요!
          </Typography>
        </Box>
      </StyledPaper>
    );
  }

  return (
    <>
      <StyledPaper>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
          실천 기록 히스토리 📚
        </Typography>
        
        <List>
          {records.map((record, index) => (
            <React.Fragment key={record.id}>
              <HistoryItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {record.practice_day}일차
                    </Typography>
                    <Chip 
                      icon={<CalendarToday />}
                      label={formatDate(record.created_at)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {record.practice_description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      icon={getMoodChangeIcon(record.mood_change)}
                      label={getMoodChangeText(record.mood_change)}
                      color={getMoodChangeColor(record.mood_change)}
                      size="small"
                      variant="outlined"
                    />
                    <Chip 
                      label={getHelpfulText(record.was_helpful)}
                      color={getHelpfulColor(record.was_helpful)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                
                <IconButton 
                  onClick={() => handleViewRecord(record)}
                  color="primary"
                  size="small"
                >
                  <Visibility />
                </IconButton>
              </HistoryItem>
              
              {index < records.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </StyledPaper>

      {/* 기록 상세 보기 모달 */}
      <Dialog 
        open={recordDetailOpen} 
        onClose={() => setRecordDetailOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box>
            <Typography variant="h6" component="div">
              실천 기록 상세보기
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              {selectedRecord && `${selectedRecord.practice_day}일차 - ${formatDate(selectedRecord.created_at)}`}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                실천한 내용
              </Typography>
              <Typography variant="body1" component="span" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedRecord.practice_description}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip 
                  icon={getMoodChangeIcon(selectedRecord.mood_change)}
                  label={getMoodChangeText(selectedRecord.mood_change)}
                  color={getMoodChangeColor(selectedRecord.mood_change)}
                  variant="outlined"
                />
                <Chip 
                  label={getHelpfulText(selectedRecord.was_helpful)}
                  color={getHelpfulColor(selectedRecord.was_helpful)}
                  variant="outlined"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setRecordDetailOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PracticeHistory;
