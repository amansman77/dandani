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

const PhraseCard = styled(Paper)(({ theme }) => ({
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
  if (!isoString) return '';
  const date = new Date(`${isoString.replace(' ', 'T')}Z`);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
};

const PhraseHistory = () => {
  const [phrases, setPhrases] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/api/phrases/history`, {
          headers: { 'X-User-ID': getUserId() },
        });
        if (!response.ok) throw new Error(`Failed to fetch history: ${response.status}`);
        const data = await response.json();
        setPhrases(data.phrases || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
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
      {(!phrases || phrases.length === 0) ? (
        <EmptyState>
          <Typography variant="h6" gutterBottom>
            아직 기록이 없어요
          </Typography>
          <Typography variant="body2">
            오늘 탭에서 매일 되새기고 싶은 문장을 적어보세요.
          </Typography>
        </EmptyState>
      ) : (
        phrases.map((p) => (
          <PhraseCard key={p.id}>
            <Typography variant="caption" color="text.secondary">
              {formatDate(p.started_at)}부터 · {p.status === 'active' ? '진행 중' : '종료'}
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'bold' }}>
              {p.phrase}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {p.logged_days}일 되새김
            </Typography>
          </PhraseCard>
        ))
      )}
    </Box>
  );
};

export default PhraseHistory;
