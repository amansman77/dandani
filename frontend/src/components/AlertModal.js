import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Fade
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { CheckCircle, Error, Info, Warning } from '@mui/icons-material';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    padding: theme.spacing(1),
    minWidth: '300px',
    maxWidth: '400px'
  }
}));

const IconBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: theme.spacing(2)
}));

const AlertModal = ({ 
  open, 
  onClose, 
  message, 
  type = 'info' // 'success', 'error', 'warning', 'info'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />;
      case 'error':
        return <Error sx={{ fontSize: 48, color: 'error.main' }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 48, color: 'warning.main' }} />;
      default:
        return <Info sx={{ fontSize: 48, color: 'info.main' }} />;
    }
  };

  return (
    <StyledDialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ 
        timeout: 600,
        easing: { enter: 'cubic-bezier(0.0, 0, 0.2, 1)', exit: 'cubic-bezier(0.4, 0, 1, 1)' }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(2px)',
          transition: 'opacity 0.6s cubic-bezier(0.0, 0, 0.2, 1)'
        }
      }}
    >
      <DialogContent sx={{ textAlign: 'center', py: 3 }}>
        <IconBox>
          {getIcon()}
        </IconBox>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          color={type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'primary'}
          sx={{ minWidth: '100px' }}
        >
          확인
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default AlertModal;

