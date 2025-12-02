import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Box, Typography, Paper, CircularProgress, Tabs, Tab, Button, IconButton, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Help as HelpIcon } from '@mui/icons-material';
import ChatInterface from './components/ChatInterface';
import ChallengeContext from './components/ChallengeContext';
import ChallengeDetail from './components/ChallengeDetail';
import PracticeRecordModal from './components/PracticeRecordModal';
import PracticeHistory from './components/PracticeHistory';
import OnboardingModal from './components/OnboardingModal';
import EnvelopeModal from './components/EnvelopeModal';
import EnvelopeList from './components/EnvelopeList';
import ChallengeSelector from './components/ChallengeSelector';
import AlertModal from './components/AlertModal';
import { getUserId, getUserIdInfo, markUserInitialized } from './utils/userId';
import { getSelectedChallenge, clearSelectedChallenge, validateAndFixStartedAt } from './utils/challengeSelection';
import { initAnalytics, logChallengeComplete } from './utils/analytics';
import { calculateChallengeDay, calculateChallengeProgress, calculateChallengeEndDate, addStartedAtHeader } from './utils/challengeDay';

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

function App() {
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // 중복 호출 방지를 위한 ref
  const fetchingRef = useRef(false);
  
  // 채팅 관련 상태를 App.js에서 관리
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSessionId] = useState(`dandani-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  
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
  
  // 챌린지 선택 상태
  const [selectedChallengeInfo, setSelectedChallengeInfo] = useState(() => getSelectedChallenge());
  const [showChallengeSelector, setShowChallengeSelector] = useState(false);
  const selectedChallengeId = selectedChallengeInfo?.id || null;
  const selectedChallengeStartedAt = selectedChallengeInfo?.startedAt || null;
  

  // 일차 계산은 utils/challengeDay.js의 공통 함수 사용

  const fetchPracticeAndChallenge = useCallback(async (challengeId = null, startedAtOverride = null) => {
    // 중복 호출 방지
    if (fetchingRef.current) {
      return;
    }
    
    fetchingRef.current = true;
    
    setLoading(true);
    setError(null);
    try {
      const userId = getUserId();
      const targetChallengeId = challengeId || selectedChallengeId;
      const targetStartedAt = startedAtOverride || selectedChallengeStartedAt;

      let practiceUrl = `${API_URL}/api/practice/today`;
      if (targetChallengeId) {
        const params = new URLSearchParams();
        params.append('challengeId', targetChallengeId);
        if (targetStartedAt) {
          params.append('startedAt', targetStartedAt);
        }
        practiceUrl = `${API_URL}/api/practice/today?${params.toString()}`;
      }

      console.log('Target challenge ID:', targetChallengeId, 'Started at:', targetStartedAt);
      console.log('Practice URL:', practiceUrl);

      const [practiceResponse, challengesResponse] = await Promise.allSettled([
        fetch(practiceUrl, {
          headers: {
            'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            'X-Client-Time': new Date().toISOString(),
            'X-User-ID': userId
          }
        }),
        fetch(`${API_URL}/api/challenges`, {
          headers: {
            'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            'X-Client-Time': new Date().toISOString(),
            'X-User-ID': userId
          }
        })
      ]);

      // 챌린지 데이터를 먼저 확인하여 종료 여부 판단
      let isChallengeCompleted = false;
      let challengesData = null;
      if (challengesResponse.status === 'fulfilled' && challengesResponse.value.ok) {
        challengesData = await challengesResponse.value.json();
        if (targetChallengeId) {
          const allChallenges = [
            ...(challengesData.current ? [challengesData.current] : []),
            ...(challengesData.completed || []),
            ...(challengesData.upcoming || [])
          ];
          const tempChallenge = allChallenges.find(c => c.id === parseInt(targetChallengeId));
          if (tempChallenge && targetStartedAt) {
            const { currentDay } = calculateChallengeProgress(tempChallenge, {});
            const totalDays = Math.max(1, tempChallenge.total_days || 1);
            isChallengeCompleted = currentDay >= totalDays;
          }
        }
      }

      if (practiceResponse.status === 'fulfilled' && practiceResponse.value.ok && !isChallengeCompleted) {
        const practiceData = await practiceResponse.value.json();
        console.log('Practice data:', practiceData);
        
        // 챌린지 갱신 시간 정보 출력 (항상 표시)
        const now = new Date();
        const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const clientTime = now.toISOString();
        
        // 클라이언트 로컬 시간 기준으로 오늘 날짜 계산
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowDate = new Date(todayDate);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        
        const timeUntilMidnight = tomorrowDate - now;
        const hours = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeUntilMidnight % (1000 * 60)) / 1000);
        
        console.log('📅 챌린지 갱신 시간 정보:', {
          '현재 시간 (로컬)': now.toLocaleString('ko-KR', { timeZone: clientTimezone }),
          '현재 시간 (UTC)': clientTime,
          '오늘 날짜': todayDate.toLocaleDateString('ko-KR'),
          '클라이언트 시간대': clientTimezone,
          '다음 갱신 시간': '자정 (00:00)',
          '남은 시간': `${hours}시간 ${minutes}분 ${seconds}초`,
          '챌린지 일차': practiceData.day || 'N/A',
          ...(practiceData._debug ? { '서버 계산 날짜': practiceData._debug.calculatedDate } : {})
        });
        
        setPractice(practiceData);
      } else if (isChallengeCompleted) {
        // 종료된 챌린지의 경우 practice를 null로 설정
        setPractice(null);
        console.log('Challenge is completed, practice not fetched');
      } else {
        console.log('Practice API not available, using fallback');
        setPractice({
          title: "오늘의 단단이가 되는 법",
          description: "3분 동안 눈을 감고 깊은 호흡을 하며, 현재 순간에 집중해보세요. 생각이 떠오르면 그것을 인정하고 다시 호흡으로 돌아옵니다."
        });
      }

      if (challengesResponse.status === 'fulfilled' && challengesResponse.value.ok && challengesData) {
        console.log('📦 [페이지 로드] Challenges API 응답:', challengesData);

        if (targetChallengeId) {
          const allChallenges = [
            ...(challengesData.current ? [challengesData.current] : []),
            ...(challengesData.completed || []),
            ...(challengesData.upcoming || [])
          ];
          const selectedChallenge = allChallenges.find(c => c.id === parseInt(targetChallengeId));

          if (selectedChallenge) {
            // startedAt 검증 및 재설정
            const validStartedAt = validateAndFixStartedAt(targetChallengeId, targetStartedAt);
            if (validStartedAt !== targetStartedAt) {
              const selection = getSelectedChallenge();
              setSelectedChallengeInfo(selection);
            }
            
            const { currentDay, progressPercentage } = calculateChallengeProgress(selectedChallenge, {});
            
            // 실제 완료한 일수를 기반으로 진행률 재계산 (ChallengeDetail과 동일한 로직)
            let actualProgressPercentage = progressPercentage;
            let completedDays = 0;
            
            try {
              const feedbackHeaders = addStartedAtHeader({
                'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
                'X-Client-Time': new Date().toISOString(),
                'X-User-ID': userId
              }, targetChallengeId);
              
              const feedbackResponse = await fetch(`${API_URL}/api/feedback/history?challengeId=${targetChallengeId}`, {
                headers: feedbackHeaders
              });
              
              if (feedbackResponse.ok) {
                const feedbackData = await feedbackResponse.json();
                const completedDaysSet = new Set(feedbackData.map(feedback => feedback.practice_day));
                completedDays = completedDaysSet.size;
                const totalDays = Math.max(1, selectedChallenge.total_days || 1);
                actualProgressPercentage = Math.round((completedDays / totalDays) * 100);
                console.log('Actual progress calculated:', { completedDays, totalDays, actualProgressPercentage });
                
                // 버그 복구: 진행률이 비정상적으로 높은 경우 자동으로 재계산
                // 예: 새 챌린지인데 진행률이 50% 이상이거나, 완료 일수가 현재 일차보다 많은 경우
                const maxPossibleDay = currentDay;
                if (completedDays > maxPossibleDay) {
                  console.warn('Progress mismatch detected, resetting:', { completedDays, maxPossibleDay, actualProgressPercentage });
                  // 실제 완료 일수를 현재 일차로 제한
                  completedDays = Math.min(completedDays, maxPossibleDay);
                  actualProgressPercentage = Math.round((completedDays / totalDays) * 100);
                  console.log('Progress corrected:', { completedDays, actualProgressPercentage });
                }
              }
            } catch (feedbackError) {
              console.warn('Failed to fetch feedback history for progress calculation:', feedbackError);
              // 피드백 조회 실패 시 기존 계산값 사용
            }
            
            // 챌린지 종료 여부 확인 (실제 완료한 일수 기준)
            const totalDays = Math.max(1, selectedChallenge.total_days || 1);
            const isCompleted = completedDays >= totalDays;
            // 새 챌린지 선택 시 currentChallenge가 null일 수 있으므로 안전하게 처리
            const wasCompleted = currentChallenge?.is_completed || false;
            
            // 새로 완료된 경우에만 처리
            if (isCompleted && !wasCompleted) {
              // 챌린지 완료 이벤트 로깅
              logChallengeComplete(selectedChallenge.id);
            }
            
            const updatedChallenge = {
              ...selectedChallenge,
              current_day: currentDay,
              progress_percentage: actualProgressPercentage,
              completed_days: completedDays,
              is_completed: isCompleted
            };
            
            // 챌린지 정보 로그 출력
            console.log('📋 챌린지 정보 (선택한 챌린지):', {
              id: updatedChallenge.id,
              name: updatedChallenge.name,
              total_days: updatedChallenge.total_days,
              current_day: updatedChallenge.current_day,
              progress_percentage: updatedChallenge.progress_percentage,
              completed_days: updatedChallenge.completed_days,
              is_completed: updatedChallenge.is_completed,
              selectedChallengeInfo: {
                id: targetChallengeId,
                startedAt: targetStartedAt,
                calculatedDay: currentDay
              }
            });
            
            setCurrentChallenge(updatedChallenge);
          } else {
            const challenge = challengesData.current;
            if (challenge) {
              console.log('📋 챌린지 정보 (현재 챌린지 - 선택한 챌린지 없음):', {
                id: challenge.id,
                name: challenge.name,
                total_days: challenge.total_days,
                current_day: challenge.current_day,
                progress_percentage: challenge.progress_percentage,
                is_completed: challenge.is_completed
              });
            }
            setCurrentChallenge(challenge);
          }
        } else {
          // targetChallengeId가 없는 경우에도 현재 챌린지가 있으면 실제 완료 일수 기반으로 진행률 계산
          if (challengesData.current) {
            const currentChallenge = challengesData.current;
            let actualProgressPercentage = currentChallenge.progress_percentage || 0;
            let completedDays = 0;
            
            try {
              const feedbackHeaders = addStartedAtHeader({
                'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
                'X-Client-Time': new Date().toISOString(),
                'X-User-ID': userId
              }, currentChallenge.id);
              
              const feedbackResponse = await fetch(`${API_URL}/api/feedback/history?challengeId=${currentChallenge.id}`, {
                headers: feedbackHeaders
              });
              
              if (feedbackResponse.ok) {
                const feedbackData = await feedbackResponse.json();
                const completedDaysSet = new Set(feedbackData.map(feedback => feedback.practice_day));
                completedDays = completedDaysSet.size;
                const totalDays = Math.max(1, currentChallenge.total_days || 1);
                actualProgressPercentage = Math.round((completedDays / totalDays) * 100);
                console.log('Actual progress calculated for current challenge:', { completedDays, totalDays, actualProgressPercentage });
              }
            } catch (feedbackError) {
              console.warn('Failed to fetch feedback history for progress calculation:', feedbackError);
              // 피드백 조회 실패 시 기존 계산값 사용
            }
            
            // 챌린지 종료 여부 확인 (실제 완료한 일수 기준)
            const totalDays = Math.max(1, currentChallenge.total_days || 1);
            const isCompleted = completedDays >= totalDays;
            // 새 챌린지 선택 시 currentChallenge가 null일 수 있으므로 안전하게 처리
            const wasCompleted = currentChallenge?.is_completed || false;
            
            // 새로 완료된 경우에만 처리
            if (isCompleted && !wasCompleted) {
              // 챌린지 완료 이벤트 로깅
              logChallengeComplete(currentChallenge.id);
            }
            
            const updatedCurrentChallenge = {
              ...currentChallenge,
              progress_percentage: actualProgressPercentage,
              completed_days: completedDays,
              is_completed: isCompleted
            };
            
            console.log('📋 챌린지 정보 (현재 챌린지 - 진행률 재계산):', {
              id: updatedCurrentChallenge.id,
              name: updatedCurrentChallenge.name,
              total_days: updatedCurrentChallenge.total_days,
              current_day: updatedCurrentChallenge.current_day,
              progress_percentage: updatedCurrentChallenge.progress_percentage,
              completed_days: updatedCurrentChallenge.completed_days,
              is_completed: updatedCurrentChallenge.is_completed
            });
            
            setCurrentChallenge(updatedCurrentChallenge);
          } else {
            const challenge = challengesData.current;
            if (challenge) {
              console.log('📋 챌린지 정보 (현재 챌린지 - 기본):', {
                id: challenge.id,
                name: challenge.name,
                total_days: challenge.total_days,
                current_day: challenge.current_day,
                progress_percentage: challenge.progress_percentage,
                is_completed: challenge.is_completed
              });
            }
            setCurrentChallenge(challenge);
          }
        }
      } else {
        console.log('Challenges API not available, using fallback');
        const fallbackChallenge = {
          id: 6,
          name: "감정을 느끼는 연습",
          description: "머리가 아닌 몸과 마음으로 감정을 회복하는 31일",
          current_day: 20,
          total_days: 31,
          progress_percentage: 64
        };
        console.log('📋 챌린지 정보 (Fallback):', fallbackChallenge);
        setCurrentChallenge(fallbackChallenge);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [selectedChallengeId, selectedChallengeStartedAt, currentChallenge?.is_completed]);

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

  // 이전 실행 추적을 위한 ref
  const lastFetchRef = useRef({ challengeId: null, startedAt: null });
  
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

  // 분석 도구 초기화
  useEffect(() => {
    initAnalytics();
  }, []);

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

  // 빠른 완료 핸들러 (빈 값으로 저장)
  const handleQuickComplete = async () => {
    try {
      const userId = getUserId();

      const practiceDay = calculateChallengeDay(currentChallenge, { 
        practiceDay: practice?.day 
      });

      const quickCompleteData = {
        challengeId: currentChallenge?.id,
        practiceDay: practiceDay,
        moodChange: null,
        wasHelpful: null,
        practiceDescription: null
      };

      const response = await fetch(`${API_URL}/api/feedback/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify(quickCompleteData)
      });

      if (response.ok) {
        const result = await response.json();
        setAlertModal({
          open: true,
          message: '좋아요! 오늘 실천 완료했어요',
          type: 'success'
        });
        console.log('Quick complete submitted:', result);

        if (practice) {
          setPractice({
            ...practice,
            isRecorded: true
          });
        }

        try {
          await fetchPracticeAndChallenge(currentChallenge?.id, selectedChallengeStartedAt);
        } catch (error) {
          console.log('Backend refresh failed, using local state update');
        }
      } else {
        throw new Error('빠른 완료 제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('Quick complete error:', error);
      setAlertModal({
        open: true,
        message: '빠른 완료 중 오류가 발생했습니다.',
        type: 'error'
      });
    }
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
        <Box sx={{ position: 'relative', textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            단단이
          </Typography>
          <Typography variant="h6" color="text.primary" gutterBottom sx={{
            fontWeight: 600,
            fontSize: '1.1rem',
            opacity: 0.8
          }}>
            감정적으로 힘들 때 중심을 잃지 않게 해주는 동반자
          </Typography>
          
          
          {/* 도움말 버튼 */}
          <Tooltip title="온보딩 다시 보기 (Ctrl+Shift+H)">
            <IconButton
              onClick={handleRestartOnboarding}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.50'
                }
              }}
            >
              <HelpIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab 
              label="오늘의 챌린지" 
              sx={{ 
                fontSize: '1.1rem', 
                fontWeight: 'bold',
                color: 'text.primary',
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 700
                }
              }} 
            />
            <Tab 
              label="챌린지 도우미" 
              sx={{ 
                fontSize: '1.1rem', 
                fontWeight: 'bold',
                color: 'text.primary',
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 700
                }
              }} 
            />
            <Tab 
              label="내 기록" 
              sx={{ 
                fontSize: '1.1rem', 
                fontWeight: 'bold',
                color: 'text.primary',
                '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 700
                }
              }} 
            />
          </Tabs>
        </Box>

        {activeTab === 0 && !showCurrentChallengeDetail && (
          <>
            {/* 챌린지 선택 화면 */}
            {showChallengeSelector && (
              <ChallengeSelector onChallengeSelected={handleChallengeSelected} />
            )}
            
            {/* 선택한 챌린지가 있을 때만 실천 과제 표시 */}
            {!showChallengeSelector && Boolean(selectedChallengeId) && !currentChallenge?.is_completed && (
              <>
                {/* 오늘의 실천 과제 카드 (위로 이동) */}
                <StyledPaper elevation={3}>
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
              <Typography variant="body1" paragraph sx={{ 
                fontSize: '1.4rem',
                lineHeight: 1.6,
                color: 'white',
                textAlign: 'center',
                marginBottom: '25px'
              }}>
                {practice?.description}
              </Typography>
              
              {/* 실천 완료/확인 버튼 */}
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                {practice?.isRecorded ? (
                  <>
                    <Button 
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
                          borderColor: 'rgba(255, 255, 255, 0.7)'
                        }
                      }}
                    >
                      실천 기록하기
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="contained" 
                      size="large"
                      onClick={handleQuickComplete}
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
                          borderColor: 'rgba(255, 255, 255, 0.7)'
                        }
                      }}
                    >
                      실천 완료하기
                    </Button>
                  </>
                )}
              </Box>
            </StyledPaper>
            
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
            
            {/* 챌린지 완료 축하 화면 */}
            {!showChallengeSelector && Boolean(selectedChallengeId) && currentChallenge?.is_completed && (
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
            // 기록 업데이트 후 실천 데이터 다시 가져오기
            fetchPracticeAndChallenge();
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