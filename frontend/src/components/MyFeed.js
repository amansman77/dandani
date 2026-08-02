import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getUserId } from '../utils/userId';
import { logChallengeDayLogged } from '../utils/analytics';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const TryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(2),
  textAlign: 'left',
}));

const ChallengeCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(3),
  textAlign: 'left',
  border: `1px solid ${theme.palette.primary.main}`,
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
  const [challenge, setChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [logging, setLogging] = useState(false);

  const fetchActiveChallenge = async () => {
    try {
      setChallengeLoading(true);
      const response = await fetch(`${API_URL}/api/user-challenges/active`, {
        headers: { 'X-User-ID': getUserId() },
      });
      if (!response.ok) throw new Error(`Failed to fetch active challenge: ${response.status}`);
      const data = await response.json();
      setChallenge(data.challenge);
    } catch (err) {
      setChallenge(null);
    } finally {
      setChallengeLoading(false);
    }
  };

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
    fetchActiveChallenge();
  }, []);

  const handleLogToday = async () => {
    if (!challenge || logging) return;
    setLogging(true);
    try {
      const response = await fetch(`${API_URL}/api/user-challenges/${challenge.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Failed to log challenge day: ${response.status}`);
      const data = await response.json();
      logChallengeDayLogged(challenge.id, data.logged_days);
      await fetchActiveChallenge();
    } catch (err) {
      setError(err.message);
    } finally {
      setLogging(false);
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

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      {!challengeLoading && challenge && (
        <ChallengeCard>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>
            진행 중인 챌린지 · {challenge.logged_days}/{challenge.duration_days}일째
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'bold' }}>
            {challenge.practice_title}
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <Button
              variant={challenge.logged_today ? 'outlined' : 'contained'}
              size="small"
              disabled={challenge.logged_today || logging}
              onClick={handleLogToday}
            >
              {logging ? <CircularProgress size={18} /> : (challenge.logged_today ? '오늘은 기록했어요' : '오늘 기록하기')}
            </Button>
          </Box>
        </ChallengeCard>
      )}

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
