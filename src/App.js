import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Paper, CircularProgress, Tabs, Tab, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import ChatInterface from './components/ChatInterface';

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

  useEffect(() => {
    const fetchPractice = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Fetching from:', `${API_URL}/api/practice/today`);
        const response = await fetch(`${API_URL}/api/practice/today`, {
          headers: {
            'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            'X-Client-Time': new Date().toISOString()
          }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch practice: ${response.status} ${responseText}`);
        }
        
        const data = JSON.parse(responseText);
        console.log('Parsed data:', data);
        setPractice(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPractice();
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
          </Tabs>
        </Box>

        {activeTab === 0 && (
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
        )}

        {activeTab === 1 && (
          <ChatInterface />
        )}
      </Box>
    </Container>
  );
}

export default App; 