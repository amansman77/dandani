import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Edit, Check, Close } from '@mui/icons-material';
import { getUserId } from '../utils/userId';
import { getClampedPracticeDay, isPastRecord, addStartedAtHeader, formatDateToKorean } from '../utils/challengeDay';
import { logFeedbackSubmit } from '../utils/analytics';
import AlertModal from './AlertModal';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    padding: theme.spacing(1),
    maxWidth: '600px'
  }
}));

const RecordBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.grey[200]}`
}));

const StyledChip = styled(Chip)({
  '&.MuiChip-outlined': {
    border: 'none'
  }
});

const PracticeRecordModal = ({ 
  open, 
  onClose, 
  practice, 
  challenge,
  onUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    practiceDescription: '',
    moodChange: '',
    wasHelpful: ''
  });
  const [alertModal, setAlertModal] = useState({
    open: false,
    message: '',
    type: 'info'
  });

  // 과거 기록 판단은 utils/challengeDay.js의 공통 함수 사용

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
      const userId = getUserId();
      
      const practiceDay = getClampedPracticeDay(practice, challenge);
      
      console.log('Fetching record with:', { 
        challengeId: challenge.id, 
        practiceDay, 
        practiceDayFromPractice: practice?.day,
        practice, 
        userId 
      });
      
      const headers = addStartedAtHeader({
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString(),
        'X-User-ID': userId
      }, challenge.id);
      
      const response = await fetch(`${API_URL}/api/feedback/record?challengeId=${challenge.id}&practiceDay=${practiceDay}`, {
        headers
      });
      
      if (response.ok) {
        const recordData = await response.json();
        console.log('Record data received:', recordData);
        setRecord(recordData);
        setEditData({
          practiceDescription: recordData.practice_description || '',
          moodChange: recordData.mood_change || '',
          wasHelpful: recordData.was_helpful || ''
        });
      } else {
        console.error('Failed to fetch record, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch record:', error);
    } finally {
      setLoading(false);
    }
  }, [practice, challenge]);

  // 기록 데이터 가져오기
  useEffect(() => {
    if (open && practice && challenge) {
      fetchRecord();
    }
  }, [open, practice, challenge, fetchRecord]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editData.practiceDescription.trim() || !editData.moodChange || !editData.wasHelpful) {
      setAlertModal({
        open: true,
        message: '모든 필드를 입력해주세요.',
        type: 'warning'
      });
      return;
    }

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
      const userId = getUserId();
      
      const practiceDay = getClampedPracticeDay(practice, challenge);
      
      const response = await fetch(`${API_URL}/api/feedback/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          challengeId: challenge.id,
          practiceDay: practiceDay,
          moodChange: editData.moodChange,
          wasHelpful: editData.wasHelpful,
          practiceDescription: editData.practiceDescription.trim()
        })
      });
      
      if (response.ok) {
        const updatedRecord = await response.json();
        setRecord(updatedRecord);
        setIsEditing(false);
        
        // 피드백 제출 이벤트 로깅 (PostHog 포함)
        logFeedbackSubmit(
          challenge.id,
          practiceDay,
          editData.moodChange,
          editData.wasHelpful
        );
        
        if (onUpdate) {
          onUpdate(updatedRecord);
        }
        setAlertModal({
          open: true,
          message: '기록이 수정되었습니다! ✨',
          type: 'success'
        });
      } else {
        throw new Error('기록 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update error:', error);
      setAlertModal({
        open: true,
        message: '기록 수정 중 오류가 발생했습니다.',
        type: 'error'
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // 원래 데이터로 복원
    if (record) {
      setEditData({
        practiceDescription: record.practice_description || '',
        moodChange: record.mood_change || '',
        wasHelpful: record.was_helpful || ''
      });
    }
  };

  const getMoodChangeText = (moodChange) => {
    const moodMap = {
      'improved': '마음이 좀 나아졌어요',
      'same': '그냥 그런 것 같아요',
      'worse': '오히려 더 힘들어졌어요',
      'unknown': '잘 모르겠다'
    };
    return moodMap[moodChange] || moodChange;
  };

  const getHelpfulText = (wasHelpful) => {
    const helpfulMap = {
      'yes': '네, 도움이 되었어요',
      'no': '아니요, 별로였어요',
      'unknown': '잘 모르겠어요'
    };
    return helpfulMap[wasHelpful] || wasHelpful;
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

  if (loading) {
    return (
      <StyledDialog 
        open={open} 
        onClose={onClose} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      >
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>기록을 불러오는 중...</Typography>
          </Box>
        </DialogContent>
      </StyledDialog>
    );
  }

  return (
    <StyledDialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            오늘의 따뜻한 기록 📝
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {challenge?.name} - {practice?.day}일차
        </Typography>
        {record && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              기록일: {formatDateToKorean(record.created_at)}
            </Typography>
            {isPastRecord(record.created_at) && (
              <StyledChip 
                label="과거 기록" 
                size="small" 
                color="default" 
                variant="outlined"
                sx={{ fontSize: '0.6rem', height: '20px' }}
              />
            )}
          </Box>
        )}
      </DialogTitle>
      
      <DialogContent>
        {record ? (
          <>
            <RecordBox>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  실천한 내용
                </Typography>
                {!isEditing && !isPastRecord(record.created_at) && (
                  <IconButton onClick={handleEdit} size="small" color="primary">
                    <Edit />
                  </IconButton>
                )}
                {!isEditing && isPastRecord(record.created_at) && (
                  <StyledChip 
                    label="과거 기록" 
                    size="small" 
                    color="default" 
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                )}
              </Box>
              
              {isEditing ? (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={editData.practiceDescription}
                  onChange={(e) => setEditData({...editData, practiceDescription: e.target.value})}
                  variant="outlined"
                  required
                />
              ) : (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {record.practice_description}
                </Typography>
              )}
            </RecordBox>

            <RecordBox>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                실천 후 마음은 어떠셨나요?
              </Typography>
              
              {isEditing ? (
                <RadioGroup
                  value={editData.moodChange}
                  onChange={(e) => setEditData({...editData, moodChange: e.target.value})}
                >
                  <FormControlLabel value="improved" control={<Radio />} label="마음이 좀 나아졌어요" />
                  <FormControlLabel value="same" control={<Radio />} label="그냥 그런 것 같아요" />
                  <FormControlLabel value="worse" control={<Radio />} label="오히려 더 힘들어졌어요" />
                  <FormControlLabel value="unknown" control={<Radio />} label="잘 모르겠다" />
                </RadioGroup>
              ) : (
                <StyledChip 
                  label={getMoodChangeText(record.mood_change)}
                  color={getMoodChangeColor(record.mood_change)}
                  variant="outlined"
                  size="medium"
                />
              )}
            </RecordBox>

            <RecordBox>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                이 실천이 도움이 되었나요?
              </Typography>
              
              {isEditing ? (
                <RadioGroup
                  value={editData.wasHelpful}
                  onChange={(e) => setEditData({...editData, wasHelpful: e.target.value})}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="네, 도움이 되었어요" />
                  <FormControlLabel value="no" control={<Radio />} label="아니요, 별로였어요" />
                  <FormControlLabel value="unknown" control={<Radio />} label="잘 모르겠어요" />
                </RadioGroup>
              ) : (
                <StyledChip 
                  label={getHelpfulText(record.was_helpful)}
                  color={record.was_helpful === 'yes' ? 'success' : record.was_helpful === 'no' ? 'error' : 'default'}
                  variant="outlined"
                  size="medium"
                />
              )}
            </RecordBox>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              아직 기록이 없어요. 오늘의 따뜻한 순간을 기록해보세요.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {isEditing ? (
          <>
            <Button onClick={handleCancel} color="inherit">
              취소
            </Button>
            <Button 
              onClick={handleSave} 
              variant="contained" 
              startIcon={<Check />}
              disabled={!editData.practiceDescription.trim() || !editData.moodChange || !editData.wasHelpful}
            >
              저장
            </Button>
          </>
        ) : (
          <Button onClick={onClose} variant="contained">
            닫기
          </Button>
        )}
      </DialogActions>

      {/* 알림 모달 */}
      <AlertModal
        open={alertModal.open}
        onClose={() => setAlertModal({ ...alertModal, open: false })}
        message={alertModal.message}
        type={alertModal.type}
      />
    </StyledDialog>
  );
};

export default PracticeRecordModal;
