import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Paper, CircularProgress, Tabs, Tab, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import ChatInterface from './components/ChatInterface';
import ChallengeList from './components/ChallengeList';
import ChallengeContext from './components/ChallengeContext';

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

  useEffect(() => {
    const fetchPracticeAndChallenge = async () => {
      setLoading(true);
      setError(null);
      try {
        // 오늘의 실천 과제와 현재 챌린지 정보를 함께 가져오기
        const [practiceResponse, challengesResponse] = await Promise.allSettled([
          fetch(`${API_URL}/api/practice/today`, {
            headers: {
              'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
              'X-Client-Time': new Date().toISOString()
            }
          }),
          fetch(`${API_URL}/api/challenges`, {
            headers: {
              'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
              'X-Client-Time': new Date().toISOString()
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

    fetchPracticeAndChallenge();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <>
            {/* 현재 챌린지 컨텍스트 */}
            <ChallengeContext 
              challenge={currentChallenge} 
              onViewAllChallenges={() => setActiveTab(2)}
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
                borderColor: 'grey.200'
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
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
      </Box>
    </Container>
  );
}

export default App; 