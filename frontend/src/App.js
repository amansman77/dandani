import React, { useState, useEffect, useRef } from 'react';
import { Container, Box, Typography, CircularProgress } from '@mui/material';
import ChatInterface from './components/ChatInterface';
import ChallengeDetail from './components/ChallengeDetail';
import PracticeRecordModal from './components/PracticeRecordModal';
import PracticeCompletionModal from './components/PracticeCompletionModal';
import PracticeHistory from './components/PracticeHistory';
import OnboardingModal from './components/OnboardingModal';
import EnvelopeModal from './components/EnvelopeModal';
import EnvelopeList from './components/EnvelopeList';
import AlertModal from './components/AlertModal';
import AppHeaderSection from './components/AppHeaderSection';
import TodayChallengeTab from './components/TodayChallengeTab';
import { useChallengeData } from './hooks/useChallengeData';
import { usePracticeCardAnimation } from './hooks/usePracticeCardAnimation';
import { useRetentionState } from './hooks/useRetentionState';
import { useYesterdayRecord } from './hooks/useYesterdayRecord';
import { getUserId, getUserIdInfo, markUserInitialized } from './utils/userId';
import { getSelectedChallenge, clearSelectedChallenge, validateAndFixStartedAt } from './utils/challengeSelection';
import { logOnboardingComplete } from './utils/analytics';
import { calculateChallengeEndDate, addStartedAtHeader, calculateChallengeStatus } from './utils/challengeDay';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

function App() {
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const {
    practiceCardRef,
    practiceCardInnerRef,
    practiceCardHeight,
    shouldAnimateCard,
    isMeasuringHeight
  } = usePracticeCardAnimation(practice);
  
  // 채팅 관련 상태를 App.js에서 관리
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSessionId] = useState(`dandani-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [hasDetailedRecord, setHasDetailedRecord] = useState(false); // 상세 기록 여부
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

  const { yesterdayRecord } = useYesterdayRecord({
    apiUrl: API_URL,
    selectedChallengeId,
    practiceRecorded: practice?.isRecorded
  });

  const { userState, refreshRetentionState } = useRetentionState({
    apiUrl: API_URL,
    challengeId: selectedChallengeId
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

    refreshRetentionState();
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
          <TodayChallengeTab
            showChallengeSelector={showChallengeSelector}
            selectedChallengeId={selectedChallengeId}
            currentChallenge={currentChallenge}
            userState={userState}
            practice={practice}
            hasDetailedRecord={hasDetailedRecord}
            celebrationShown={celebrationShown}
            yesterdayRecord={yesterdayRecord}
            practiceCardRef={practiceCardRef}
            practiceCardInnerRef={practiceCardInnerRef}
            practiceCardHeight={practiceCardHeight}
            shouldAnimateCard={shouldAnimateCard}
            isMeasuringHeight={isMeasuringHeight}
            onChallengeSelected={handleChallengeSelected}
            onOpenCompletionFlow={handleOpenCompletionFlow}
            onOpenRecordModal={() => setRecordModalOpen(true)}
            onViewCurrentChallenge={handleViewCurrentChallenge}
            onCreateEnvelope={handleCreateEnvelope}
            onViewEnvelopeList={handleViewEnvelopeList}
            onChallengeCompletion={handleChallengeCompletion}
          />
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
            challengeId={selectedChallengeId || currentChallenge?.id}
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

            refreshRetentionState();
            
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
          onViewHistory={() => {
            setActiveTab(2);
            setCompletionModalOpen(false);
          }}
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
