import React from 'react';
import {
  Box,
  Typography,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PracticeCalendar from './PracticeCalendar';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
}));


const PracticeHistory = ({ challengeId, onViewRecord }) => {
  const handleDateSelect = (date, dateRecords) => {
    // 달력에서 날짜 선택 시 처리
    console.log('Selected date:', date, 'Records:', dateRecords);
    if (onViewRecord && dateRecords && dateRecords.length > 0) {
      // 첫 번째 기록을 상세 보기로 전달
      onViewRecord(dateRecords[0]);
    }
  };


  if (!challengeId) {
    return (
      <StyledPaper>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            챌린지를 선택해주세요
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            달력을 보려면 먼저 챌린지를 선택해주세요.
          </Typography>
        </Box>
      </StyledPaper>
    );
  }

  return (
    <PracticeCalendar 
      challengeId={challengeId}
      onDateSelect={handleDateSelect}
    />
  );
};

export default PracticeHistory;
