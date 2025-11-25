import React, { useState, useEffect } from 'react';
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
import { getUserId, getUserIdInfo, markUserInitialized } from './utils/userId';
import { getSelectedChallenge, setSelectedChallenge } from './utils/challengeSelection';
import { initAnalytics } from './utils/analytics';

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
  
  // 채팅 관련 상태를 App.js에서 관리
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSessionId] = useState(`dandani-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  
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

  const normalizeDateOnly = (value) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
  };

  const calculateSelectedChallengeDay = (startDateLike, totalDays) => {
    const normalizedStart = normalizeDateOnly(startDateLike);
    const today = normalizeDateOnly(new Date());

    if (!normalizedStart || !today) {
      return 1;
    }

    const diffDays = Math.floor((today.getTime() - normalizedStart.getTime()) / (24 * 60 * 60 * 1000));
    const rawDay = diffDays + 1;
    const safeTotalDays = Math.max(1, totalDays || 1);
    return Math.max(1, Math.min(safeTotalDays, rawDay));
  };

  const deriveSelectedChallengeProgress = (challenge, startDateLike) => {
    if (!challenge) {
      return { currentDay: 1, progressPercentage: 0 };
    }

    const safeTotalDays = Math.max(1, challenge.total_days || 1);
    const currentDay = calculateSelectedChallengeDay(startDateLike || challenge.start_date, safeTotalDays);
    return {
      currentDay,
      progressPercentage: Math.round((currentDay / safeTotalDays) * 100)
    };
  };

  const fetchPracticeAndChallenge = async (challengeId = null, startedAtOverride = null) => {
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

      if (practiceResponse.status === 'fulfilled' && practiceResponse.value.ok) {
        const practiceData = await practiceResponse.value.json();
        console.log('Practice data:', practiceData);
        setPractice(practiceData);
      } else {
        console.log('Practice API not available, using fallback');
        setPractice({
          title: "오늘의 단단이가 되는 법",
          description: "3분 동안 눈을 감고 깊은 호흡을 하며, 현재 순간에 집중해보세요. 생각이 떠오르면 그것을 인정하고 다시 호흡으로 돌아옵니다."
        });
      }

      if (challengesResponse.status === 'fulfilled' && challengesResponse.value.ok) {
        const challengesData = await challengesResponse.value.json();
        console.log('Challenges data:', challengesData);

        if (targetChallengeId) {
          const allChallenges = [
            ...(challengesData.current ? [challengesData.current] : []),
            ...(challengesData.completed || []),
            ...(challengesData.upcoming || [])
          ];
          const selectedChallenge = allChallenges.find(c => c.id === parseInt(targetChallengeId));

          if (selectedChallenge) {
            const { currentDay, progressPercentage } = deriveSelectedChallengeProgress(selectedChallenge, targetStartedAt);
            const updatedChallenge = {
              ...selectedChallenge,
              current_day: currentDay,
              progress_percentage: progressPercentage
            };
            setCurrentChallenge(updatedChallenge);
          } else {
            setCurrentChallenge(challengesData.current);
          }
        } else {
          setCurrentChallenge(challengesData.current);
        }
      } else {
        console.log('Challenges API not available, using fallback');
        setCurrentChallenge({
          id: 6,
          name: "감정을 느끼는 연습",
          description: "머리가 아닌 몸과 마음으로 감정을 회복하는 31일",
          current_day: 20,
          total_days: 31,
          progress_percentage: 64
        });
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
    if (selectedChallengeId && selectedChallengeStartedAt) {
      fetchPracticeAndChallenge();
      setShowChallengeSelector(false);
    }
  }, [selectedChallengeId, selectedChallengeStartedAt]);

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
      let actualEndDate = challenge.end_date;
      const isSelectedChallenge = selectedChallengeId && parseInt(selectedChallengeId, 10) === challengeId;

      if (isSelectedChallenge) {
        const startReference = selectedChallengeStartedAt ? new Date(selectedChallengeStartedAt) : new Date();
        const totalDays = challenge.total_days || 7;
        const calculatedEndDate = new Date(startReference);
        calculatedEndDate.setDate(calculatedEndDate.getDate() + totalDays - 1);
        actualEndDate = `${calculatedEndDate.getFullYear()}-${String(calculatedEndDate.getMonth() + 1).padStart(2, '0')}-${String(calculatedEndDate.getDate()).padStart(2, '0')}`;
      }

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
    const startedAt = new Date().toISOString();
    const selection = setSelectedChallenge(challenge.id, startedAt);
    setSelectedChallengeInfo(selection);
    setCurrentChallenge(challenge); // 선택한 챌린지를 currentChallenge로 설정
    setShowChallengeSelector(false);
    fetchPracticeAndChallenge(challenge.id, startedAt);
  };

  // 빠른 완료 핸들러 (빈 값으로 저장)
  const handleQuickComplete = async () => {
    try {
      const userId = getUserId();

      let practiceDay = practice.day;
      if (!practiceDay && currentChallenge) {
        practiceDay = calculateSelectedChallengeDay(
          selectedChallengeStartedAt || currentChallenge.start_date,
          currentChallenge.total_days
        );
      }

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
        alert('좋아요! 오늘 실천 완료했어요');
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
      alert('빠른 완료 중 오류가 발생했습니다.');
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
            {!showChallengeSelector && Boolean(selectedChallengeId) && (
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
      </Box>
    </Container>
  );
}

export default App; 