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
import { pushNavState, goBack } from '../utils/navHistory';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const ProgressCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(3),
  textAlign: 'left',
  border: `1px solid ${theme.palette.primary.main}`,
}));

const CatalogCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  textAlign: 'left',
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const Tag = styled(Typography)(({ theme }) => ({
  display: 'inline-block',
  fontSize: '0.75rem',
  color: theme.palette.primary.main,
  fontWeight: 'bold',
  marginRight: theme.spacing(1),
}));

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
  color: theme.palette.text.secondary,
}));

const ChallengeFeed = () => {
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [activeLoading, setActiveLoading] = useState(true);
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState(null);

  const fetchActiveChallenge = async () => {
    try {
      setActiveLoading(true);
      const response = await fetch(`${API_URL}/api/user-challenges/active`, {
        headers: { 'X-User-ID': getUserId() },
      });
      if (!response.ok) throw new Error(`Failed to fetch active challenge: ${response.status}`);
      const data = await response.json();
      setActiveChallenge(data.challenge);
    } catch (err) {
      setActiveChallenge(null);
    } finally {
      setActiveLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      setCatalogLoading(true);
      const response = await fetch(`${API_URL}/api/challenges`);
      if (!response.ok) throw new Error(`Failed to fetch challenges: ${response.status}`);
      const data = await response.json();
      setCatalog(data.challenges || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveChallenge();
    fetchCatalog();
  }, []);

  // 챌린지 상세로 들어갈 때 히스토리를 한 단계 쌓아서, 모바일 뒤로가기
  // 제스처가 앱을 빠져나가지 않고 목록으로 돌아오게 한다
  useEffect(() => {
    const handlePopState = (event) => {
      const stillInDetail = event.state?.challengeView === 'detail';
      if (!stillInDetail) {
        setSelectedId(null);
        setDetail(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openDetail = async (id) => {
    setSelectedId(id);
    pushNavState({ tab: 1, challengeId: id, challengeView: 'detail' });
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user-challenges/catalog/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch challenge detail: ${response.status}`);
      setDetail(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/user-challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({ sourceChallengeId: selectedId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '챌린지 시작에 실패했습니다.');
      goBack();
      await fetchActiveChallenge();
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleLogToday = async () => {
    if (!activeChallenge || logging) return;
    setLogging(true);
    try {
      const response = await fetch(`${API_URL}/api/user-challenges/${activeChallenge.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Failed to log challenge day: ${response.status}`);
      const data = await response.json();
      logChallengeDayLogged(activeChallenge.id, data.logged_days);
      await fetchActiveChallenge();
    } catch (err) {
      setError(err.message);
    } finally {
      setLogging(false);
    }
  };

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  // 챌린지 상세(미리보기) 화면
  if (selectedId) {
    if (detailLoading || !detail) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
        <Typography
          variant="body2"
          sx={{ mb: 2, cursor: 'pointer', color: 'text.secondary' }}
          onClick={goBack}
        >
          ← 목록으로
        </Typography>
        <Paper sx={{ p: 4 }}>
          {detail.is_popular && <Tag>인기</Tag>}
          {detail.is_recommended && <Tag>추천</Tag>}
          <Typography variant="h6" gutterBottom>
            {detail.name}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
            {detail.description}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            총 {detail.total_days}일 동안 매일 하나씩 실천해요.
          </Typography>
          {detail.practices && detail.practices.length > 0 && (
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="overline" color="text.secondary">
                1일차
              </Typography>
              <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
                {detail.practices[0].title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {detail.practices[0].description}
              </Typography>
            </Box>
          )}
          {activeChallenge && (
            <Alert severity="info" sx={{ mt: 3 }}>
              이미 진행 중인 챌린지가 있어요. 먼저 완료하거나 기다려주세요.
            </Alert>
          )}
        </Paper>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="contained"
            disabled={starting || !!activeChallenge}
            onClick={handleStart}
            sx={{ px: 4, py: 1.5 }}
          >
            {starting ? <CircularProgress size={20} /> : '시작하기'}
          </Button>
        </Box>
      </Box>
    );
  }

  // 챌린지 탭 메인 화면
  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      {!activeLoading && activeChallenge && (
        <ProgressCard>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>
            진행 중인 챌린지 · {activeChallenge.logged_days}/{activeChallenge.duration_days}일째
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'bold' }}>
            {activeChallenge.today_practice_title}
          </Typography>
          {activeChallenge.today_practice_description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {activeChallenge.today_practice_description}
            </Typography>
          )}
          <Box sx={{ mt: 1.5 }}>
            <Button
              variant={activeChallenge.logged_today ? 'outlined' : 'contained'}
              size="small"
              disabled={activeChallenge.logged_today || logging}
              onClick={handleLogToday}
            >
              {logging ? <CircularProgress size={18} /> : (activeChallenge.logged_today ? '오늘은 기록했어요' : '오늘 기록하기')}
            </Button>
          </Box>
        </ProgressCard>
      )}

      {!activeLoading && !activeChallenge && (
        <EmptyState sx={{ mb: 2, py: 2 }}>
          <Typography variant="body2">
            아직 시작한 챌린지가 없어요. 이야기 탭에서 마음에 드는 이야기를 먼저 만나보거나,
            아래에서 다른 사람들의 챌린지를 둘러보세요.
          </Typography>
        </EmptyState>
      )}

      {catalogLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        (catalog || []).map((c) => (
          <CatalogCard key={c.id} onClick={() => openDetail(c.id)}>
            {c.is_popular && <Tag>인기</Tag>}
            {c.is_recommended && <Tag>추천</Tag>}
            <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 0.5 }}>
              {c.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {c.description}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {c.total_days}일 챌린지
            </Typography>
          </CatalogCard>
        ))
      )}
    </Box>
  );
};

export default ChallengeFeed;
