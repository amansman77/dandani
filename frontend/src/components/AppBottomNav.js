import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

const NavDot = styled('span')({
  display: 'block',
  width: 7,
  height: 7,
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
            color: '#3c3a34',
            opacity: 0.55,
            fontFamily: '"Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important',
          },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.7rem' },
          '& .MuiBottomNavigationAction-icon': { marginBottom: '9px' },
          '& .Mui-selected': { color: '#b06a45 !important', opacity: 1 },
        }}
      >
        <BottomNavigationAction label="오늘" icon={<NavDot />} />
        <BottomNavigationAction label="기록" icon={<NavDot />} />
      </BottomNavigation>
    </Paper>
  );
};

export default AppBottomNav;
