import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

const theme = createTheme({
  palette: {
    mode: 'light',
    // 메인 컬러
    primary: {
      main: '#3f7198', // 메인 블루
      light: '#5a8bb0',
      dark: '#2d5a7a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#df4846', // 메인 레드
      light: '#e66b69',
      dark: '#c73d3b',
      contrastText: '#ffffff',
    },
    // 서브 컬러
    success: {
      main: '#579f59', // 메인 그린
      light: '#7bb17d',
      dark: '#4a8a4c',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ee7c6f', // 서브 핑크
      light: '#f1998e',
      dark: '#d66558',
      contrastText: '#ffffff',
    },
    info: {
      main: '#a5a498', // 서브 그레이
      light: '#b8b7ac',
      dark: '#8f8e84',
      contrastText: '#ffffff',
    },
    // 배경 & 포인트
    background: {
      default: '#faf5e9', // 배경 베이지
      paper: '#ffffff',
    },
    text: {
      primary: '#21211c', // 포인트 블랙
      secondary: '#6b6b6b', // 더 진한 서브 그레이
    },
    divider: '#ddd9cd', // 보조 그레이 톤
  },
  typography: {
    fontFamily: '"Noto Serif KR", "Roboto", "Helvetica", "Arial", serif',
  },
  // 커스텀 색상 추가
  customColors: {
    mainBlue: '#3f7198',
    mainRed: '#df4846',
    mainGreen: '#579f59',
    subPink: '#ee7c6f',
    subGray: '#a5a498',
    backgroundGray: '#ddd9cd',
    backgroundBeige: '#faf5e9',
    pointBlack: '#21211c',
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
); 