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
        background: 'linear-gradient(180deg, #f8f1e6 0%, #f3ece2 100%)',
        borderTop: '1px solid #e2dbc9',
      }}
    >
      <BottomNavigation
        value={activeTab}
        onChange={onTabChange}
        showLabels
        sx={{
          background: 'transparent',
          '& .MuiBottomNavigationAction-root': { color: '#a39a89' },
          '& .Mui-selected': { color: '#a9603a !important' },
        }}
      >
        <BottomNavigationAction label="오늘" icon={<WbSunny />} />
        <BottomNavigationAction label="기록" icon={<DynamicFeed />} />
      </BottomNavigation>
    </Paper>
  );
};

export default AppBottomNav;
