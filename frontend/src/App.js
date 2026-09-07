import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Box, Snackbar } from '@mui/material';
import OnboardingModal from './components/OnboardingModal';
import SplashScreen from './components/SplashScreen';
import AppHeaderSection from './components/AppHeaderSection';
import AppBottomNav from './components/AppBottomNav';
import DailyPhrase from './components/DailyPhrase';
import PhraseHistory from './components/PhraseHistory';
import { pushNavState, replaceNavState } from './utils/navHistory';
import { getUserIdInfo, markUserInitialized } from './utils/userId';
import { logOnboardingComplete, logPhraseShared } from './utils/analytics';
import { COLOR } from './theme/tokens';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const isPoppingNavRef = useRef(false);
  const [isNonKoreanUser, setIsNonKoreanUser] = useState(false);
  // 오늘의 문구 편집 트리거를 헤더(안내 버튼 옆)로 옮기면서, 편집 중인지/편집
  // 가능한 문구가 있는지를 App이 들고 DailyPhrase와 주고받는다.
  const [phraseEditing, setPhraseEditing] = useState(false);
  // 공유는 문장과 기록 값이 둘 다 필요해서 불리언이 아니라 문구 객체를 들고 있는다.
  const [activePhrase, setActivePhrase] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // 진입할 때마다 — 매일 아침 여는 앱이라 "열면 해가 뜬다"를 의식의 일부로 둔다
  const [splashOpen, setSplashOpen] = useState(true);

  const [shareNotice, setShareNotice] = useState('');

  // 공유하는 링크에도 UTM을 달아둔다 — 그래야 캠페인 리포트에서 인스타 광고로
  // 들어온 사람과 지인 공유로 들어온 사람이 갈라져 보인다.
  const handleShare = useCallback(async () => {
    if (!activePhrase) return;
    const url = 'https://dandani.yetimates.com/?utm_source=share&utm_medium=organic&utm_campaign=phrase_share';
    const text = activePhrase.visit_days
      ? `"${activePhrase.phrase}" — ${activePhrase.visit_days}번째 아침`
      : `"${activePhrase.phrase}"`;

    // navigator.share는 OS 공유 시트를 띄우므로, 그 자체가 "어디로 보낼지"를
    // 한 번 더 고르는 확인 단계다. 여기서 따로 확인 화면을 겹칠 필요가 없다.
    try {
      if (navigator.share) {
        await navigator.share({ title: '단단이', text, url });
        logPhraseShared('share_sheet');
        return;
      }
    } catch (err) {
      // 사용자가 공유 시트를 그냥 닫으면 AbortError — 실패가 아니라 취소다.
      if (err && err.name === 'AbortError') return;
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      logPhraseShared('clipboard');
      setShareNotice('문장과 링크를 복사했어요');
    } catch (err) {
      setShareNotice('공유를 지원하지 않는 환경이에요');
    }
  }, [activePhrase]);

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
      {/* 앱은 뒤에서 그대로 초기화되고, 스플래시는 그 위를 덮었다 걷힌다 */}
      {splashOpen && <SplashScreen onDone={() => setSplashOpen(false)} />}
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
        {/* 편집 중엔 공유·편집을 둘 다 숨긴다 — 고쳐 쓰는 중에 공유하면 아직
            저장 안 된 옛 문장이 나가고, 편집 중의 "편집"은 아무 일도 안 한다.
            그 자리는 헤더 왼쪽의 "취소"가 대신한다. */}
        <AppHeaderSection
          isNonKoreanUser={isNonKoreanUser}
          onRestartOnboarding={handleRestartOnboarding}
          showEditPhrase={activeTab === 0 && Boolean(activePhrase) && !phraseEditing}
          onEditPhrase={() => setPhraseEditing(true)}
          showShare={activeTab === 0 && Boolean(activePhrase) && !phraseEditing}
          onShare={handleShare}
          isEditing={activeTab === 0 && phraseEditing}
          onCancelEdit={() => setPhraseEditing(false)}
        />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          {activeTab === 0 && (
            <DailyPhrase
              onViewHistory={() => handleTabChange(null, 1)}
              isEditing={phraseEditing}
              onEditingChange={setPhraseEditing}
              onActivePhraseChange={setActivePhrase}
            />
          )}

          {activeTab === 1 && <PhraseHistory />}
        </Box>

        <OnboardingModal
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
        />

        {/* OS 공유 시트가 없는 브라우저(주로 데스크톱)에선 클립보드로 대신
            복사하는데, 아무 반응이 없으면 눌린 건지 모른다. */}
        <Snackbar
          open={Boolean(shareNotice)}
          autoHideDuration={2400}
          onClose={() => setShareNotice('')}
          message={shareNotice}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 88 } }}
        />

      </Box>
    </Container>
    <AppBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </Box>
  );
}

export default App;
