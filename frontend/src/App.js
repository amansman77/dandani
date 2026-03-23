import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { Container, Box, Typography, Paper, CircularProgress, Tabs, Tab, Button, IconButton, Tooltip, Fade, Divider, Alert } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { Help as HelpIcon } from '@mui/icons-material';
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
import { getUserId, getUserIdInfo, markUserInitialized } from './utils/userId';
import { getSelectedChallenge, clearSelectedChallenge, validateAndFixStartedAt } from './utils/challengeSelection';
import { logChallengeComplete, logOnboardingComplete, logReturnNextDay } from './utils/analytics';
import { calculateChallengeDay, calculateChallengeProgress, calculateChallengeEndDate, addStartedAtHeader, calculateChallengeStatus, calculateChallengeMetrics, parseDatabaseDate } from './utils/challengeDay';

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
  
  // 중복 호출 방지를 위한 ref
  const fetchingRef = useRef(false);
  
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

  // 일차 계산은 utils/challengeDay.js의 공통 함수 사용

  // 상세 기록 확인 함수
  const checkDetailedRecord = useCallback(async (practiceData, challenge) => {
    if (!practiceData || !challenge?.id) return;
    
    try {
      const userId = getUserId();
      // 오늘의 실천 과제용: 서버의 practice.day를 사용하거나 totalDays로 제한
      const actualDay = calculateChallengeDay(challenge);
      const totalDays = Math.max(1, challenge?.total_days || 1);
      const practiceDay = practiceData?.day 
        ? Math.min(practiceData.day, totalDays)
        : Math.min(actualDay, totalDays);
      
      const headers = addStartedAtHeader({
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString(),
        'X-User-ID': userId
      }, challenge.id);
      
      const response = await fetch(`${API_URL}/api/feedback/record?challengeId=${challenge.id}&practiceDay=${practiceDay}`, {
        headers
      });
      
      if (response.ok) {
        const recordData = await response.json();
        // 기록이 있고, 상세 기록(mood_change, was_helpful, practice_description 중 하나라도 null이 아님)이면
        if (recordData && (recordData.mood_change || recordData.was_helpful || recordData.practice_description)) {
          setHasDetailedRecord(true);
        } else {
          setHasDetailedRecord(false);
        }
      } else {
        // 기록이 없으면 상세 기록이 아님
        setHasDetailedRecord(false);
      }
    } catch (error) {
      console.error('Failed to check detailed record:', error);
      // 에러 발생 시 기본값 유지
      setHasDetailedRecord(false);
    }
  }, []);

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

      // challengeId가 없으면 챌린지 선택 화면을 보여주기 위해 API 호출 건너뛰기
      if (!targetChallengeId) {
        console.log('No challenge selected, skipping practice API call');
        setLoading(false);
        fetchingRef.current = false;
        setShowChallengeSelector(true);
        return;
      }

      // startedAt이 없으면 검증 및 초기화
      const validStartedAt = targetStartedAt || validateAndFixStartedAt(targetChallengeId, null);
      
      const params = new URLSearchParams();
      params.append('challengeId', targetChallengeId);
      params.append('startedAt', validStartedAt);
      const practiceUrl = `${API_URL}/api/practice/today?${params.toString()}`;

      console.log('Target challenge ID:', targetChallengeId, 'Started at:', validStartedAt);
      console.log('Practice URL:', practiceUrl);

      // X-Started-At 헤더 준비
      const headers = {
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString(),
        'X-User-ID': userId,
        'X-Started-At': validStartedAt
      };

      const [practiceResponse, challengesResponse] = await Promise.allSettled([
        fetch(practiceUrl, { headers }),
        fetch(`${API_URL}/api/challenges`, { headers })
      ]);

      // 챌린지 데이터 확인
      let challengesData = null;
      if (challengesResponse.status === 'fulfilled' && challengesResponse.value.ok) {
        challengesData = await challengesResponse.value.json();
      }

      // practice 응답 처리
      // 백엔드가 totalDays를 초과하는 경우 자동으로 마지막 일차의 practice를 반환하므로
      // 프론트엔드에서 완료 여부를 미리 판단할 필요 없음
      let loadedPracticeData = null;
      if (practiceResponse.status === 'fulfilled' && practiceResponse.value.ok) {
        loadedPracticeData = await practiceResponse.value.json();
        console.log('Practice data:', loadedPracticeData);
        
        setPractice(loadedPracticeData);
        // practice.isRecorded가 true일 때, 실제로 상세 기록이 있는지 확인
        // (챌린지가 설정된 후에 확인하므로 여기서는 초기화만)
        if (!loadedPracticeData?.isRecorded) {
          setHasDetailedRecord(false);
        }
      } else if (practiceResponse.status === 'fulfilled' && !practiceResponse.value.ok) {
        // API 응답이 실패한 경우
        console.error('Practice API failed:', {
          status: practiceResponse.value.status,
          statusText: practiceResponse.value.statusText
        });
        setPractice(null);
      } else if (practiceResponse.status === 'rejected') {
        // API 호출 자체가 실패한 경우
        console.error('Practice API request failed:', practiceResponse.reason);
        setPractice(null);
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
          // API 응답 형식 변경: current/completed/upcoming → challenges 배열
          const allChallenges = challengesData.challenges || [];
          const selectedChallenge = allChallenges.find(c => c.id === parseInt(targetChallengeId));

          if (selectedChallenge) {
            // startedAt 검증 및 재설정
            const validStartedAt = validateAndFixStartedAt(targetChallengeId, targetStartedAt);
            if (validStartedAt !== targetStartedAt) {
              const selection = getSelectedChallenge();
              setSelectedChallengeInfo(selection);
            }
            
            // ADR-0002.01: 실제 경과 일수 사용 (항상 제한 없음)
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
            
            // ADR-0002.01: 상태 계산 및 전이 감지
            // 상태 계산 시에는 실제 경과 일수를 사용 (practiceDay 사용 안 함)
            const challengeStatus = calculateChallengeStatus(updatedChallenge, {});
            const previousStatus = previousChallengeStatus;
            const statusTransitioned = previousStatus === 'current' && challengeStatus.status === 'completed';
            
            // 상태 업데이트
            updatedChallenge.status = challengeStatus.status;
            setPreviousChallengeStatus(challengeStatus.status);
            
            // ADR-0002.01: 상태 전이 감지 (current -> completed)
            if (statusTransitioned) {
              console.log('📝 [상태 전이] current -> completed 감지, 다음 챌린지 선택 UX 트리거:', {
                challengeId: targetChallengeId,
                currentDay,
                totalDays: updatedChallenge.total_days,
                previousStatus,
                currentStatus: challengeStatus.status
              });
              clearSelectedChallenge();
              setSelectedChallengeInfo(null);
              setShowChallengeSelector(true);
              setCurrentChallenge(null);
              setPractice(null);
              return; // 완료된 챌린지는 더 이상 처리하지 않음
            }
            
            // completed 상태이지만 전이가 아닌 경우 (이미 완료된 상태로 로드)
            if (challengeStatus.status === 'completed' && !statusTransitioned) {
              console.log('📝 [이미 완료] 챌린지가 이미 완료된 상태:', {
                challengeId: targetChallengeId,
                currentDay,
                totalDays: updatedChallenge.total_days,
                status: challengeStatus.status
              });
              // 이미 완료된 경우에도 선택 초기화 (다음 챌린지 선택 유도)
              clearSelectedChallenge();
              setSelectedChallengeInfo(null);
              setShowChallengeSelector(true);
              setCurrentChallenge(null);
              setPractice(null);
              return;
            }
            
            // ADR-0002.01: 초기 상태 설정
            const initialStatus = calculateChallengeStatus(updatedChallenge, { practiceDay: currentDay }).status;
            setPreviousChallengeStatus(initialStatus);
            
            setCurrentChallenge(updatedChallenge);
            // 챌린지 설정 후 상세 기록 확인
            if (loadedPracticeData?.isRecorded) {
              checkDetailedRecord(loadedPracticeData, updatedChallenge);
            }
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
            // 챌린지 설정 후 상세 기록 확인
            if (loadedPracticeData?.isRecorded && challenge) {
              checkDetailedRecord(loadedPracticeData, challenge);
            }
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
  }, [selectedChallengeId, selectedChallengeStartedAt, currentChallenge?.is_completed, checkDetailedRecord, previousChallengeStatus]);

  // 챌린지 진행률 업데이트 함수 (ADR-0002.01: 상태 전이 및 이벤트 기반 UX)
  const updateChallengeProgress = useCallback(async (challengeId) => {
    if (!challengeId || !currentChallenge) {
      return;
    }

    try {
      const userId = getUserId();
      const feedbackHeaders = addStartedAtHeader({
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString(),
        'X-User-ID': userId
      }, challengeId);

      const feedbackResponse = await fetch(`${API_URL}/api/feedback/history?challengeId=${challengeId}`, {
        headers: feedbackHeaders
      });

      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        const completedDaysSet = new Set(feedbackData.map(feedback => feedback.practice_day));
        const completedDays = completedDaysSet.size;
        const totalDays = Math.max(1, currentChallenge.total_days || 1);

        // ADR-0002.01: 실제 경과 일수 사용 (항상 제한 없음)
        const { currentDay } = calculateChallengeProgress(currentChallenge, {});

        // 진행률이 비정상적으로 높은 경우 자동으로 재계산
        const maxPossibleDay = currentDay;
        let validCompletedDays = completedDays;
        if (completedDays > maxPossibleDay) {
          console.warn('Progress mismatch detected, resetting:', { completedDays, maxPossibleDay });
          validCompletedDays = Math.min(completedDays, maxPossibleDay);
        }

        const finalProgressPercentage = Math.round((validCompletedDays / totalDays) * 100);
        
        // ADR-0002.01: 완료·성과 지표 계산 (상태와 분리)
        const metrics = calculateChallengeMetrics(currentChallenge, { completedDays: validCompletedDays });
        
        // ADR-0002.01: 상태 계산 (시간 기반만)
        const previousStatus = previousChallengeStatus || 
          (currentChallenge.status ? currentChallenge.status : 
           calculateChallengeStatus(currentChallenge, {}).status);
        const challengeForStatus = {
          ...currentChallenge,
          total_days: totalDays
        };
        // ADR-0002.01: 상태 계산 시에는 실제 경과 일수를 사용 (practiceDay 사용 안 함)
        const { status: currentStatus } = calculateChallengeStatus(challengeForStatus, {});
        
        // ADR-0002.01: 상태 전이 감지 (current -> completed)
        const statusTransitioned = previousStatus === 'current' && currentStatus === 'completed';
        if (statusTransitioned) {
          console.log('📝 [상태 전이] current -> completed 감지, 다음 챌린지 선택 UX 트리거');
          // 다음 챌린지 선택 화면 표시
          setShowChallengeSelector(true);
        }
        
        // ADR-0002.01: 축하 UX 트리거 (이벤트 기반, 1회성)
        // 조건: 현재 챌린지가 마지막 챌린지이며, 실천 기록 저장으로 completed_days === total_days가 되는 순간
        const shouldShowCelebration = 
          !celebrationShownRef.current && // 아직 표시하지 않음
          metrics.isFullyCompleted && // 모든 일수 완료
          !currentChallenge.is_completed; // 이전에 완료되지 않았음 (새로 완료된 경우)
        
        if (shouldShowCelebration) {
          console.log('🎉 [축하 UX] 모든 챌린지 완료 이벤트 감지');
          setCelebrationShown(true);
          celebrationShownRef.current = true;
          logChallengeComplete(challengeId);
        }

        // 챌린지 상태 업데이트
        const updatedChallenge = {
          ...currentChallenge,
          current_day: currentDay,
          progress_percentage: finalProgressPercentage,
          completed_days: validCompletedDays,
          status: currentStatus, // ADR-0002.01: 시간 기반 상태
          is_completed: metrics.isFullyCompleted // 지표 (상태와 분리)
        };
        
        setCurrentChallenge(updatedChallenge);
        setPreviousChallengeStatus(currentStatus);

        console.log('📊 챌린지 진행률 업데이트:', {
          challengeId,
          currentDay,
          completedDays: validCompletedDays,
          totalDays,
          progressPercentage: finalProgressPercentage,
          isFullyCompleted: metrics.isFullyCompleted,
          status: currentStatus
        });
      }
    } catch (error) {
      console.warn('Failed to update challenge progress:', error);
    }
  }, [currentChallenge, previousChallengeStatus]);

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

        {isNonKoreanUser && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            이 서비스는 한국어로 제공됩니다.
          </Alert>
        )}

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
            {/* ADR-0002.01: 상태 기반 표시 (completed 상태가 아닐 때만) */}
            {!showChallengeSelector && Boolean(selectedChallengeId) && currentChallenge && (() => {
              const { status } = calculateChallengeStatus(currentChallenge, {});
              return status !== 'completed';
            })() && (
              <>
                {yesterdayRecord?.practice_description && (
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      mt: 2,
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #f8fbff, #eef4fb)',
                      border: '1px solid #d7e3f3'
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                      어제 남긴 한 줄
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        mb: 2,
                        whiteSpace: 'pre-wrap',
                        fontStyle: 'italic',
                        lineHeight: 1.7
                      }}
                    >
                      "{yesterdayRecord.practice_description}"
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                      오늘도 이어볼까요?
                    </Typography>
                    <Button variant="outlined" onClick={() => practiceCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                      오늘 실천 이어가기
                    </Button>
                  </Paper>
                )}

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
