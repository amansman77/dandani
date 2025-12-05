import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Chip,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Help
} from '@mui/icons-material';
import { getUserId } from '../utils/userId';
import { parseDatabaseDate } from '../utils/challengeDay';

const StyledChip = styled(Chip)(({ hasContent }) => ({
  '&.MuiChip-outlined': {
    border: hasContent ? undefined : 'none'
  }
}));

const CalendarContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
}));

const CalendarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(2),
}));

const CalendarGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: theme.spacing(0.5),
  marginBottom: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(0.25),
  },
}));

const DayHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  textAlign: 'center',
  fontWeight: 'bold',
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(0.5),
    fontSize: '0.75rem',
  },
}));

const DayCell = styled(Box, {
  shouldForwardProp: (prop) => !['isToday', 'hasRecord', 'isOtherMonth'].includes(prop),
})(({ theme, isToday, hasRecord, isOtherMonth }) => ({
  aspectRatio: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  cursor: 'pointer',
  position: 'relative',
  backgroundColor: hasRecord 
    ? theme.palette.success.light 
    : isToday 
      ? theme.palette.primary.light 
      : 'transparent',
  color: hasRecord 
    ? theme.palette.success.contrastText 
    : isOtherMonth 
      ? theme.palette.text.disabled 
      : theme.palette.text.primary,
  opacity: isOtherMonth ? 0.4 : 1,
  '&:hover': {
    backgroundColor: hasRecord 
      ? theme.palette.success.main 
      : theme.palette.action.hover,
  },
  transition: 'all 0.2s ease',
  [theme.breakpoints.down('sm')]: {
    borderRadius: '4px',
    minHeight: '32px',
  },
}));


const PracticeCalendar = ({ challengeId, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState([]);

  const fetchRecords = useCallback(async () => {
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
      console.error('Records fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    if (challengeId) {
      fetchRecords();
    }
  }, [challengeId, fetchRecords]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    
    const days = [];
    
    // 이전 달의 마지막 날들
    const prevMonth = new Date(year, month, 0); // 현재 달의 0일 = 이전 달의 마지막 날
    const prevMonthLastDay = prevMonth.getDate();
    
    // 이전 달의 마지막 날부터 시작해서 필요한 만큼 추가
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNumber = prevMonthLastDay - i;
      const dayDate = new Date(year, month - 1, dayNumber);
      days.push({
        date: dayDate,
        isOtherMonth: true
      });
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isOtherMonth: false
      });
    }
    
    // 다음 달의 첫 날들 (달력이 6주를 채우도록)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isOtherMonth: true
      });
    }
    
    return days;
  };

  const getRecordsForDate = (date) => {
    // 로컬 날짜 기준으로 비교 (년/월/일만 비교)
    const localYear = date.getFullYear();
    const localMonth = date.getMonth();
    const localDay = date.getDate();
    
    return records.filter(record => {
      // parseDatabaseDate를 사용하여 SQLite DATETIME 형식을 올바르게 UTC로 해석
      const recordDate = parseDatabaseDate(record.created_at);
      if (!recordDate) {
        return false;
      }
      
      // 로컬 시간 기준으로 날짜 추출
      const recordYear = recordDate.getFullYear();
      const recordMonth = recordDate.getMonth();
      const recordDay = recordDate.getDate();
      
      // 로컬 날짜 기준으로 비교
      return recordYear === localYear && recordMonth === localMonth && recordDay === localDay;
    });
  };

  const handleDateClick = (date) => {
    const dateRecords = getRecordsForDate(date);
    setSelectedDate(date);
    setSelectedDateRecords(dateRecords);
    if (onDateSelect) {
      onDateSelect(date, dateRecords);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getMoodChangeIcon = (moodChange) => {
    switch (moodChange) {
      case 'improved':
        return <TrendingUp color="success" fontSize="small" />;
      case 'worse':
        return <TrendingDown color="error" fontSize="small" />;
      case 'same':
        return <TrendingFlat color="info" fontSize="small" />;
      default:
        return <Help color="action" fontSize="small" />;
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

  const formatDate = (date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };


  const today = new Date();
  const days = getDaysInMonth(currentDate);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  if (!challengeId) {
    return (
      <CalendarContainer>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            챌린지를 선택해주세요
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            달력을 보려면 먼저 챌린지를 선택해주세요.
          </Typography>
        </Box>
      </CalendarContainer>
    );
  }

  if (loading) {
    return (
      <CalendarContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </CalendarContainer>
    );
  }

  if (error) {
    return (
      <CalendarContainer>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            기록을 불러오는데 실패했습니다.
          </Typography>
        </Box>
      </CalendarContainer>
    );
  }

  return (
    <CalendarContainer>
      
      <CalendarHeader>
        <IconButton onClick={() => navigateMonth(-1)}>
          <ChevronLeft />
        </IconButton>
        
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 'bold',
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }}
        >
          {currentDate.toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: 'long' 
          })}
        </Typography>
        
        <IconButton onClick={() => navigateMonth(1)}>
          <ChevronRight />
        </IconButton>
      </CalendarHeader>

      <CalendarGrid>
        {weekDays.map(day => (
          <DayHeader key={day}>
            {day}
          </DayHeader>
        ))}
        
        {days.map((day, index) => {
          const dayRecords = getRecordsForDate(day.date);
          const hasRecord = dayRecords.length > 0;
          const isToday = day.date.toDateString() === today.toDateString();
          
          return (
            <Tooltip 
              key={index}
              title={hasRecord ? `${dayRecords.length}개 완료` : '완료 없음'}
              arrow
            >
              <DayCell
                isToday={isToday}
                hasRecord={hasRecord}
                isOtherMonth={day.isOtherMonth}
                onClick={() => handleDateClick(day.date)}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: isToday ? 'bold' : 'normal',
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}
                  >
                    {day.date.getDate()}
                  </Typography>
                  {hasRecord && (
                    <CheckCircle sx={{ 
                      fontSize: { xs: 10, sm: 12 }, 
                      mt: 0.5 
                    }} />
                  )}
                </Box>
              </DayCell>
            </Tooltip>
          );
        })}
      </CalendarGrid>

      {selectedDate && (
        <Card sx={{ mt: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              {formatDate(selectedDate)}의 실천 기록
            </Typography>
            
            {selectedDateRecords.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                이 날에는 실천 기록이 없습니다.
              </Typography>
            ) : (
              <Box>
                {selectedDateRecords.map((record, index) => (
                  <Box key={record.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {record.practice_day}일차
                      </Typography>
                      {record.mood_change && (
                        <StyledChip 
                        icon={getMoodChangeIcon(record.mood_change)}
                        label={getMoodChangeText(record.mood_change)}
                        color={getMoodChangeColor(record.mood_change)}
                        size="small"
                        variant="outlined"
                          hasContent={!!record.mood_change}
                      />
                      )}
                      {record.was_helpful && (
                        <StyledChip 
                        label={getHelpfulText(record.was_helpful)}
                        color={getHelpfulColor(record.was_helpful)}
                        size="small"
                        variant="outlined"
                          hasContent={!!record.was_helpful}
                      />
                      )}
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {record.practice_description}
                    </Typography>
                    
                    {index < selectedDateRecords.length - 1 && <Divider sx={{ my: 2 }} />}
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

    </CalendarContainer>
  );
};

export default PracticeCalendar;
