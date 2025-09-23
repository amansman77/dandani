import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
  ContentCopy as CopyIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
} from '@mui/icons-material';
import { deleteEnvelope, updateAllEnvelopeStatuses } from '../utils/envelopeStorage';


const EnvelopeList = ({ open, onClose }) => {
  const [envelopes, setEnvelopes] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [envelopeToDelete, setEnvelopeToDelete] = useState(null);

  useEffect(() => {
    if (open) {
      // 편지 상태 업데이트
      const updatedEnvelopes = updateAllEnvelopeStatuses();
      setEnvelopes(updatedEnvelopes);
    }
  }, [open]);

  const handleDeleteClick = (envelope) => {
    setEnvelopeToDelete(envelope);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (envelopeToDelete) {
      deleteEnvelope(envelopeToDelete.id);
      setEnvelopes(prev => prev.filter(env => env.id !== envelopeToDelete.id));
      setDeleteDialogOpen(false);
      setEnvelopeToDelete(null);
    }
  };


  const handleCopyPassword = async (password) => {
    try {
      await navigator.clipboard.writeText(password);
      alert('비밀번호가 복사되었습니다!');
    } catch (err) {
      console.error('Password copy failed:', err);
      alert('비밀번호 복사에 실패했습니다.');
    }
  };

  const handleOpenEnvelope = (shareUrl) => {
    window.open(shareUrl, '_blank');
  };

  const getStatusChip = (envelope) => {
    const now = new Date();
    const unlockDate = new Date(envelope.unlockAt);
    const daysUntilUnlock = Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24));

    if (envelope.status === 'unlocked') {
      return (
        <Chip
          icon={<UnlockIcon />}
          label="열람 가능"
          color="success"
          size="small"
        />
      );
    } else if (daysUntilUnlock <= 0) {
      return (
        <Chip
          icon={<UnlockIcon />}
          label="열람 가능"
          color="success"
          size="small"
        />
      );
    } else {
      return (
        <Chip
          icon={<LockIcon />}
          label={`${daysUntilUnlock}일 후`}
          color="default"
          size="small"
        />
      );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          내가 보낸 편지들
        </Typography>
      </DialogTitle>

      <DialogContent>
        {envelopes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              아직 보낸 편지가 없습니다.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              챌린지 카드에서 "나에게 편지쓰기" 버튼을 눌러 첫 번째 편지를 보내보세요!
            </Typography>
          </Box>
        ) : (
          <List>
            {envelopes.map((envelope, index) => (
              <React.Fragment key={envelope.id}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {envelope.challengeName}
                        </Typography>
                        {getStatusChip(envelope)}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          완료한 나에게 보낸 메시지
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          생성일: {formatDate(envelope.createdAt)} | 
                          열람일: {formatDate(envelope.unlockAt)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyPassword(envelope.password)}
                        title="비밀번호 복사"
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEnvelope(envelope.shareUrl)}
                        title="편지 열기"
                      >
                        <OpenIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(envelope)}
                        title="삭제"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < envelopes.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {envelopes.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>팁:</strong> 편지를 열 때는 비밀번호가 필요합니다. 
              비밀번호를 안전한 곳에 보관하세요.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          닫기
        </Button>
      </DialogActions>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      >
        <DialogTitle>편지 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            정말로 이 편지를 삭제하시겠습니까? 
            삭제된 편지는 복구할 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            취소
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default EnvelopeList;
