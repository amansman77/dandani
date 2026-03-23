import React from 'react';
import { Button, Paper, Typography } from '@mui/material';

const YesterdayRecordSection = ({ practiceDescription, onContinueToday }) => {
  if (!practiceDescription) {
    return null;
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mt: 2,
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #f8fbff, #eef4fb)',
        border: '1px solid #d7e3f3'
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        어제 남긴 한 줄
      </Typography>
      <Typography
        variant="body1"
        sx={{
          mb: 2,
          whiteSpace: 'pre-wrap',
          fontStyle: 'italic',
          lineHeight: 1.7
        }}
      >
        "{practiceDescription}"
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        오늘도 이어볼까요?
      </Typography>
      <Button variant="outlined" onClick={onContinueToday}>
        오늘 실천 이어가기
      </Button>
    </Paper>
  );
};

export default YesterdayRecordSection;
