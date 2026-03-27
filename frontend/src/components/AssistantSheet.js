import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  Typography
} from '@mui/material';
import { getUserId } from '../utils/userId';
import { addStartedAtHeader } from '../utils/challengeDay';
import { logAssistantCompleted, logRecordCreated } from '../utils/analytics';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const EMOTION_OPTIONS = [
  { label: '조금 편안해졌어요', value: 'calm' },
  { label: '별로 변화 없어요', value: 'neutral' },
  { label: '잘 모르겠어요', value: 'unknown' }
];

function generateAssistantMessage(emotion) {
  if (emotion === 'calm') {
    return '편안함을 느끼셨군요. 작은 변화가 쌓이면 마음의 중심이 더 단단해져요.';
  }
  if (emotion === 'neutral') {
    return '큰 변화가 없어도 괜찮아요. 오늘 실천을 이어간 것 자체가 이미 중요한 신호예요.';
  }
  return '지금 바로 느낌이 선명하지 않아도 괜찮아요. 계속 관찰하면 내 감정의 흐름이 보이기 시작해요.';
}

const AssistantSheet = ({
  open,
  challenge,
  practiceDay,
  onClose,
  onSaved,
  onError
}) => {
  const [step, setStep] = useState(1);
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [saving, setSaving] = useState(false);

  const aiMessage = useMemo(() => generateAssistantMessage(selectedEmotion), [selectedEmotion]);

  const handleSelectEmotion = (emotion) => {
    setSelectedEmotion(emotion);
    setStep(3);
  };

  const handleSave = async () => {
    if (!challenge?.id || !selectedEmotion || saving) {
      return;
    }

    setSaving(true);
    try {
      const userId = getUserId();
      const headers = addStartedAtHeader({
        'Content-Type': 'application/json',
        'X-User-ID': userId,
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString()
      }, challenge.id);

      const response = await fetch(`${API_URL}/api/records`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          challengeId: challenge.id,
          challengeTitle: challenge.name,
          emotion: selectedEmotion,
          note: '',
          source: 'assistant',
          practiceDay
        })
      });

      if (!response.ok) {
        throw new Error('자동 기록 저장에 실패했습니다.');
      }

      logAssistantCompleted(challenge.id, practiceDay, selectedEmotion);
      logRecordCreated(challenge.id, practiceDay, 'assistant');

      if (onSaved) {
        onSaved();
      }

      setSaving(false);
      setStep(1);
      setSelectedEmotion('');
      onClose();
    } catch (error) {
      setSaving(false);
      if (onError) {
        onError(error);
      }
    }
  };

  const handleClose = () => {
    if (saving) {
      return;
    }
    setStep(1);
    setSelectedEmotion('');
    onClose();
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={handleClose}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 2
      }}
      PaperProps={{
        sx: {
          zIndex: (theme) => theme.zIndex.modal + 2,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16
        }
      }}
      ModalProps={{
        keepMounted: true
      }}
    >
      <Box sx={{ p: 3, maxWidth: 720, mx: 'auto', width: '100%' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          단단이 어시스턴트
        </Typography>

        {step === 1 && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
              {'방금 실천을 하셨네요 🙂\n어떤 점이 가장 기억에 남으셨나요?'}
            </Typography>
            <Button variant="contained" onClick={() => setStep(2)}>
              이어서 답하기
            </Button>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {EMOTION_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="outlined"
                onClick={() => handleSelectEmotion(option.value)}
                sx={{ justifyContent: 'flex-start' }}
              >
                {option.label}
              </Button>
            ))}
          </Box>
        )}

        {step === 3 && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
              {aiMessage}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button variant="outlined" onClick={handleClose} disabled={saving}>
                닫기
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? <CircularProgress size={18} /> : '자동 기록 저장'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default AssistantSheet;
