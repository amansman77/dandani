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

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.replace(' ', 'T') + 'Z');
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 60) return diffMin <= 1 ? '방금' : `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}개월 전`;
  return `${Math.floor(diffMonth / 12)}년 전`;
}

const StoryCard = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3.5, 3, 3),
  marginBottom: theme.spacing(2.5),
  cursor: 'pointer',
  textAlign: 'left',
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '&::before': {
    content: '"\\201C"',
    position: 'absolute',
    top: 4,
    left: 16,
    fontSize: '2.5rem',
    lineHeight: 1,
    color: theme.palette.divider,
  },
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const PracticePreview = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  color: theme.palette.text.secondary,
  fontSize: '0.85rem',
}));

const CardTimestamp = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1.5),
  right: theme.spacing(2),
  color: theme.palette.text.secondary,
  opacity: 0.6,
  fontSize: '0.75rem',
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
          <StoryCard key={story.id} elevation={0} onClick={() => openStory(story.id)}>
            {story.created_at && (
              <CardTimestamp variant="caption">
                {formatRelativeTime(story.created_at)} 남겨진 이야기
              </CardTimestamp>
            )}
            <Typography variant="body1" sx={{ lineHeight: 1.7 }}>{story.title}</Typography>
            {story.practice_title && (
              <PracticePreview variant="body2">
                오늘의 한 걸음 · {story.practice_title}
              </PracticePreview>
            )}
          </StoryCard>
        ))
      )}
    </Box>
  );
};

export default StoryFeed;
