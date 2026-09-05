import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { COLOR, FONT } from '../theme/tokens';

const NavDot = styled('span')({
  display: 'block',
  width: 7,
  height: 7,
  marginBottom: 9,
  borderRadius: '50%',
  backgroundColor: 'currentColor',
});

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
          '& .MuiBottomNavigationAction-root': {
            color: COLOR.text.navIdle,
            opacity: 0.55,
            fontFamily: FONT.serif,
          },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.7rem' },
          '& .Mui-selected': { color: COLOR.accent.strong, opacity: 1 },
        }}
      >
        <BottomNavigationAction label="오늘" icon={<NavDot />} />
        <BottomNavigationAction label="기록" icon={<NavDot />} />
      </BottomNavigation>
    </Paper>
  );
};

export default AppBottomNav;
