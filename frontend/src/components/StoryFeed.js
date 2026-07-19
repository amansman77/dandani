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
import StoryFeelingSheet from './StoryFeelingSheet';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const StoryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginBottom: theme.spacing(2),
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const IntroText = styled(Typography)(({ theme }) => ({
  textAlign: 'left',
  marginBottom: theme.spacing(3),
  color: theme.palette.text.secondary,
}));

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
  color: theme.palette.text.secondary,
}));

const StoryFeed = () => {
  const [stories, setStories] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tryResult, setTryResult] = useState(null);
  const [trying, setTrying] = useState(false);
  const [feelingSheetOpen, setFeelingSheetOpen] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/stories`);
      if (!response.ok) throw new Error(`Failed to fetch stories: ${response.status}`);
      const data = await response.json();
      setStories(data.stories || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openStory = async (storyId) => {
    setSelectedStoryId(storyId);
    setTryResult(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/stories/${storyId}`);
      if (!response.ok) throw new Error(`Failed to fetch story: ${response.status}`);
      setDetail(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTry = async () => {
    setTrying(true);
    try {
      const response = await fetch(`${API_URL}/api/stories/${selectedStoryId}/try`, {
        method: 'POST',
        headers: { 'X-User-ID': getUserId() },
      });
      if (!response.ok) throw new Error(`Failed to record try: ${response.status}`);
      setTryResult(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setTrying(false);
    }
  };

  const backToFeed = () => {
    setSelectedStoryId(null);
    setDetail(null);
    setTryResult(null);
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

  // Story 상세 화면
  if (selectedStoryId) {
    if (detailLoading || !detail) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (tryResult) {
      return (
        <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
              오늘의 한 걸음을 시작했어요 🌱
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap', textAlign: 'left' }}>
              {tryResult.practice.title}
            </Typography>
            {tryResult.practice.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'left' }}>
                {tryResult.practice.description}
              </Typography>
            )}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Typography
                variant="button"
                sx={{ cursor: 'pointer', color: 'primary.main' }}
                onClick={() => setFeelingSheetOpen(true)}
              >
                지금 느낌 남기기
              </Typography>
              <Typography
                variant="button"
                sx={{ cursor: 'pointer', color: 'text.secondary' }}
                onClick={backToFeed}
              >
                다른 이야기 보기
              </Typography>
            </Box>
          </Paper>
          <StoryFeelingSheet
            open={feelingSheetOpen}
            tryId={tryResult.tryId}
            practiceTitle={tryResult.practice.title}
            onClose={() => setFeelingSheetOpen(false)}
            onSaved={() => {}}
            onError={(err) => setError(err.message)}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
        <Typography
          variant="body2"
          sx={{ mb: 2, cursor: 'pointer', color: 'text.secondary' }}
          onClick={backToFeed}
        >
          ← 목록으로
        </Typography>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            {detail.title}
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
            {detail.content}
          </Typography>
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary">
              오늘의 한 걸음
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
              {detail.practice_title}
            </Typography>
            {detail.practice_description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {detail.practice_description}
              </Typography>
            )}
          </Box>
        </Paper>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography
            variant="button"
            component="button"
            disabled={trying}
            onClick={handleTry}
            sx={{
              cursor: trying ? 'default' : 'pointer',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              border: 'none',
            }}
          >
            {trying ? '기록하는 중...' : '나도 해보기'}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Story Feed 목록 화면
  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <IntroText variant="body2">
        나와 닮은 이야기를 찾아보세요. 그 사람이 남긴 작은 실천을 함께 해볼 수 있어요.
      </IntroText>
      {(!stories || stories.length === 0) ? (
        <EmptyState>
          <Typography variant="h6" gutterBottom>
            아직 이야기가 없어요
          </Typography>
          <Typography variant="body2">
            곧 첫 이야기가 채워질 거예요.
          </Typography>
        </EmptyState>
      ) : (
        stories.map((story) => (
          <StoryCard key={story.id} onClick={() => openStory(story.id)}>
            <Typography variant="body1">{story.title}</Typography>
          </StoryCard>
        ))
      )}
    </Box>
  );
};

export default StoryFeed;
