import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Container, Box, Typography, Paper, CircularProgress, Button, Fade, Divider } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import ChatInterface from './components/ChatInterface';
import ChallengeContext from './components/ChallengeContext';
import ChallengeDetail from './components/ChallengeDetail';
import PracticeRecordModal from './components/PracticeRecordModal';
import PracticeCompletionModal from './components/PracticeCompletionModal';
import PracticeHistory from './components/PracticeHistory';
import OnboardingModal from './components/OnboardingModal';
import EnvelopeModal from './components/EnvelopeModal';
import EnvelopeList from './components/EnvelopeList';
import ChallengeSelector from './components/ChallengeSelector';
import AlertModal from './components/AlertModal';
import AppHeaderSection from './components/AppHeaderSection';
import YesterdayRecordSection from './components/YesterdayRecordSection';
import { useChallengeData } from './hooks/useChallengeData';
import { getUserId, getUserIdInfo, markUserInitialized } from './utils/userId';
import { getSelectedChallenge, clearSelectedChallenge, validateAndFixStartedAt } from './utils/challengeSelection';
import { logOnboardingComplete, logReturnNextDay } from './utils/analytics';
import { calculateChallengeEndDate, addStartedAtHeader, calculateChallengeStatus, calculateChallengeMetrics, parseDatabaseDate } from './utils/challengeDay';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: '35px',
  marginTop: theme.spacing(4),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  backgroundColor: '#3f7198', // 메인 블루 배경
  color: 'white', // 흰색 텍스트
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.15)',
  },
}));

// 오늘의 추천 실천 카드 (높이 확장 애니메이션 적용)
const PracticeCard = styled(Paper)(({ theme }) => ({
  padding: '35px',
  marginTop: theme.spacing(4),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  backgroundColor: '#3f7198', // 메인 블루 배경
  color: 'white', // 흰색 텍스트
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.15)',
  },
}));

// 카드 컨테이너 (높이 애니메이션용)
const PracticeCardContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'cardHeight' && prop !== 'shouldAnimate' && prop !== 'isMeasuring',
})(({ cardHeight, shouldAnimate, isMeasuring }) => ({
  height: isMeasuring ? 'auto' : (cardHeight > 0 ? `${cardHeight}px` : '0px'),
  opacity: shouldAnimate ? 1 : (isMeasuring ? 1 : 0),
  overflow: shouldAnimate ? 'visible' : 'hidden', // 애니메이션 완료 후 visible로 변경
  transition: shouldAnimate ? 'height 1.5s ease-out, opacity 0.4s ease-out' : 'height 0s, opacity 0s',
}));

// 실천 완료 카드용 스타일
const CompletedPaper = styled(Paper)(({ theme }) => ({
  padding: '25px 35px',
  marginTop: theme.spacing(4),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  backgroundColor: '#579f59', // 완료 녹색 배경
  background: 'linear-gradient(135deg, #579f59, #7bb17d)', // 완료 그라데이션
  color: 'white', // 흰색 텍스트
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0px 8px 30px rgba(87, 159, 89, 0.3)',
  },
}));

// 두근거림 애니메이션
const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

// 반짝 애니메이션
const shine = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

const AnimatedButton = styled(Button)({
  animation: `${pulse} 2s ease-in-out infinite`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
    backgroundSize: '200% 100%',
    animation: `${shine} 3s ease-in-out infinite`,
    pointerEvents: 'none',
  },
  '& > *': {
    position: 'relative',
    zIndex: 1,
  },
});

