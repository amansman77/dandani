import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { getUserId } from '../utils/userId';
import { calculateChallengeDay } from '../utils/challengeDay';
import { logFeedbackSubmit, logPracticeComplete } from '../utils/analytics';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const REMINDER_PREFERENCE_KEY = 'dandani_same_time_reminder_enabled';

const PracticeCompletionModal = ({
  open,
  practice,
  challenge,
  onClose,
  onCompleted,
  onError
}) => {
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sameTimeReminder, setSameTimeReminder] = useState(() => {
    return localStorage.getItem(REMINDER_PREFERENCE_KEY) === 'true';
  });

  const canSubmit = useMemo(() => {
    return reflection.trim().length >= 1;
  }, [reflection]);

  const practiceDay = useMemo(() => {
    const actualDay = calculateChallengeDay(challenge);
    const totalDays = Math.max(1, challenge?.total_days || 1);
    return practice?.day
      ? Math.min(practice.day, totalDays)
      : Math.min(actualDay, totalDays);
  }, [practice, challenge]);

  const resetState = () => {
    setReflection('');
    setSaving(false);
    setCompleted(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    setReflection('');
    setSaving(false);
    setCompleted(false);
  }, [open]);

  const handleDialogClose = (event, reason) => {
    if (!completed && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }

    resetState();
    onClose();
  };

  const handleSubmitReflection = async () => {
    if (!challenge?.id || !canSubmit || saving) {
      return;
    }

    setSaving(true);
    try {
      const userId = getUserId();
      const payload = {
        challengeId: challenge.id,
        practiceDay,
        moodChange: 'unknown',
        wasHelpful: 'unknown',
        practiceDescription: reflection.trim()
      };

      const response = await fetch(`${API_URL}/api/feedback/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('실천 기록 저장에 실패했습니다.');
      }

      const savedRecord = await response.json();

      logPracticeComplete(challenge.id, practiceDay, 'unknown', 'unknown');
      logFeedbackSubmit(challenge.id, practiceDay, 'unknown', 'unknown');

      setCompleted(true);
      setSaving(false);

      if (onCompleted) {
        onCompleted(savedRecord);
      }
    } catch (error) {
      setSaving(false);
      if (onError) {
        onError(error);
      }
    }
  };

  const handleConfirmContinue = () => {
    localStorage.setItem(REMINDER_PREFERENCE_KEY, sameTimeReminder ? 'true' : 'false');
    resetState();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={!completed}
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle>
        {completed ? '내일도 이어서 해볼까요?' : '🌱 오늘의 단단함이 쌓였어요'}
      </DialogTitle>

      <DialogContent>
        {!completed && (
          <>
            <Typography
              variant="body1"
              sx={{
                mb: 2,
                whiteSpace: 'pre-line',
                lineHeight: 1.7,
                color: 'text.secondary'
              }}
            >
              {"작은 실천이지만,\n이건 '흔들리지 않으려는 선택'이에요"}
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              지금 느낀 걸 한 줄로 남겨보세요
            </Typography>

            <TextField
              fullWidth
              autoFocus
              multiline
              minRows={3}
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              placeholder="예: 숨을 고르고 나니 마음이 조금 가벼워졌어요"
              inputProps={{ maxLength: 300 }}
              helperText="최소 1글자 이상 입력해야 저장됩니다."
            />
          </>
        )}

        {completed && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
              오늘 남긴 한 줄이 내일의 나를 다시 붙잡아줄 거예요.
            </Typography>

            <FormControlLabel
              control={(
                <Switch
                  checked={sameTimeReminder}
                  onChange={(event) => setSameTimeReminder(event.target.checked)}
                />
              )}
              label="내일 같은 시간에 다시 해볼래요"
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {!completed ? (
          <Button
            variant="contained"
            onClick={handleSubmitReflection}
            disabled={!canSubmit || saving}
          >
            {saving ? '저장 중...' : '기록 저장하기'}
          </Button>
        ) : (
          <Button variant="contained" onClick={handleConfirmContinue}>
            좋아요, 내일도 이어갈게요
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PracticeCompletionModal;
