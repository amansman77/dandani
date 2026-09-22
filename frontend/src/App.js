import React, { useState, useEffect, useRef } from 'react';
import { Container, Box } from '@mui/material';
import OnboardingModal from './components/OnboardingModal';
import SplashScreen from './components/SplashScreen';
import ShareSheet from './components/ShareSheet';
import AppHeaderSection from './components/AppHeaderSection';
import AppBottomNav from './components/AppBottomNav';
import DailyPhrase from './components/DailyPhrase';
import PhraseHistory from './components/PhraseHistory';
import PostcardHistory from './components/PostcardHistory';
import { pushNavState, replaceNavState } from './utils/navHistory';
import { getUserIdInfo, markUserInitialized } from './utils/userId';
import { logOnboardingComplete, logSplashBypassed } from './utils/analytics';
import { isCampaignEntry } from './utils/attribution';
import { COLOR } from './theme/tokens';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const isPoppingNavRef = useRef(false);
  const isFirstVisit = useRef(getUserIdInfo().isNew).current;
  const [isNonKoreanUser, setIsNonKoreanUser] = useState(false);
  // 오늘의 문장 편집 트리거를 헤더(안내 버튼 옆)로 옮기면서, 편집 중인지/편집
  // 가능한 문장이 있는지를 App이 들고 DailyPhrase와 주고받는다.
  const [phraseEditing, setPhraseEditing] = useState(false);
  // 공유는 문장과 기록 값이 둘 다 필요해서 불리언이 아니라 문장 객체를 들고 있는다.
  const [activePhrase, setActivePhrase] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // 진입할 때마다 — 매일 아침 여는 앱이라 "열면 해가 뜬다"를 의식의 일부로 둔다.
  // 다만 광고를 타고 처음 들어온 사람에게는 그 의식이 아직 아무 의미가 없다.
  // 그 사람에겐 들어가기 전 절차를 전부 걷어내고 바로 문장 고르는 화면을 보여준다.
  const campaignEntry = useRef(isCampaignEntry()).current;
  const [splashOpen, setSplashOpen] = useState(!campaignEntry);

  const [shareOpen, setShareOpen] = useState(false);
  const [nuvBalance, setNuvBalance] = useState(null);

  useEffect(() => {
    // 예전엔 여기서 가입 선물 누브를 받아왔다. 누브가 "되새긴 날의 수"가 된
    // 뒤로는 받을 게 없어서, 그냥 지금까지 쌓인 값을 읽어온다.
    const initializeNuvWallet = async () => {
      try {
        const response = await fetch(`${API_URL}/api/nuv`, {
          headers: { 'X-User-ID': getUserIdInfo().userId },
        });
        if (!response.ok) return;
        const data = await response.json();
        setNuvBalance(data.balance);
      } catch (error) {
        // Wallet availability must not block the daily phrase flow.
      }
    };
    initializeNuvWallet();
  }, []);

  useEffect(() => {
    const { isNew } = getUserIdInfo();
    // 광고 유입에겐 온보딩 모달도 띄우지 않는다. 스플래시만 걷어내면 그 자리를
    // 온보딩이 대신 막아서, "바로 문장 고르기 화면"이라는 목적이 반만 이뤄진다.
    if (isNew && !campaignEntry) {
      setShowOnboarding(true);
    }
    if (campaignEntry) {
      // 스플래시를 안 띄웠다는 사실 자체를 남긴다. 이게 없으면 나중에
      // "splash_shown이 없는 것"이 이탈인지 우리가 건너뛴 것인지 구분이 안 된다.
      logSplashBypassed();
      markUserInitialized();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // 고정 배경 레이어가 못 덮는 틈에 흰색이 비치지 않도록 문서에도 바탕색을 둔다.
        backgroundColor: COLOR.surface.ring,
      }}
    >
      {/* 배경은 문서가 아니라 화면에 고정한다.
          예전엔 이 Box에 그라디언트를 걸었는데, 첫 화면이 문장 목록으로 바뀌면서
          문서 높이가 3000px를 넘자 그라디언트가 그 높이 전체로 늘어났다. 그래서
          스크롤 위치마다 전혀 다른 색이 보이고 화면이 따로 노는 느낌이 났다.
          고정하면 어디까지 스크롤하든 같은 아침 빛이 뒤에 깔린다. */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
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
          }}
        />
      </Box>

      {/* 앱은 뒤에서 그대로 초기화되고, 스플래시는 그 위를 덮었다 걷힌다 */}
      {splashOpen && <SplashScreen onDone={() => setSplashOpen(false)} />}
    <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
      <Box sx={{ pt: 2, pb: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* 편집 중엔 공유·편집을 둘 다 숨긴다 — 고쳐 쓰는 중에 공유하면 아직
            저장 안 된 옛 문장이 나가고, 편집 중의 "편집"은 아무 일도 안 한다.
            그 자리는 헤더 왼쪽의 "취소"가 대신한다. */}
        <AppHeaderSection
          isNonKoreanUser={isNonKoreanUser}
          onRestartOnboarding={handleRestartOnboarding}
          showEditPhrase={activeTab === 0 && Boolean(activePhrase) && !phraseEditing}
          onEditPhrase={() => setPhraseEditing(true)}
          isEditing={activeTab === 0 && phraseEditing}
          onCancelEdit={() => setPhraseEditing(false)}
          nuvBalance={nuvBalance}
        />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          {activeTab === 0 && (
            <DailyPhrase
              onViewHistory={() => handleTabChange(null, 1)}
              isEditing={phraseEditing}
              onEditingChange={setPhraseEditing}
              onActivePhraseChange={setActivePhrase}
              onShare={() => setShareOpen(true)}
              onNuvBalanceChange={setNuvBalance}
              onFirstPhraseCreated={isFirstVisit ? () => setShareOpen(true) : undefined}
            />
          )}

          {activeTab === 1 && <PhraseHistory />}
          {activeTab === 2 && <PostcardHistory />}
        </Box>

        <OnboardingModal
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
        />

        <ShareSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          phrase={activePhrase}
        />

      </Box>
    </Container>
    <AppBottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </Box>
  );
}

export default App;
