import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { Star, TrendingUp } from '@mui/icons-material';
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

const ChallengeCard = styled(Paper, {
  shouldForwardProp: (prop) => !['selected', 'isRecommended', 'isPopular'].includes(prop),
})(({ theme, selected, isRecommended, isPopular }) => {
  let borderColor = theme.palette.grey[300];
  let boxShadowColor = 'rgba(0, 0, 0, 0.1)';
  
  if (selected) {
    borderColor = theme.palette.primary.main;
    boxShadowColor = 'rgba(25, 118, 210, 0.15)';
  } else if (isRecommended) {
    borderColor = theme.palette.success.main; // 초록색 계열 - 신뢰감과 긍정적 느낌
    boxShadowColor = 'rgba(87, 159, 89, 0.15)';
  } else if (isPopular) {
    borderColor = theme.palette.warning.main; // 주황/핑크 계열 - 활기와 따뜻함
    boxShadowColor = 'rgba(238, 124, 111, 0.15)';
  }
  
  return {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
    borderRadius: theme.spacing(2),
    border: selected || isRecommended || isPopular
      ? `2px solid ${borderColor}`
      : `1px solid ${borderColor}`,
    boxShadow: selected || isRecommended || isPopular
      ? `0 4px 20px ${boxShadowColor}`
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)',
      borderColor: selected 
        ? theme.palette.primary.main 
        : isRecommended 
          ? theme.palette.success.main 
          : isPopular 
            ? theme.palette.warning.main 
            : theme.palette.primary.main,
    },
  };
});

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
        
        // API 응답 형식 변경: current/completed/upcoming → challenges 배열
        const allChallenges = data.challenges || [];

        // URL 파라미터에서 광고 매칭 챌린지 ID 확인
        const urlParams = getUrlParams();
        const adChallengeId = urlParams.challengeId 
          ? parseInt(urlParams.challengeId) 
          : null;

        // 광고 매칭 챌린지가 있으면 첫 번째로 배치
        if (adChallengeId) {
          const adChallenge = allChallenges.find(c => c.id === adChallengeId);
          if (adChallenge) {
            setChallenges([{
              ...adChallenge,
              isRecommended: adChallenge.is_recommended || false,
              isPopular: adChallenge.is_popular || false
            }]);
            setIsAdLanding(true);
            return;
          }
        }

        // 광고 파라미터가 없거나 매칭되는 챌린지가 없는 경우 기본 목록 노출
        setIsAdLanding(false);
        
        // 추천/인기 챌린지를 상단에 배치하도록 정렬
        // 정렬 우선순위: 1) 추천 챌린지, 2) 인기 챌린지, 3) 최신순
        let sortedChallenges = [...allChallenges].sort((a, b) => {
          // 추천 챌린지 우선
          const aIsRecommended = a.is_recommended || false;
          const bIsRecommended = b.is_recommended || false;
          if (aIsRecommended && !bIsRecommended) return -1;
          if (!aIsRecommended && bIsRecommended) return 1;
          
          // 인기 챌린지 다음
          const aIsPopular = a.is_popular || false;
          const bIsPopular = b.is_popular || false;
          if (aIsPopular && !bIsPopular) return -1;
          if (!aIsPopular && bIsPopular) return 1;
          
          // 나머지는 최신순 (id 기준 내림차순, 일정형 챌린지 제거)
          return b.id - a.id;
        });
        
        // 추천/인기 챌린지는 데이터베이스에서 관리 (is_recommended, is_popular 필드)
        // API 응답에서 이미 boolean 값으로 변환되어 있음
        const displayChallenges = sortedChallenges.slice(0, 5).map((challenge) => ({
          ...challenge,
          isRecommended: challenge.is_recommended || false,
          isPopular: challenge.is_popular || false
        }));
        
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
            isRecommended={challenge.isRecommended}
            isPopular={challenge.isPopular}
            onClick={() => handleChallengeSelect(challenge)}
            elevation={selectedId === challenge.id ? 4 : 2}
          >
            <Box sx={{ position: 'relative' }}>
              {/* 추천/인기 배지 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                {challenge.isRecommended && (
                  <Chip
                    icon={<Star />}
                    label="추천"
                    color="success"
                    size="small"
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}
                  />
                )}
                {challenge.isPopular && (
                  <Chip
                    icon={<TrendingUp />}
                    label="인기"
                    color="warning"
                    size="small"
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}
                  />
                )}
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
            </Box>
          </ChallengeCard>
        ))}
      </Box>
    </Container>
  );
};

export default ChallengeSelector;

