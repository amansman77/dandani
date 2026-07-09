import React from 'react';
import { Box, Button, Dialog, DialogContent, Typography } from '@mui/material';
import { getUserId } from '../utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const AuthModal = ({ open, onClose }) => {
  const handleLogin = () => {
    const anonymousId = getUserId();
    localStorage.setItem('dandaniAuthIntent', 'create_identity');
    window.location.href = `${API_URL}/api/auth/google?anonymous_id=${encodeURIComponent(anonymousId)}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
        <Box
          component="img"
          src="/assets/images/dandani-character/character-default.png"
          alt="단단이"
          sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 2, mb: 2 }}
        />
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
          이건 너만의 단단이야.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          계속 간직하려면 로그인이 필요해.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleLogin}
          sx={{ mb: 1.5 }}
        >
          Google로 로그인
        </Button>
        <Button fullWidth variant="text" color="inherit" onClick={onClose}>
          나중에 할게
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
