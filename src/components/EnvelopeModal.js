import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CryptoJS from 'crypto-js';
import { saveEnvelope } from '../utils/envelopeStorage';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.spacing(2),
    padding: theme.spacing(1),
  },
}));

// 암호화 함수들
const generateRandomKey = () => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

const generateSecurePassword = () => {
  const simpleWords = [
    '행복', '희망', '사랑', '꿈', '기억', '마음', '시간', '친구', 
    '별빛', '웃음', '햇살', '노래', '바다', '하늘', '숲', '꽃'
  ];
  
  const words = [];
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * simpleWords.length);
    words.push(simpleWords[randomIndex]);
  }
  
  const randomNum = Math.floor(Math.random() * 100);
  return `${words.join('-')}-${randomNum.toString().padStart(2, '0')}`;
};

const encryptWithPassword = (message, password) => {
  // 1. 비밀번호로 1차 암호화
  const passwordEncrypted = CryptoJS.AES.encrypt(message, password).toString();
  
  // 2. 랜덤 키로 2차 암호화 (시간 키)
  const timeKey = generateRandomKey();
  const finalEncrypted = CryptoJS.AES.encrypt(passwordEncrypted, timeKey).toString();
  
  return { encryptedMessage: finalEncrypted, timeKey: timeKey };
};

const EnvelopeModal = ({ open, onClose, challengeId, challengeName, challengeEndDate }) => {
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleClose = () => {
    if (!isCreating) {
      setMessage('');
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  const handleCreateEnvelope = async () => {
    if (!message.trim()) {
      setError('메시지를 입력해주세요.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // 챌린지 종료일 기준으로 열람일 설정
      let unlockDate;
      if (challengeEndDate) {
        // 챌린지 종료일이 있으면 그 날짜로 설정
        unlockDate = new Date(challengeEndDate);
      } else {
        // 챌린지 종료일이 없으면 30일 후로 설정 (fallback)
        unlockDate = new Date();
        unlockDate.setDate(unlockDate.getDate() + 30);
      }

      // 자동 비밀번호 생성
      const generatedPassword = generateSecurePassword();

      // 비밀번호로 이중 암호화
      const { encryptedMessage } = encryptWithPassword(message.trim(), generatedPassword);

      // 운영 중인 timefold API 직접 호출
      const response = await fetch('https://timefold.amansman77.workers.dev/api/envelopes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Token': `dandani-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify({
          unlockAt: unlockDate.getTime(),
          passwordProtected: true,
          encryptedMessage: encryptedMessage,
          userToken: `dandani-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        })
      });

      if (!response.ok) {
        throw new Error('편지 생성에 실패했습니다.');
      }

      const result = await response.json();
      
      // 편지 데이터를 로컬 저장소에 저장 (내용 제외)
      const envelopeData = {
        envelopeId: result.id,
        challengeId,
        challengeName,
        // message: message.trim(), // 보안을 위해 내용 저장하지 않음
        password: generatedPassword,
        unlockAt: unlockDate.toISOString(),
        shareUrl: `https://timefold.yetimates.com/?v=3.0&id=${result.id}`
      };
      
      saveEnvelope(envelopeData);
      
      // timefold API 응답 형식에 맞게 처리
      setSuccess({
        envelopeId: result.id,
        shareUrl: `https://timefold.yetimates.com/?v=3.0&id=${result.id}`,
        message: '편지가 성공적으로 생성되었습니다.',
        password: generatedPassword
      });

    } catch (err) {
      console.error('Envelope creation error:', err);
      setError(err.message || '편지 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };


  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      {!success && (
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            완료한 나에게
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {challengeName} 챌린지를 완료한 나에게 전할 메시지를 적어보세요
          </Typography>
        </DialogTitle>
      )}

      <DialogContent sx={{ pt: 2 }}>
        {!success ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              지금의 바라는 모습, 목표, 또는 격려의 말을 적어보세요. 
              챌린지를 완료한 당신에게 전달됩니다.
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="예: 완료한 나야! 지금 이 챌린지를 시작하는 나는 정말 용감해. 챌린지를 완료한 나는 더 단단해진 나를 만나게 될 거야. 힘내!"
              variant="outlined"
              disabled={isCreating}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                }
              }}
            />

            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                💡 <strong>팁:</strong> 구체적인 목표나 감정을 담아보세요. 
                예를 들어 "챌린지 완료 후에는 더 자신감 있는 나가 되었기를", 
                "이 챌린지를 통해 얻고 싶은 것" 등을 적어보세요.
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main" sx={{ mb: 3 }}>
              편지가 전송되었습니다!
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              챌린지 완료 후 편지를 열어볼 수 있어요.
            </Typography>

            <Alert severity="info" sx={{ textAlign: 'left' }}>
              <Typography variant="body2">
                편지 열람 정보는 "편지 목록"에서 확인하세요.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        {!success ? (
          <>
            <Button 
              onClick={handleClose} 
              disabled={isCreating}
              color="inherit"
            >
              취소
            </Button>
            <Button 
              onClick={handleCreateEnvelope}
              variant="contained"
              disabled={isCreating || !message.trim()}
              startIcon={isCreating ? <CircularProgress size={16} /> : null}
            >
              {isCreating ? '편지 생성 중...' : '편지 보내기'}
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleClose}
            variant="contained"
            fullWidth
          >
            확인
          </Button>
        )}
      </DialogActions>
    </StyledDialog>
  );
};

export default EnvelopeModal;
