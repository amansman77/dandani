import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { WbSunny, DynamicFeed } from '@mui/icons-material';

const AppBottomNav = ({ activeTab, onTabChange }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation value={activeTab} onChange={onTabChange} showLabels>
        <BottomNavigationAction label="오늘" icon={<WbSunny />} />
        <BottomNavigationAction label="기록" icon={<DynamicFeed />} />
      </BottomNavigation>
    </Paper>
  );
};

export default AppBottomNav;
