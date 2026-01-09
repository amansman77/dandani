import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { PostHogProvider } from 'posthog-js/react';
import App from './App';
import { initAnalytics } from './utils/analytics';

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

// PostHog 설정
const posthogOptions = {
  api_host: process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com',
  person_profiles: 'identified_only', // 익명 사용자도 추적
  capture_pageview: false, // 수동으로 페이지뷰를 캡처하므로 자동 캡처 비활성화
  capture_pageleave: true, // 페이지 이탈 캡처
  autocapture: true, // 자동 이벤트 캡처 활성화
  loaded: (posthog) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PostHog] Initialized successfully');
    }
    // PostHog 인스턴스를 window에 명시적으로 설정
    if (typeof window !== 'undefined') {
      window.posthog = posthog;
    }
    // PostHog 초기화 완료 후 analytics 초기화
    // 약간의 지연을 두어 window.posthog가 완전히 설정되도록 함
    setTimeout(() => {
      initAnalytics();
    }, 200);
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PostHogProvider 
      apiKey={process.env.REACT_APP_POSTHOG_KEY}
      options={posthogOptions}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </PostHogProvider>
  </React.StrictMode>
); 