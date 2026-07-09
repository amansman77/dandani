import React, { useState } from 'react';
import { Alert, Box, Divider, IconButton, ListItemIcon, Menu, MenuItem, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { AccountCircle, Help as HelpIcon, Logout as LogoutIcon } from '@mui/icons-material';

const tabStyle = {
  fontSize: '1.1rem',
  fontWeight: 'bold',
  color: 'text.primary',
  '&.Mui-selected': {
    color: 'primary.main',
    fontWeight: 700
  }
};

const AppHeaderSection = ({
  isNonKoreanUser,
  activeTab,
  onTabChange,
  onRestartOnboarding,
  authUser,
  onLogout,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleAccountClick = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    handleMenuClose();
    onLogout();
  };

  return (
    <>
      <Box sx={{ position: 'relative', textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          단단이
        </Typography>
        <Typography
          variant="h6"
          color="text.primary"
          gutterBottom
          sx={{
            fontWeight: 600,
            fontSize: '1.1rem',
            opacity: 0.8
          }}
        >
          감정적으로 힘들 때 중심을 잃지 않게 해주는 동반자
        </Typography>

        <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: 0.5 }}>
          {authUser && (
            <>
              <Tooltip title={authUser.name || authUser.email || '계정'}>
                <IconButton onClick={handleAccountClick} sx={{ color: 'primary.main' }}>
                  <AccountCircle />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem disabled sx={{ opacity: '1 !important' }}>
                  <Typography variant="body2" color="text.secondary">
                    {authUser.name || authUser.email}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                  로그아웃
                </MenuItem>
              </Menu>
            </>
          )}
          <Tooltip title="온보딩 다시 보기 (Ctrl+Shift+H)">
            <IconButton
              onClick={onRestartOnboarding}
              sx={{ color: 'primary.main', '&:hover': { backgroundColor: 'primary.50' } }}
            >
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isNonKoreanUser && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          이 서비스는 한국어로 제공됩니다.
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={onTabChange} centered>
          <Tab label="한 걸음" sx={tabStyle} />
          <Tab label="기록" sx={tabStyle} />
          <Tab label="컬렉션" sx={tabStyle} />
        </Tabs>
      </Box>
    </>
  );
};

export default AppHeaderSection;
