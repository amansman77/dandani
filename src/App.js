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
import { getUserId, getUserIdInfo, markUserInitialized } from './utils/userId';
import { initAnalytics } from './utils/analytics';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  textAlign: 'center',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  backgroundColor: theme.palette.primary.main, // 메인 블루 배경
  color: theme.palette.primary.contrastText, // 흰색 텍스트
  position: 'relative',
  overflow: 'hidden',
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
  

  const fetchPracticeAndChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      // 사용자 ID 가져오기
      const userId = getUserId();
      
      // 오늘의 실천 과제와 현재 챌린지 정보를 함께 가져오기
      const [practiceResponse, challengesResponse] = await Promise.allSettled([
        fetch(`${API_URL}/api/practice/today`, {
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

      // 실천 과제 처리
      if (practiceResponse.status === 'fulfilled' && practiceResponse.value.ok) {
        const practiceData = await practiceResponse.value.json();
        console.log('Practice data:', practiceData);
        setPractice(practiceData);
      } else {
        console.log('Practice API not available, using fallback');
        // Fallback 데이터
        setPractice({
          title: "오늘의 단단이가 되는 법",
          description: "3분 동안 눈을 감고 깊은 호흡을 하며, 현재 순간에 집중해보세요. 생각이 떠오르면 그것을 인정하고 다시 호흡으로 돌아옵니다."
        });
      }

      // 챌린지 정보 처리
      if (challengesResponse.status === 'fulfilled' && challengesResponse.value.ok) {
        const challengesData = await challengesResponse.value.json();
        console.log('Challenges data:', challengesData);
        setCurrentChallenge(challengesData.current);
      } else {
        console.log('Challenges API not available, using fallback');
        // Fallback 데이터
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
    fetchPracticeAndChallenge();
    
    // 새 사용자 온보딩 체크
    const { isNew } = getUserIdInfo();
    if (isNew) {
      setShowOnboarding(true);
    }
  }, []);

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
      setSelectedChallengeForEnvelope({
        id: challengeId,
        name: challenge.name,
        endDate: challenge.end_date
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

  // 빠른 완료 핸들러 (빈 값으로 저장)
  const handleQuickComplete = async () => {
    try {
      const userId = getUserId();
      
      // practice.day가 없으면 현재 챌린지의 현재 일차를 계산
      let practiceDay = practice.day;
      if (!practiceDay && currentChallenge) {
        const now = new Date();
        const startDate = new Date(currentChallenge.start_date);
        const dayDiff = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        practiceDay = dayDiff + 1;
      }

      // 빈 값으로 빠른 완료 데이터 생성
      const quickCompleteData = {
        challengeId: currentChallenge?.id,
        practiceDay: practiceDay,
        moodChange: null, // 빈 값
        wasHelpful: null, // 빈 값
        practiceDescription: null // 빈 값
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
        alert('실천을 완료했습니다! 🎉');
        console.log('Quick complete submitted:', result);
        
        // 실천 기록이 성공적으로 제출되었으므로 기록된 상태로 표현
        if (practice) {
          setPractice({
            ...practice,
            isRecorded: true
          });
        }
        
        // 백엔드에서도 다시 가져오기 시도
        try {
          const practiceResponse = await fetch(`${API_URL}/api/practice/today`, {
            headers: {
              'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
              'X-Client-Time': new Date().toISOString(),
              'X-User-ID': userId
            }
          });
          
          if (practiceResponse.ok) {
            const updatedPractice = await practiceResponse.json();
            setPractice(updatedPractice);
          }
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
              label="나와 대화하기" 
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
            {/* 오늘의 실천 과제 카드 (위로 이동) */}
            <StyledPaper elevation={3}>
              <Typography variant="h6" color="primary.contrastText" gutterBottom sx={{
                fontSize: { xs: '1.4rem', sm: '1.6rem' },
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'white'
              }}>
                오늘의 추천 실천
              </Typography>
              <Typography variant="body1" paragraph sx={{ 
                mt: 3,
                fontSize: { xs: '1.1rem', sm: '1.2rem' },
                lineHeight: 1.6,
                color: 'white',
                opacity: 0.9
              }}>
                {practice?.description}
              </Typography>
              
              {/* 실천 완료/확인 버튼 */}
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                {practice?.isRecorded ? (
                  <>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Button 
                        variant="outlined" 
                        size="large"
                        onClick={() => setRecordModalOpen(true)}
                        sx={{ 
                          borderRadius: 3,
                          px: 6,
                          py: 2,
                          fontSize: { xs: '1.2rem', sm: '1.3rem' },
                          fontWeight: 'bold',
                          color: 'success.main',
                          borderColor: 'success.main',
                          borderWidth: 2,
                          minHeight: '56px',
                          '&:hover': {
                            borderWidth: 2,
                            backgroundColor: 'success.50'
                          }
                        }}
                      >
                        기록 확인하기
                      </Button>
                      <Button 
                        variant="text" 
                        size="large"
                        onClick={() => setActiveTab(2)}
                        sx={{ 
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.5)'
                        }
                        }}
                      >
                        전체 기록 보기
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      실천을 마치셨나요?
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="large"
                      onClick={handleQuickComplete}
                      sx={{ 
                        borderRadius: 2,
                        px: 6,
                        py: 2,
                        fontSize: { xs: '1.1rem', sm: '1.2rem' },
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: theme => theme.shadows[2],
                        '&:hover': {
                          boxShadow: theme => theme.shadows[4],
                          transform: 'translateY(-1px)'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      실천 기록하기 ✨
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