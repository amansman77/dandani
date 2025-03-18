import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
}));

const PracticeButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(1.5, 4),
  borderRadius: '30px',
  textTransform: 'none',
  fontSize: '1.1rem',
}));

function App() {
  const [practice, setPractice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPractice = async () => {
      try {
        const response = await fetch('https://dandani-api.amansman77.workers.dev/api/practice/today');
        if (!response.ok) {
          throw new Error('Failed to fetch practice');
        }
        const data = await response.json();
        setPractice(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPractice();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ py: 4 }}>
          <Typography variant="h6" color="error" align="center">
            오류가 발생했습니다: {error}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          단단이
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
          감정적으로 단단해지는 연습
        </Typography>

        <StyledPaper elevation={3}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            오늘의 단단이가 되는 법
          </Typography>
          <Typography variant="h6" color="primary" gutterBottom>
            {practice?.title}
          </Typography>
          <Typography variant="body1" paragraph sx={{ mt: 3 }}>
            {practice?.description}
          </Typography>
          <PracticeButton variant="contained" color="primary" size="large">
            실천하기
          </PracticeButton>
        </StyledPaper>
      </Box>
    </Container>
  );
}

export default App; 