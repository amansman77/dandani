import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Button,
  TextField,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getUserId } from '../utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const EXAMPLE_PHRASES = [
  '오늘도 흔들리지 않는다',
  '천천히, 그러나 꾸준히',
  '나는 나답게 살아간다',
];

const PhraseCard = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(5, 4, 4),
  textAlign: 'center',
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  '&::before': {
    content: '"\\201C"',
    position: 'absolute',
    top: 8,
    left: 24,
    fontSize: '3rem',
    lineHeight: 1,
    color: theme.palette.divider,
  },
}));

const DailyPhrase = () => {
  const [phrase, setPhrase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logging, setLogging] = useState(false);

  const fetchActivePhrase = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/phrases/active`, {
        headers: { 'X-User-ID': getUserId() },
      });
      if (!response.ok) throw new Error(`Failed to fetch phrase: ${response.status}`);
      const data = await response.json();
      setPhrase(data.phrase);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePhrase();
  }, []);

  const handleSubmit = async () => {
    if (!inputValue.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/phrases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({ phrase: inputValue.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '문구 등록에 실패했습니다.');
      setInputValue('');
      await fetchActivePhrase();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogToday = async () => {
    if (!phrase || logging) return;
    setLogging(true);
    try {
      const response = await fetch(`${API_URL}/api/phrases/${phrase.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Failed to log phrase day: ${response.status}`);
      await fetchActivePhrase();
    } catch (err) {
      setError(err.message);
    } finally {
      setLogging(false);
    }
  };

  const handleRetire = async () => {
    if (!phrase) return;
    try {
      const response = await fetch(`${API_URL}/api/phrases/${phrase.id}/retire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Failed to retire phrase: ${response.status}`);
      await fetchActivePhrase();
    } catch (err) {
      setError(err.message);
    }
  };

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

  if (!phrase) {
    return (
      <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
        <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
          매일 아침 나에게 되새기고 싶은 한 문장을 적어보세요.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3 }}>
          {EXAMPLE_PHRASES.map((example) => (
            <Chip
              key={example}
              label={example}
              variant="outlined"
              onClick={() => setInputValue(example)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="예: 오늘도 흔들리지 않는다"
          sx={{ mb: 2 }}
        />
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            disabled={!inputValue.trim() || submitting}
            onClick={handleSubmit}
            sx={{ px: 4, py: 1.5 }}
          >
            {submitting ? <CircularProgress size={20} /> : '시작하기'}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1.5 }}>
        {phrase.logged_days}일째 되새기는 중
      </Typography>
      <PhraseCard elevation={0}>
        <Typography variant="h6" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {phrase.phrase}
        </Typography>
      </PhraseCard>
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button
          variant={phrase.logged_today ? 'outlined' : 'contained'}
          disabled={phrase.logged_today || logging}
          onClick={handleLogToday}
          sx={{ px: 4, py: 1.5 }}
        >
          {logging ? <CircularProgress size={20} /> : (phrase.logged_today ? '오늘은 완료했어요' : '완료')}
        </Button>
      </Box>
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography
          variant="body2"
          sx={{ cursor: 'pointer', color: 'text.secondary' }}
          onClick={handleRetire}
        >
          문구 바꾸기
        </Typography>
      </Box>
    </Box>
  );
};

export default DailyPhrase;
