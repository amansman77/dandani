import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { PostHogProvider } from 'posthog-js/react';
import App from './App';
import { initAnalytics } from './utils/analytics';
import { COLOR, FONT } from './theme/tokens';

// 팔레트엔 원래 Story Feed 시절 색(파랑 #3f7198 / 빨강 #df4846 / 초록 …)이
// 그대로 남아 있었는데, 이 값들을 참조하는 파일은 전부 피벗 전에 화면에서
// 빠진 컴포넌트들뿐이었다. 지금 실제로 보이는 화면은 팔레트를 전혀 안 거치고
// hex를 직접 박아 쓰고 있었다 — 그래서 팔레트를 진짜 쓰는 색으로 맞췄다.
// 이러면 색을 명시 안 한 MUI 기본 동작(예: CircularProgress의 primary)도
// 앱 톤을 따라온다. secondary/success/warning/info와 customColors는 죽은
// 컴포넌트만 쓰던 값이라 뺐다 — MUI 기본값이 대신 들어간다.
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: COLOR.accent.main,
      light: COLOR.accent.eyebrow,
      dark: COLOR.accent.strong,
      contrastText: '#ffffff',
    },
    background: {
      default: COLOR.surface.ring,
      paper: COLOR.surface.sheet,
    },
    text: {
      primary: COLOR.text.primary,
      secondary: COLOR.text.body,
    },
    divider: COLOR.line.main,
    error: { main: COLOR.error },
  },
  typography: {
    fontFamily: FONT.sans,
  },
});

// PostHog 설정
const posthogApiKey = process.env.REACT_APP_POSTHOG_KEY;
const posthogHost = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';

// PostHog API Key 확인 (프로덕션에서도 경고 표시)
if (!posthogApiKey) {
  console.warn('[PostHog] REACT_APP_POSTHOG_KEY is not set. PostHog analytics will not work.');
}

const posthogOptions = {
  api_host: posthogHost,
  person_profiles: 'identified_only', // 익명 사용자도 추적
  capture_pageview: false, // 수동으로 페이지뷰를 캡처하므로 자동 캡처 비활성화
  capture_pageleave: true, // 페이지 이탈 캡처
  autocapture: true, // 자동 이벤트 캡처 활성화
  loaded: (posthog) => {
    console.log('[PostHog] Initialized successfully', { 
      apiKey: posthogApiKey ? `${posthogApiKey.substring(0, 10)}...` : 'MISSING',
      host: posthogHost 
    });
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
      apiKey={posthogApiKey}
      options={posthogOptions}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </PostHogProvider>
  </React.StrictMode>
); 