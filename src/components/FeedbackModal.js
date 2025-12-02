import React, { useState } from 'react';
import { calculateChallengeDay } from '../utils/challengeDay';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    padding: theme.spacing(1)
  }
}));

const QuestionBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.grey[200]}`
}));

const FeedbackModal = ({ 
  open, 
  onClose, 
  practice, 
  challenge, 
  onSubmit 
}) => {
  const [moodChange, setMoodChange] = useState('');
  const [wasHelpful, setWasHelpful] = useState('');
  const [practiceDescription, setPracticeDescription] = useState('');

  const handleSubmit = () => {
    if (!practiceDescription.trim() || !moodChange || !wasHelpful) {
      alert('모든 질문에 답해주세요.');
      return;
    }

    // 공통 유틸리티를 사용하여 일차 계산
    const practiceDay = calculateChallengeDay(challenge, { 
      practiceDay: practice?.day 
    });

    const feedback = {
      challengeId: challenge.id,
      practiceDay: practiceDay,
      moodChange,
      wasHelpful,
      practiceDescription: practiceDescription.trim()
    };

    onSubmit(feedback);
    handleClose();
  };

  const handleClose = () => {
    setMoodChange('');
    setWasHelpful('');
    setPracticeDescription('');
    onClose();
  };

  return (
    <StyledDialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          오늘의 실천 기록하기 📝
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {challenge?.name} - {practice?.day}일차
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <QuestionBox>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Q1. 어떤 것을 실천하셨어요?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="오늘 실천한 내용을 자유롭게 적어주세요..."
            value={practiceDescription}
            onChange={(e) => setPracticeDescription(e.target.value)}
            variant="outlined"
            required
          />
        </QuestionBox>

        <QuestionBox>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
              Q2. 오늘 실천 후 기분이 어떠신가요?
            </FormLabel>
            <RadioGroup
              value={moodChange}
              onChange={(e) => setMoodChange(e.target.value)}
            >
              <FormControlLabel value="improved" control={<Radio />} label="좋아졌어요" />
              <FormControlLabel value="same" control={<Radio />} label="그대로예요" />
              <FormControlLabel value="worse" control={<Radio />} label="나빠졌어요" />
              <FormControlLabel value="unknown" control={<Radio />} label="잘 모르겠다" />
            </RadioGroup>
          </FormControl>
        </QuestionBox>

        <QuestionBox>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
              Q3. 이 실천이 도움이 되었나요?
            </FormLabel>
            <RadioGroup
              value={wasHelpful}
              onChange={(e) => setWasHelpful(e.target.value)}
            >
              <FormControlLabel value="yes" control={<Radio />} label="네" />
              <FormControlLabel value="no" control={<Radio />} label="아니오" />
              <FormControlLabel value="unknown" control={<Radio />} label="잘 모르겠다" />
            </RadioGroup>
          </FormControl>
        </QuestionBox>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          취소
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!practiceDescription.trim() || !moodChange || !wasHelpful}
        >
          기록하기
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default FeedbackModal;
