import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getUserId } from '../utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const TryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(2),
  textAlign: 'left',
}));

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
  color: theme.palette.text.secondary,
}));

const formatDate = (isoString) => {
  const date = new Date(`${isoString.replace(' ', 'T')}Z`);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
};

const MyFeed = () => {
  const [tries, setTries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyFeed = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/api/my-feed`, {
          headers: { 'X-User-ID': getUserId() },
        });
        if (!response.ok) throw new Error(`Failed to fetch my feed: ${response.status}`);
        const data = await response.json();
        setTries(data.tries || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMyFeed();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      {(!tries || tries.length === 0) ? (
        <EmptyState>
          <Typography variant="h6" gutterBottom>
            아직 해본 실천이 없어요
          </Typography>
          <Typography variant="body2">
            이야기 탭에서 마음이 가는 이야기를 골라 오늘의 한 걸음을 시작해보세요.
          </Typography>
        </EmptyState>
      ) : (
        tries.map((t) => (
          <TryCard key={t.try_id}>
            <Typography variant="caption" color="text.secondary">
              {formatDate(t.tried_at)}
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'bold' }}>
              {t.practice_title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t.story_title}
            </Typography>
          </TryCard>
        ))
      )}
    </Box>
  );
};

export default MyFeed;
