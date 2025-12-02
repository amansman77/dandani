import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { logEvent } from '../utils/analytics';
import { setSelectedChallengeId } from '../utils/challengeSelection';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const Container = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 800,
  margin: '0 auto',
  padding: theme.spacing(3),
}));

const TitleBox = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(4),
}));

const ChallengeCard = styled(Paper)(({ theme, selected }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  borderRadius: theme.spacing(2),
  border: selected 
    ? `2px solid ${theme.palette.primary.main}` 
    : `1px solid ${theme.palette.grey[300]}`,
  boxShadow: selected
    ? '0 4px 20px rgba(25, 118, 210, 0.15)'
    : '0 2px 8px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)',
    borderColor: theme.palette.primary.main,
  },
}));

const ChallengeSelector = ({ onChallengeSelected }) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isAdLanding, setIsAdLanding] = useState(false);

  // URL 파라미터에서 광고 소스 정보 추출
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('source'),
      challengeId: params.get('challenge_id'),
    };
  };

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/challenges`, {
        headers: {
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString()
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // 모든 챌린지를 하나의 배열로 합치기 (current, completed, upcoming)
        const allChallenges = [
          ...(data.current ? [data.current] : []),
          ...(data.completed || []),
          ...(data.upcoming || [])
        ];

        // URL 파라미터에서 광고 매칭 챌린지 ID 확인
        const urlParams = getUrlParams();
        const adChallengeId = urlParams.challengeId 
          ? parseInt(urlParams.challengeId) 
          : null;

        // 최신 챌린지 순으로 정렬 (start_date 기준 내림차순)
        let sortedChallenges = [...allChallenges].sort((a, b) => {
          const dateA = new Date(a.start_date);
          const dateB = new Date(b.start_date);
          return dateB - dateA; // 최신순 (내림차순)
        });

        // 광고 매칭 챌린지가 있으면 첫 번째로 배치
        if (adChallengeId) {
          const adChallengeIndex = sortedChallenges.findIndex(
            c => c.id === adChallengeId
          );
          if (adChallengeIndex > -1) {
            const adChallenge = sortedChallenges[adChallengeIndex];
            setChallenges([adChallenge]);
            setIsAdLanding(true);
            return;
          }
        }

        // 광고 파라미터가 없거나 매칭되는 챌린지가 없는 경우 기본 목록 노출
        setIsAdLanding(false);
        const displayChallenges = sortedChallenges.slice(0, 5);
        
        setChallenges(displayChallenges);
      } else {
        throw new Error(`Failed to fetch challenges: ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleChallengeSelect = (challenge) => {
    setSelectedId(challenge.id);
    
    // LocalStorage에 선택한 챌린지 저장
    setSelectedChallengeId(challenge.id);
    
    // URL 파라미터에서 source 정보 추출
    const urlParams = getUrlParams();
    const source = urlParams.source || 'direct';
    
    // challenge_selected 이벤트 로깅
    logEvent('challenge_selected', {
      challenge_id: challenge.id,
      challenge_name: challenge.name,
      total_days: challenge.total_days,
      source: source
    });
    
    // 부모 컴포넌트에 선택 완료 알림
    if (onChallengeSelected) {
      onChallengeSelected(challenge);
    }
  };

  const formatDuration = (totalDays) => {
    return `${totalDays}일 챌린지`;
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mb: 2 }}>
          챌린지 목록을 불러오는 중 오류가 발생했습니다: {error}
        </Alert>
      </Container>
    );
  }

  if (challenges.length === 0) {
    return (
      <Container>
        <Alert severity="info">
          현재 선택 가능한 챌린지가 없습니다.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <TitleBox>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            color: 'text.primary',
            mb: 2,
            whiteSpace: 'pre-line'
          }}
        >
          {isAdLanding ? '이 실천에 초대받았어요' : '오늘 하고 싶은\n작은 실천을 골라보세요'}
        </Typography>
        {isAdLanding && (
          <Typography variant="body1" color="text.secondary">
            초대된 챌린지에 바로 참여해 보세요.
          </Typography>
        )}
      </TitleBox>

      <Box>
        {challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            selected={selectedId === challenge.id}
            onClick={() => handleChallengeSelect(challenge)}
            elevation={selectedId === challenge.id ? 4 : 2}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="h6" 
                  component="h2"
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'text.primary',
                    mb: 1
                  }}
                >
                  {challenge.name}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  {challenge.description}
                </Typography>
              </Box>
              <Chip
                label={formatDuration(challenge.total_days)}
                color="primary"
                variant="outlined"
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>
          </ChallengeCard>
        ))}
      </Box>
    </Container>
  );
};

export default ChallengeSelector;

