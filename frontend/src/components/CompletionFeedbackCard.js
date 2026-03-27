import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';

const CompletionFeedbackCard = ({
  challengeTitle,
  completedAt,
  onOpenAssistant,
  onSkip
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default'
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
        잘했어요. 이 작은 선택이 쌓이고 있어요.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        지금 어떤 느낌이었나요?
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {challengeTitle || '오늘의 챌린지'} · {new Date(completedAt).toLocaleString('ko-KR')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={onSkip}>
          나중에 하기
        </Button>
        <Button variant="contained" onClick={onOpenAssistant}>
          느낌 남기기
        </Button>
      </Box>
    </Paper>
  );
};

export default CompletionFeedbackCard;