function App() {
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // 오늘의 추천 실천 카드 애니메이션을 위한 ref
  const practiceCardRef = useRef(null);
  const practiceCardInnerRef = useRef(null);
  const [practiceCardHeight, setPracticeCardHeight] = useState(0);
  const [shouldAnimateCard, setShouldAnimateCard] = useState(false);
  const [isMeasuringHeight, setIsMeasuringHeight] = useState(false);
  
  // 채팅 관련 상태를 App.js에서 관리
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSessionId] = useState(`dandani-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [hasDetailedRecord, setHasDetailedRecord] = useState(false); // 상세 기록 여부
  const [yesterdayRecord, setYesterdayRecord] = useState(null);
  const [isNonKoreanUser, setIsNonKoreanUser] = useState(false);
  
  // 알림 모달 상태
  const [alertModal, setAlertModal] = useState({
    open: false,
    message: '',
    type: 'info'
  });
  
  
  // 현재 챌린지 상세보기 상태
  const [showCurrentChallengeDetail, setShowCurrentChallengeDetail] = useState(false);
  
  // 온보딩 상태
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // 편지 모달 상태
  const [envelopeModalOpen, setEnvelopeModalOpen] = useState(false);
  const [selectedChallengeForEnvelope, setSelectedChallengeForEnvelope] = useState(null);
  const [envelopeListOpen, setEnvelopeListOpen] = useState(false);
  
  // 챌린지 선택 상태 초기화 및 검증
  const initializeSelectedChallenge = () => {
    const stored = getSelectedChallenge();
    if (!stored || !stored.id) {
      return null;
    }
    
    // startedAt이 없으면 유효하지 않은 선택으로 간주
    if (!stored.startedAt) {
      console.log('📝 [초기화] startedAt이 없어서 챌린지 선택 초기화');
      clearSelectedChallenge();
      return null;
    }
    
    return stored;
  };
  
  const [selectedChallengeInfo, setSelectedChallengeInfo] = useState(() => initializeSelectedChallenge());
  const [showChallengeSelector, setShowChallengeSelector] = useState(false);
  const selectedChallengeId = selectedChallengeInfo?.id || null;
  const selectedChallengeStartedAt = selectedChallengeInfo?.startedAt || null;
  
  // ADR-0002.01: 상태 전이 추적 (다음 챌린지 선택 UX 트리거용)
  const [previousChallengeStatus, setPreviousChallengeStatus] = useState(null);
  
  // ADR-0002.01: 축하 UX 이벤트 기반 추적 (1회성 표시용)
  const [celebrationShown, setCelebrationShown] = useState(false);
  const celebrationShownRef = useRef(false); // 새로고침 방지를 위한 ref

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isYesterdayRecord = (recordDate) => {
    const parsedDate = parseDatabaseDate(recordDate);
    if (!parsedDate) {
      return false;
    }

    const target = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()).getTime();
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    return target === yesterday.getTime();
  };

  const { fetchPracticeAndChallenge, updateChallengeProgress } = useChallengeData({
    apiUrl: API_URL,
    selectedChallengeId,
    selectedChallengeStartedAt,
    previousChallengeStatus,
    currentChallenge,
    celebrationShownRef,
    setLoading,
    setError,
    setShowChallengeSelector,
    setPractice,
    setHasDetailedRecord,
    setSelectedChallengeInfo,
    setCurrentChallenge,
    setPreviousChallengeStatus,
    setCelebrationShown
  });

  useEffect(() => {
    const { isNew } = getUserIdInfo();
    if (isNew) {
      setShowOnboarding(true);
    }

    if (!selectedChallengeId) {
      setShowChallengeSelector(true);
      setLoading(false);
    }
  }, [selectedChallengeId]);

  useEffect(() => {
    const browserLanguage = navigator.language || '';
    setIsNonKoreanUser(!browserLanguage.toLowerCase().startsWith('ko'));
  }, []);

  // 오늘의 추천 실천 카드 애니메이션 처리
  useLayoutEffect(() => {
    if (practice && !practice.isRecorded) {
      // 먼저 측정 모드로 전환 (카드가 보이도록)
      setIsMeasuringHeight(true);
      
      // DOM이 업데이트된 직후 높이 측정
      const measureHeight = () => {
        if (practiceCardInnerRef.current) {
          const cardElement = practiceCardInnerRef.current;
          // getBoundingClientRect를 사용하여 더 정확한 높이 측정
          const rect = cardElement.getBoundingClientRect();
          const actualHeight = rect.height || cardElement.offsetHeight || cardElement.scrollHeight;
          
          if (actualHeight > 0) {
            // 측정 완료, 높이를 0으로 초기화
            // 약간의 여유 공간 추가 (1px)로 하단 잘림 방지
            const heightWithMargin = actualHeight + 1;
            setIsMeasuringHeight(false);
            setPracticeCardHeight(0);
            setShouldAnimateCard(false);
            
            // 2초 후 애니메이션 시작
            setTimeout(() => {
              // 다음 프레임에서 애니메이션 시작
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setPracticeCardHeight(heightWithMargin);
                  setShouldAnimateCard(true);
                });
              });
            }, 2000);
            return true; // 측정 성공
          }
        }
        return false; // 측정 실패
      };
      
      // 즉시 측정 시도
      if (!measureHeight()) {
        // DOM 업데이트를 기다리기 위한 짧은 지연들
        const timers = [];
        [10, 50, 100, 200].forEach((delay) => {
          const timer = setTimeout(() => {
            if (measureHeight()) {
              // 측정 성공 시 나머지 타이머 정리
              timers.forEach(t => clearTimeout(t));
            }
          }, delay);
          timers.push(timer);
        });
        
        return () => {
          timers.forEach(timer => clearTimeout(timer));
        };
      }
    } else {
      setPracticeCardHeight(0);
      setShouldAnimateCard(false);
      setIsMeasuringHeight(false);
    }
  }, [practice]);

  // 이전 실행 추적을 위한 ref
  const lastFetchRef = useRef({ challengeId: null, startedAt: null });
  
  // 챌린지 완료 여부 확인 및 초기화
  useEffect(() => {
    if (!selectedChallengeId || !selectedChallengeStartedAt) {
      return;
    }
    
    // 챌린지 데이터를 가져와서 완료 여부 확인
    const checkChallengeStatus = async () => {
      try {
        const userId = getUserId();
        const headers = addStartedAtHeader({
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString(),
          'X-User-ID': userId
        }, selectedChallengeId);
        
        const response = await fetch(`${API_URL}/api/challenges/${selectedChallengeId}`, {
          headers
        });
        
        if (response.ok) {
          const challengeData = await response.json();
          const challenge = {
            id: challengeData.id,
            total_days: challengeData.total_days
          };
          
          // 챌린지 상태 계산
          const { status } = calculateChallengeStatus(challenge, {});
          
          // 챌린지가 완료되었으면 Local Storage 초기화
          if (status === 'completed') {
            console.log('📝 [초기화] 챌린지가 완료되어 선택 초기화:', {
              challengeId: selectedChallengeId,
              status
            });
            clearSelectedChallenge();
            setSelectedChallengeInfo(null);
            setShowChallengeSelector(true);
          }
        }
      } catch (error) {
        console.warn('Failed to check challenge status:', error);
        // 에러 발생 시에도 계속 진행 (네트워크 문제일 수 있음)
      }
    };
    
    checkChallengeStatus();
  }, [selectedChallengeId, selectedChallengeStartedAt]);
  
  useEffect(() => {
    if (selectedChallengeId) {
      // 선택한 챌린지 ID는 있지만 시작 일시가 없는 경우, 현재 시점으로 설정
      if (!selectedChallengeStartedAt) {
        console.log('📝 [페이지 로드] startedAt이 없어서 현재 시점으로 설정');
        validateAndFixStartedAt(selectedChallengeId, null);
        const selection = getSelectedChallenge();
        setSelectedChallengeInfo(selection);
        return; // 상태 업데이트 후 다음 useEffect에서 처리
      }
      
      // 중복 호출 방지: 동일한 challengeId와 startedAt으로 이미 호출했는지 확인
      if (lastFetchRef.current.challengeId === selectedChallengeId && 
          lastFetchRef.current.startedAt === selectedChallengeStartedAt) {
        // 이미 호출했으면 조용히 스킵 (로그 없음)
        return;
      }
      
      // 둘 다 있으면 실천 과제 로드
      console.log('🚀 [페이지 로드] 챌린지 데이터 로드 시작:', {
        challengeId: selectedChallengeId,
        startedAt: selectedChallengeStartedAt
      });
      lastFetchRef.current = { challengeId: selectedChallengeId, startedAt: selectedChallengeStartedAt };
      fetchPracticeAndChallenge();
      setShowChallengeSelector(false);
    } else {
      lastFetchRef.current = { challengeId: null, startedAt: null };
    }
  }, [selectedChallengeId, selectedChallengeStartedAt, fetchPracticeAndChallenge]);

  useEffect(() => {
    const fetchYesterdayRecord = async () => {
      if (!selectedChallengeId) {
        setYesterdayRecord(null);
        return;
      }

      try {
        const userId = getUserId();
        const headers = addStartedAtHeader({
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString(),
          'X-User-ID': userId
        }, selectedChallengeId);

        const response = await fetch(`${API_URL}/api/feedback/history?challengeId=${selectedChallengeId}`, {
          headers
        });

        if (!response.ok) {
          setYesterdayRecord(null);
          return;
        }

        const history = await response.json();
        const yesterdayRecords = (history || []).filter((record) => {
          return record?.practice_description && isYesterdayRecord(record.created_at);
        });

        if (yesterdayRecords.length === 0) {
          setYesterdayRecord(null);
          return;
        }

        yesterdayRecords.sort((a, b) => {
          const aTime = parseDatabaseDate(a.created_at)?.getTime() || 0;
          const bTime = parseDatabaseDate(b.created_at)?.getTime() || 0;
          return bTime - aTime;
        });
        setYesterdayRecord(yesterdayRecords[0]);
      } catch (error) {
        console.warn('Failed to fetch yesterday record:', error);
        setYesterdayRecord(null);
      }
    };

    fetchYesterdayRecord();
  }, [selectedChallengeId, practice?.isRecorded]);

  useEffect(() => {
    if (!yesterdayRecord || !selectedChallengeId) {
      return;
    }

    const todayKey = formatDateKey(new Date());
    const dedupeKey = `dandani_return_next_day_logged_${selectedChallengeId}_${todayKey}`;
    if (localStorage.getItem(dedupeKey) === 'true') {
      return;
    }

    logReturnNextDay(selectedChallengeId, yesterdayRecord.practice_day || null);
    localStorage.setItem(dedupeKey, 'true');
  }, [yesterdayRecord, selectedChallengeId]);

  // 챌린지 완료 핸들러
  const handleChallengeCompletion = () => {
    clearSelectedChallenge();
    setSelectedChallengeInfo(null);
    setCurrentChallenge(null);
    setShowChallengeSelector(true);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // 분석 도구 초기화는 PostHog의 loaded 콜백에서 처리
  // (index.js의 PostHogProvider options.loaded에서 호출)

  // 현재 챌린지 상세보기 핸들러
  const handleViewCurrentChallenge = (challengeId) => {
    setShowCurrentChallengeDetail(true);
  };

  // 현재 챌린지 상세보기에서 뒤로가기 핸들러
  const handleBackFromChallengeDetail = () => {
    setShowCurrentChallengeDetail(false);
  };

  // 온보딩 완료 핸들러
  const handleOnboardingComplete = () => {
    markUserInitialized();
    logOnboardingComplete();
    setShowOnboarding(false);
  };

  // 온보딩 다시 시작 핸들러
  const handleRestartOnboarding = () => {
    setShowOnboarding(true);
  };

  // 편지 생성 핸들러
  const handleCreateEnvelope = (challengeId) => {
    const challenge = currentChallenge;
    if (challenge) {
      // 선택한 챌린지의 경우 startedAt 기준으로 종료일 계산
      const isSelectedChallenge = selectedChallengeId && parseInt(selectedChallengeId, 10) === challengeId;
      const actualEndDate = isSelectedChallenge && selectedChallengeStartedAt 
        ? calculateChallengeEndDate(selectedChallengeStartedAt, challenge.total_days || 7)
        : null;

      setSelectedChallengeForEnvelope({
        id: challengeId,
        name: challenge.name,
        endDate: actualEndDate
      });
      setEnvelopeModalOpen(true);
    }
  };

  // 편지 모달 닫기 핸들러
  const handleCloseEnvelopeModal = () => {
    setEnvelopeModalOpen(false);
    setSelectedChallengeForEnvelope(null);
  };

  // 편지 목록 보기 핸들러
  const handleViewEnvelopeList = () => {
    setEnvelopeListOpen(true);
  };

  // 편지 목록 모달 닫기 핸들러
  const handleCloseEnvelopeList = () => {
    setEnvelopeListOpen(false);
  };

  // 챌린지 선택 핸들러
  const handleChallengeSelected = (challenge) => {
    // ADR-0002.01: 새 챌린지 선택 시 상태 및 축하 UX 초기화
    setPreviousChallengeStatus(null);
    setCelebrationShown(false);
    celebrationShownRef.current = false;
    const startedAt = validateAndFixStartedAt(challenge.id, null);
    const selection = getSelectedChallenge();
    setSelectedChallengeInfo(selection);
    // 새 챌린지 선택 시 기존 진행률 초기화
    setCurrentChallenge(null);
    setPractice(null);
    setShowChallengeSelector(false);
    // 새 챌린지 데이터를 가져올 때 진행률이 제대로 계산되도록 함
    fetchPracticeAndChallenge(challenge.id, startedAt);
  };

  const handleOpenCompletionFlow = () => {
    setCompletionModalOpen(true);
  };

  const handleCompletionSaved = () => {
    setHasDetailedRecord(true);

    if (practice) {
      setPractice({
        ...practice,
        isRecorded: true
      });
    }

    if (currentChallenge) {
      updateChallengeProgress(currentChallenge.id);
    }
  };

  const handleCompletionError = (error) => {
    console.error('Completion flow error:', error);
    setAlertModal({
      open: true,
      message: '실천 기록 중 오류가 발생했습니다.',
      type: 'error'
    });
  };


  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Ctrl/Cmd + Shift + H로 온보딩 재시작
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        handleRestartOnboarding();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error" align="center">
            오류가 발생했습니다: {error}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <AppHeaderSection
          isNonKoreanUser={isNonKoreanUser}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onRestartOnboarding={handleRestartOnboarding}
        />

        {activeTab === 0 && !showCurrentChallengeDetail && (
          <>
            {/* 챌린지 선택 화면 */}
            {showChallengeSelector && (
              <ChallengeSelector onChallengeSelected={handleChallengeSelected} />
            )}
            
            {/* 선택한 챌린지가 있을 때만 실천 과제 표시 */}
            {/* ADR-0002.01: 상태 기반 표시 (completed 상태가 아닐 때만) */}
            {!showChallengeSelector && Boolean(selectedChallengeId) && currentChallenge && (() => {
              const { status } = calculateChallengeStatus(currentChallenge, {});
              return status !== 'completed';
            })() && (
              <>
                <YesterdayRecordSection
                  practiceDescription={yesterdayRecord?.practice_description}
                  onContinueToday={() => practiceCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                />

                {/* 실천 완료 전: 오늘의 추천 실천 카드 */}
                {!practice?.isRecorded && practice && (
                  <PracticeCardContainer
                    ref={practiceCardRef}
                    cardHeight={practiceCardHeight}
                    shouldAnimate={shouldAnimateCard}
                    isMeasuring={isMeasuringHeight}
                  >
                    <Box ref={practiceCardInnerRef}>
                      <PracticeCard elevation={3}>
                        <Typography variant="h6" color="primary.contrastText" gutterBottom sx={{
                        fontSize: '2.2rem',
                        fontWeight: 700,
                        lineHeight: 1.3,
                        color: 'white',
                        textAlign: 'center',
                        marginBottom: '20px'
                      }}>
                        오늘의 추천 실천
                      </Typography>
                      <Divider 
                        sx={{ 
                          my: 3,
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          borderWidth: '1px'
                        }} 
                      />
                      <Typography variant="body1" paragraph sx={{ 
                        fontSize: '1.4rem',
                        lineHeight: 1.6,
                        color: 'white',
                        textAlign: 'center',
                        marginBottom: '25px'
                      }}>
                        {practice?.description}
                      </Typography>
                      
                      {/* 실천 완료 버튼 */}
                      <Box sx={{ mt: 4, textAlign: 'center' }}>
                        <AnimatedButton 
                          variant="contained" 
                          size="large"
                          onClick={handleOpenCompletionFlow}
                          sx={{ 
                            borderRadius: '10px',
                            padding: '22px 44px',
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            borderWidth: '3px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            minWidth: '160px',
                            margin: '5px',
                            textAlign: 'center',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            fontFamily: "'Noto Serif KR', serif",
                            boxSizing: 'border-box',
                            outline: 'none',
                            cursor: 'pointer',
                            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.3)',
                              borderColor: 'rgba(255, 255, 255, 0.7)',
                              animation: 'pulse 1s ease-in-out infinite',
                            }
                          }}
                        >
                          실천 완료하기
                        </AnimatedButton>
                      </Box>
                      </PracticeCard>
                    </Box>
                  </PracticeCardContainer>
                )}

                {/* 실천 완료 후: 실천 완료 카드 (상세 기록 시 표시 안 함) */}
                {!hasDetailedRecord && practice?.isRecorded && (
                  <Fade in={practice?.isRecorded} timeout={2000}>
                    <CompletedPaper elevation={3}>
                      <Typography variant="h5" paragraph sx={{ 
                        fontSize: '1.5rem',
                        lineHeight: 1.5,
                        textAlign: 'center',
                        marginBottom: '20px',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 1)',
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                        animation: 'fadeToGray 2s ease-in-out forwards',
                        '@keyframes fadeToGray': {
                          '0%': {
                            opacity: 1,
                            color: 'rgba(255, 255, 255, 1)'
                          },
                          '100%': {
                            opacity: 0.9,
                            color: 'rgba(255, 255, 255, 0.9)'
                          }
                        }
                      }}>
                        오늘의 실천을 완료했어요.
                      </Typography>
                      
                      {/* 실천 기록하기 버튼 (비활성화) */}
                      <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <AnimatedButton 
                          variant="contained" 
                          size="large"
                          onClick={() => setRecordModalOpen(true)}
                          sx={{ 
                            borderRadius: '10px',
                            padding: '22px 44px',
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.8)',
                            borderWidth: '3px',
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            minWidth: '160px',
                            margin: '5px',
                            textAlign: 'center',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            fontFamily: "'Noto Serif KR', serif",
                            boxSizing: 'border-box',
                            outline: 'none',
                            cursor: 'pointer',
                            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.35)',
                              borderColor: 'rgba(255, 255, 255, 0.9)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.3)'
                            }
                          }}
                        >
                          실천 기록하기
                        </AnimatedButton>
                      </Box>
                    </CompletedPaper>
                  </Fade>
                )}
            
            {/* 카드 간격 추가 */}
            <Box sx={{ mt: 4 }} />
            
                {/* 현재 챌린지 컨텍스트 (아래로 이동) */}
                <ChallengeContext 
                  challenge={currentChallenge} 
                  onViewCurrentChallenge={handleViewCurrentChallenge}
                  onCreateEnvelope={handleCreateEnvelope}
                  onViewEnvelopeList={handleViewEnvelopeList}
                />
              </>
            )}
            
            {/* ADR-0002.01: 챌린지 완료 축하 화면 (이벤트 기반, 1회성) */}
            {!showChallengeSelector && Boolean(selectedChallengeId) && celebrationShown && currentChallenge && (() => {
              const metrics = calculateChallengeMetrics(currentChallenge, { 
                completedDays: currentChallenge.completed_days || 0 
              });
              return metrics.isFullyCompleted;
            })() && (
              <StyledPaper elevation={3} sx={{ 
                backgroundColor: '#579f59',
                background: 'linear-gradient(135deg, #579f59, #7bb17d)',
              }}>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h4" sx={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    color: 'white',
                    marginBottom: '20px',
                    fontFamily: "'Noto Serif KR', serif"
                  }}>
                    🎉 축하합니다!
                  </Typography>
                  <Typography variant="h5" sx={{
                    fontSize: '1.8rem',
                    fontWeight: 600,
                    color: 'white',
                    marginBottom: '15px',
                    opacity: 0.95
                  }}>
                    {currentChallenge?.name} 완료
                  </Typography>
                  <Typography variant="body1" sx={{
                    fontSize: '1.2rem',
                    color: 'white',
                    marginBottom: '30px',
                    opacity: 0.9,
                    lineHeight: 1.6
                  }}>
                    {currentChallenge?.total_days}일 동안의 여정을 완주하셨습니다.<br />
                    작은 실천이 모여 큰 변화를 만들었어요.
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '15px',
                    alignItems: 'center',
                    mt: 4
                  }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleChallengeCompletion}
                      sx={{
                        borderRadius: '10px',
                        padding: '18px 40px',
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        color: '#579f59',
                        backgroundColor: 'white',
                        minWidth: '200px',
                        boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.3)'
                        }
                      }}
                    >
                      새 챌린지 시작하기
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="medium"
                      onClick={() => handleViewCurrentChallenge(currentChallenge?.id)}
                      sx={{
                        borderRadius: '8px',
                        padding: '12px 30px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        color: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.7)',
                        borderWidth: '2px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          borderColor: 'white'
                        }
                      }}
                    >
                      완료한 챌린지 보기
                    </Button>
                  </Box>
                </Box>
              </StyledPaper>
            )}
          </>
        )}

        {activeTab === 1 && (
          <ChatInterface 
            practice={practice} 
            messages={chatMessages}
            setMessages={setChatMessages}
            sessionId={chatSessionId}
          />
        )}

        {activeTab === 2 && (
          <PracticeHistory 
            challengeId={currentChallenge?.id}
            onViewRecord={(record) => {
              // 기록 상세 보기 기능 (필요시 구현)
              console.log('View record:', record);
            }}
          />
        )}


        {/* 현재 챌린지 상세보기 */}
        {activeTab === 0 && showCurrentChallengeDetail && currentChallenge && (
          <ChallengeDetail 
            challengeId={currentChallenge.id}
            onBack={handleBackFromChallengeDetail}
          />
        )}


        {/* 실천 기록 확인 모달 */}
        <PracticeRecordModal
          open={recordModalOpen}
          onClose={() => setRecordModalOpen(false)}
          practice={practice}
          challenge={currentChallenge}
          onUpdate={(updatedRecord) => {
            // 상세 기록 완료 표시
            setHasDetailedRecord(true);
            
            // 로컬 상태만 업데이트 (페이지 리로딩 방지)
            if (practice) {
              setPractice({
                ...practice,
                isRecorded: true
              });
            }
            
            // 챌린지 진행률 업데이트
            if (currentChallenge) {
              updateChallengeProgress(currentChallenge.id);
            }
            
            // fetchPracticeAndChallenge 제거 - 로컬 상태 업데이트만으로 충분
          }}
        />

        <PracticeCompletionModal
          open={completionModalOpen}
          practice={practice}
          challenge={currentChallenge}
          onClose={() => setCompletionModalOpen(false)}
          onCompleted={handleCompletionSaved}
          onError={handleCompletionError}
        />

        {/* 온보딩 모달 */}
        <OnboardingModal
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
        />

        {/* 편지 생성 모달 */}
        <EnvelopeModal
          open={envelopeModalOpen}
          onClose={handleCloseEnvelopeModal}
          challengeId={selectedChallengeForEnvelope?.id}
          challengeName={selectedChallengeForEnvelope?.name}
          challengeEndDate={selectedChallengeForEnvelope?.endDate}
        />

        {/* 편지 목록 모달 */}
        <EnvelopeList
          open={envelopeListOpen}
          onClose={handleCloseEnvelopeList}
        />

        {/* 알림 모달 */}
        <AlertModal
          open={alertModal.open}
          onClose={() => setAlertModal({ ...alertModal, open: false })}
          message={alertModal.message}
          type={alertModal.type}
        />

      </Box>
    </Container>
  );
}

export default App; 
