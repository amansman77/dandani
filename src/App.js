import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Paper, CircularProgress, Tabs, Tab, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import ChatInterface from './components/ChatInterface';
import ChallengeList from './components/ChallengeList';
import ChallengeContext from './components/ChallengeContext';
import ChallengeDetail from './components/ChallengeDetail';
import FeedbackModal from './components/FeedbackModal';
import PracticeRecordModal from './components/PracticeRecordModal';
import PracticeHistory from './components/PracticeHistory';
import { getUserId } from './utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
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
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [historyTabOpen, setHistoryTabOpen] = useState(false);
  
  // 현재 챌린지 상세보기 상태
  const [showCurrentChallengeDetail, setShowCurrentChallengeDetail] = useState(false);

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
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // 현재 챌린지 상세보기 핸들러
  const handleViewCurrentChallenge = (challengeId) => {
    setShowCurrentChallengeDetail(true);
  };

  // 현재 챌린지 상세보기에서 뒤로가기 핸들러
  const handleBackFromChallengeDetail = () => {
    setShowCurrentChallengeDetail(false);
  };

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
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          단단이
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
          감정적으로 힘들 때 중심을 잃지 않게 해주는 동반자
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} centered>
            <Tab label="오늘의 이야기" />
            <Tab label="대화하기" />
            <Tab label="챌린지" />
            <Tab label="기록 보기" />
          </Tabs>
        </Box>

        {activeTab === 0 && !showCurrentChallengeDetail && (
          <>
            {/* 현재 챌린지 컨텍스트 */}
            <ChallengeContext 
              challenge={currentChallenge} 
              onViewCurrentChallenge={handleViewCurrentChallenge}
            />
            
            <StyledPaper elevation={3}>
              <Typography variant="h6" color="primary" gutterBottom>
                {practice?.title}
              </Typography>
              <Typography variant="body1" paragraph sx={{ mt: 3 }}>
                {practice?.description}
              </Typography>
              

              
              {/* 실천 가이드 질문 유도 섹션 */}
              <Box sx={{ 
                mt: 4, 
                p: 2, 
                bgcolor: 'grey.50', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200',
                textAlign: 'center'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  💭 궁금한 점이 있나요?{' '}
                  <Button 
                    variant="text" 
                    size="small"
                    onClick={() => setActiveTab(1)}
                    sx={{ 
                      textTransform: 'none',
                      fontWeight: 'normal',
                      p: 0,
                      minWidth: 'auto',
                      color: 'primary.main',
                      textDecoration: 'underline',
                      ml: 1
                    }}
                  >
                    단단이와 이야기하기
                  </Button>
                </Typography>
              </Box>
              
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
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          color: 'success.main',
                          borderColor: 'success.main'
                        }}
                      >
                        기록 확인하기 👀
                      </Button>
                      <Button 
                        variant="text" 
                        size="large"
                        onClick={() => setActiveTab(3)}
                        sx={{ 
                          borderRadius: 2,
                          px: 4,
                          py: 1.5,
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          color: 'primary.main'
                        }}
                      >
                        전체 기록 보기 📚
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      실천을 마치셨나요?
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="large"
                      onClick={() => setFeedbackModalOpen(true)}
                      sx={{ 
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }}
                    >
                      실천 기록하기 ✨
                    </Button>
                  </>
                )}
              </Box>
            </StyledPaper>
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
          <ChallengeList />
        )}

        {activeTab === 3 && (
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

        {/* 피드백 모달 */}
        <FeedbackModal
          open={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          practice={practice}
          challenge={currentChallenge}
          onSubmit={async (feedback) => {
            try {
              const userId = getUserId();
              const response = await fetch(`${API_URL}/api/feedback/submit`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-User-ID': userId
                },
                body: JSON.stringify(feedback)
              });
              
              if (response.ok) {
                const result = await response.json();
                alert('실천을 기록했습니다! 📝');
                console.log('Feedback submitted:', result);
                
                // 실천 기록이 성공적으로 제출되었으므로 기록된 상태로 표현
                if (practice) {
                  setPractice({
                    ...practice,
                    isRecorded: true  // 실제 기록이 있으므로 true로 설정
                  });
                }
                
                // 백엔드에서도 다시 가져오기 시도 (임시 해결책)
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
                throw new Error('피드백 제출에 실패했습니다.');
              }
            } catch (error) {
              console.error('Feedback submission error:', error);
              alert('피드백 제출 중 오류가 발생했습니다.');
            }
          }}
        />

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
      </Box>
    </Container>
  );
}

export default App; 