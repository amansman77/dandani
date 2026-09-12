import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import { FONT } from '../theme/tokens';

const NavDot = styled('span')({
  display: 'block',
  width: 7,
  height: 7,
  marginBottom: 9,
  borderRadius: '50%',
  backgroundColor: 'currentColor',
});

const AppBottomNav = ({ activeTab, onTabChange, ink }) => {
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
        // 투명이라 스크롤하는 문장 카드가 탭 글씨 뒤로 비쳐 보였다(목록이 길어지며
        // 드러남). 배경을 화면에 고정한 뒤로는 화면 맨 아래가 항상 그라디언트의
        // 끝색이라, 그 색을 그대로 칠하면 이음매 없이 맞는다.
        background: ink.navBg,
        boxShadow: 'none',
        borderTop: `1px solid ${ink.hairline}`,
        transition: 'background-color .45s ease',
      }}
    >
      <BottomNavigation
        value={activeTab}
        onChange={onTabChange}
        showLabels
        sx={{
          background: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            color: ink.muted,
            opacity: 0.72,
            fontFamily: FONT.serif,
          },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.7rem' },
          '& .Mui-selected': { color: ink.accent, opacity: 1 },
        }}
      >
        <BottomNavigationAction label="오늘" icon={<NavDot />} />
        <BottomNavigationAction label="기록" icon={<NavDot />} />
      </BottomNavigation>
    </Paper>
  );
};

export default AppBottomNav;
