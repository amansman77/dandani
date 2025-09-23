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

  // 과거 기록인지 확인하는 함수
  const isPastRecord = (recordDate) => {
    if (!recordDate) return false;
    const recordTime = new Date(recordDate).getTime();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return recordTime < todayStart;
  };

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
      const userId = getUserId();
      
      // practice.day가 없으면 현재 챌린지의 현재 일차를 계산
      let practiceDay = practice.day;
      if (!practiceDay && challenge) {
        const now = new Date();
        const startDate = new Date(challenge.start_date);
        const dayDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        practiceDay = dayDiff + 1;
      }
      
      console.log('Fetching record with:', { challengeId: challenge.id, practiceDay, practice, userId });
      
      const response = await fetch(`${API_URL}/api/feedback/record?challengeId=${challenge.id}&practiceDay=${practiceDay}`, {
        headers: {
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString(),
          'X-User-ID': userId
        }
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
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
      const userId = getUserId();
      
      // practice.day가 없으면 현재 챌린지의 현재 일차를 계산
      let practiceDay = practice.day;
      if (!practiceDay && challenge) {
        const now = new Date();
        const startDate = new Date(challenge.start_date);
        const dayDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        practiceDay = dayDiff + 1;
      }
      
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
        if (onUpdate) {
          onUpdate(updatedRecord);
        }
        alert('기록이 수정되었습니다! ✨');
      } else {
        throw new Error('기록 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('기록 수정 중 오류가 발생했습니다.');
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
      'improved': '좋아졌어요',
      'same': '그대로예요',
      'worse': '나빠졌어요',
      'unknown': '잘 모르겠다'
    };
    return moodMap[moodChange] || moodChange;
  };

  const getHelpfulText = (wasHelpful) => {
    const helpfulMap = {
      'yes': '네',
      'no': '아니오',
      'unknown': '잘 모르겠다'
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
            실천 기록 확인 📝
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
              기록일: {new Date(record.created_at).toLocaleDateString('ko-KR')}
            </Typography>
            {isPastRecord(record.created_at) && (
              <Chip 
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
                  <Chip 
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
                실천 후 기분 변화
              </Typography>
              
              {isEditing ? (
                <RadioGroup
                  value={editData.moodChange}
                  onChange={(e) => setEditData({...editData, moodChange: e.target.value})}
                >
                  <FormControlLabel value="improved" control={<Radio />} label="좋아졌어요" />
                  <FormControlLabel value="same" control={<Radio />} label="그대로예요" />
                  <FormControlLabel value="worse" control={<Radio />} label="나빠졌어요" />
                  <FormControlLabel value="unknown" control={<Radio />} label="잘 모르겠다" />
                </RadioGroup>
              ) : (
                <Chip 
                  label={getMoodChangeText(record.mood_change)}
                  color={getMoodChangeColor(record.mood_change)}
                  variant="outlined"
                  size="medium"
                />
              )}
            </RecordBox>

            <RecordBox>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                실천의 도움 여부
              </Typography>
              
              {isEditing ? (
                <RadioGroup
                  value={editData.wasHelpful}
                  onChange={(e) => setEditData({...editData, wasHelpful: e.target.value})}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="네" />
                  <FormControlLabel value="no" control={<Radio />} label="아니오" />
                  <FormControlLabel value="unknown" control={<Radio />} label="잘 모르겠다" />
                </RadioGroup>
              ) : (
                <Chip 
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
              아직 실천 기록이 없습니다.
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
    </StyledDialog>
  );
};

export default PracticeRecordModal;
