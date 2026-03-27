import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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
import { addStartedAtHeader, getClampedPracticeDay } from '../utils/challengeDay';
import {
  logAssistantOpened,
  logAssistantSkipped,
  logChallengeCompleted,
  logFeedbackSubmit,
  logPracticeComplete
} from '../utils/analytics';
import { deriveRetentionState, generateFeedback, getStreakMessage } from '../utils/retention';
import CompletionFeedbackCard from './CompletionFeedbackCard';
import AssistantSheet from './AssistantSheet';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const REMINDER_PREFERENCE_KEY = 'dandani_same_time_reminder_enabled';

const PracticeCompletionModal = ({
  open,
  practice,
  challenge,
  onClose,
  onCompleted,
  onError,
  onViewHistory
}) => {
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionSummary, setCompletionSummary] = useState({
    streakDays: 0,
    feedbackMessage: ''
  });
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);
  const [sameTimeReminder, setSameTimeReminder] = useState(() => {
    return localStorage.getItem(REMINDER_PREFERENCE_KEY) === 'true';
  });

  const canSubmit = useMemo(() => {
    return reflection.trim().length >= 1;
  }, [reflection]);

  const practiceDay = useMemo(() => {
    return getClampedPracticeDay(practice, challenge);
  }, [practice, challenge]);

  const resetState = () => {
    setReflection('');
    setSaving(false);
    setCompleted(false);
    setCompletionSummary({
      streakDays: 0,
      feedbackMessage: ''
    });
    setAssistantOpen(false);
    setCompletedAt(null);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    setReflection('');
    setSaving(false);
    setCompleted(false);
    setAssistantOpen(false);
    setCompletedAt(null);
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

      let streakDays = 1;
      try {
        const summaryHeaders = addStartedAtHeader({
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString(),
          'X-User-ID': userId
        }, challenge.id);
        const historyResponse = await fetch(`${API_URL}/api/feedback/history?challengeId=${challenge.id}`, {
          headers: summaryHeaders
        });
        if (historyResponse.ok) {
          const history = await historyResponse.json();
          const state = deriveRetentionState(Array.isArray(history) ? history : []);
          streakDays = Math.max(1, state.streakDays || 1);
        }
      } catch (summaryError) {
        console.warn('Failed to compute completion summary:', summaryError);
      }

      setCompletionSummary({
        streakDays,
        feedbackMessage: generateFeedback(streakDays)
      });

      logPracticeComplete(challenge.id, practiceDay, 'unknown', 'unknown');
      logFeedbackSubmit(challenge.id, practiceDay, 'unknown', 'unknown');
      logChallengeCompleted(challenge.id, practiceDay);

      setCompleted(true);
      setCompletedAt(new Date().toISOString());
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

  const handleViewRecords = () => {
    localStorage.setItem(REMINDER_PREFERENCE_KEY, sameTimeReminder ? 'true' : 'false');
    resetState();
    if (onViewHistory) {
      onViewHistory();
    }
    onClose();
  };

  const handleOpenAssistant = () => {
    setAssistantOpen(true);
    if (challenge?.id) {
      logAssistantOpened(challenge.id, practiceDay);
    }
  };

  const handleSkipAssistant = () => {
    if (challenge?.id) {
      logAssistantSkipped(challenge.id, practiceDay);
    }
    handleConfirmContinue();
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
        {completed ? '오늘의 실천 완료 🎉' : '🌱 오늘의 단단함이 쌓였어요'}
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
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              {getStreakMessage(completionSummary.streakDays)}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
              {completionSummary.feedbackMessage || generateFeedback(1)}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`이번 챌린지 ${Math.min(practiceDay, challenge?.total_days || 1)}/${challenge?.total_days || 1}일 진행`} color="success" variant="outlined" />
              <Chip label={`총 ${completionSummary.streakDays || 1}일 연속`} color="warning" variant="outlined" />
            </Box>

            <FormControlLabel
              control={(
                <Switch
                  checked={sameTimeReminder}
                  onChange={(event) => setSameTimeReminder(event.target.checked)}
                />
              )}
              label="내일 같은 시간에 다시 해볼래요"
            />

            <CompletionFeedbackCard
              challengeTitle={challenge?.name}
              completedAt={completedAt || new Date().toISOString()}
              onOpenAssistant={handleOpenAssistant}
              onSkip={handleSkipAssistant}
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
          <>
            <Button variant="outlined" onClick={handleViewRecords}>
              내 기록 보기
            </Button>
            <Button variant="contained" onClick={handleConfirmContinue}>
              내일도 이어가기
            </Button>
          </>
        )}
      </DialogActions>

      <AssistantSheet
        open={assistantOpen}
        challenge={challenge}
        practiceDay={practiceDay}
        onClose={() => setAssistantOpen(false)}
        onSaved={handleConfirmContinue}
        onError={onError}
      />
    </Dialog>
  );
};

export default PracticeCompletionModal;
