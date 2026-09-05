import React, { useState, useEffect, useRef } from 'react';
import { Container, Box } from '@mui/material';
import OnboardingModal from './components/OnboardingModal';
import AppHeaderSection from './components/AppHeaderSection';
import AppBottomNav from './components/AppBottomNav';
import DailyPhrase from './components/DailyPhrase';
import PhraseHistory from './components/PhraseHistory';
import { pushNavState, replaceNavState } from './utils/navHistory';
import { getUserIdInfo, markUserInitialized } from './utils/userId';
import { logOnboardingComplete } from './utils/analytics';
import { COLOR } from './theme/tokens';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const isPoppingNavRef = useRef(false);
  const [isNonKoreanUser, setIsNonKoreanUser] = useState(false);
  // 오늘의 문구 편집 트리거를 헤더(안내 버튼 옆)로 옮기면서, 편집 중인지/편집
  // 가능한 문구가 있는지를 App이 들고 DailyPhrase와 주고받는다.
  const [phraseEditing, setPhraseEditing] = useState(false);
  const [hasActivePhrase, setHasActivePhrase] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const { isNew } = getUserIdInfo();
    if (isNew) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const browserLanguage = navigator.language || '';
    setIsNonKoreanUser(!browserLanguage.toLowerCase().startsWith('ko'));
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (!isPoppingNavRef.current) {
      pushNavState({ tab: newValue });
    }
  };

  // 모바일(iOS 스와이프 백 등) 뒤로가기가 앱 자체를 빠져나가지 않고
  // 탭 전환을 되돌리도록, 브라우저 히스토리에 탭 상태를 기록/복원한다
  useEffect(() => {
    replaceNavState({ tab: 0 });

    const handlePopState = (event) => {
      const nextTab = event.state?.tab ?? 0;
      isPoppingNavRef.current = true;
      setActiveTab(nextTab);
      isPoppingNavRef.current = false;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOnboardingComplete = () => {
    markUserInitialized();
    logOnboardingComplete();
    setShowOnboarding(false);
  };

  const handleRestartOnboarding = () => {
    setShowOnboarding(true);
  };

  // 키보드 단축키 처리 (Ctrl/Cmd + Shift + H로 온보딩 재시작)
  useEffect(() => {
    const handleKeyPress = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        handleRestartOnboarding();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // 로딩/에러 화면은 DailyPhrase가 자기 것만 직접 들고 있다. 예전엔 App이
  // 챌린지 데이터를 기다리며 전체 화면을 스피너로 덮었는데, 그 데이터를 쓰는
  // 화면이 없어진 지금은 껍데기(헤더·배경·하단탭)를 곧바로 그리는 게 맞다.
  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: COLOR.gradient,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,225,190,0.55) 0%, rgba(255,225,190,0) 70%)',
          pointerEvents: 'none',
        }}
      />
    <Container maxWidth="sm" sx={{ position: 'relative' }}>
      <Box sx={{ pt: 2, pb: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppHeaderSection
          isNonKoreanUser={isNonKoreanUser}
          onRestartOnboarding={handleRestartOnboarding}
          showEditPhrase={activeTab === 0 && hasActivePhrase}
          onEditPhrase={() => setPhraseEditing(true)}
          isEditing={activeTab === 0 && phraseEditing}
          onCancelEdit={() => setPhraseEditing(false)}
        />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          {activeTab === 0 && (
            <DailyPhrase
              onViewHistory={() => handleTabChange(null, 1)}
              isEditing={phraseEditing}
              onEditingChange={setPhraseEditing}
              onActivePhraseChange={setHasActivePhrase}
            />
          )}

          {activeTab === 1 && <PhraseHistory />}
        </Box>

        <OnboardingModal
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
        />

      </Box>
    </Container>
    <AppBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </Box>
  );
}

export default App;
