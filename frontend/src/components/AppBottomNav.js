import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { WbSunny, DynamicFeed } from '@mui/icons-material';

const AppBottomNav = ({ activeTab, onTabChange }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'transparent',
        boxShadow: 'none',
        borderTop: '1px solid rgba(128,128,128,0.18)',
      }}
    >
      <BottomNavigation
        value={activeTab}
        onChange={onTabChange}
        showLabels
        sx={{
          background: 'transparent',
          '& .MuiBottomNavigationAction-root': { color: '#3c3a34', opacity: 0.55 },
          '& .Mui-selected': { color: '#b06a45 !important', opacity: 1 },
        }}
      >
        <BottomNavigationAction label="오늘" icon={<WbSunny />} />
        <BottomNavigationAction label="기록" icon={<DynamicFeed />} />
      </BottomNavigation>
    </Paper>
  );
};

export default AppBottomNav;
