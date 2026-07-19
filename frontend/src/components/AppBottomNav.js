import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { AutoStories, DynamicFeed } from '@mui/icons-material';

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
        <BottomNavigationAction label="이야기" icon={<AutoStories />} />
        <BottomNavigationAction label="내 피드" icon={<DynamicFeed />} />
      </BottomNavigation>
    </Paper>
  );
};

export default AppBottomNav;
