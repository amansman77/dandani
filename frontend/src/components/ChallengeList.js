import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ChallengeCard from './ChallengeCard';
import ChallengeDetail from './ChallengeDetail';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const SectionContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  fontWeight: 'bold',
  color: theme.palette.text.primary,
}));

const EmptyState = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(4),
  color: theme.palette.text.secondary,
}));

const ChallengeList = () => {
  const [challenges, setChallenges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 실제 API 호출
      console.log('Fetching challenges from:', `${API_URL}/api/challenges`);
      const response = await fetch(`${API_URL}/api/challenges`, {
        headers: {
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString()
        }
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Challenges data:', data);
        setChallenges(data);
      } else {
        throw new Error(`Failed to fetch challenges: ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        챌린지 목록을 불러오는 중 오류가 발생했습니다: {error}
      </Alert>
    );
  }

  if (!challenges) {
    return (
      <EmptyState>
        <Typography variant="h6" gutterBottom>
          챌린지 정보를 불러올 수 없습니다
        </Typography>
        <Typography variant="body2">
          잠시 후 다시 시도해주세요.
        </Typography>
      </EmptyState>
    );
  }

  // 챌린지 상세 보기 모드
  if (selectedChallengeId) {
    return (
      <ChallengeDetail 
        challengeId={selectedChallengeId}
        onBack={() => setSelectedChallengeId(null)}
      />
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      {/* 현재 진행 중인 챌린지 */}
      {challenges.current && (
        <SectionContainer>
          <SectionTitle variant="h5">
            🎯 현재 진행 중인 챌린지
          </SectionTitle>
          <ChallengeCard 
            challenge={challenges.current} 
            type="current"
            onClick={() => setSelectedChallengeId(challenges.current.id)}
          />
        </SectionContainer>
      )}

      {/* 완료된 챌린지들 */}
      {challenges.completed && challenges.completed.length > 0 && (
        <SectionContainer>
          <SectionTitle variant="h5">
            📚 완료된 챌린지들
          </SectionTitle>
          {challenges.completed.map((challenge, index) => (
            <ChallengeCard 
              key={challenge.id} 
              challenge={challenge} 
              type="completed"
              onClick={() => setSelectedChallengeId(challenge.id)}
            />
          ))}
        </SectionContainer>
      )}

      {/* 예정된 챌린지들 */}
      {challenges.upcoming && challenges.upcoming.length > 0 && (
        <SectionContainer>
          <SectionTitle variant="h5">
            🔮 예정된 챌린지들
          </SectionTitle>
          {challenges.upcoming.map((challenge, index) => (
            <ChallengeCard 
              key={challenge.id} 
              challenge={challenge} 
              type="upcoming"
              onClick={() => setSelectedChallengeId(challenge.id)}
            />
          ))}
        </SectionContainer>
      )}

      {/* 모든 섹션이 비어있는 경우 */}
      {(!challenges.current && 
        (!challenges.completed || challenges.completed.length === 0) && 
        (!challenges.upcoming || challenges.upcoming.length === 0)) && (
        <EmptyState>
          <Typography variant="h6" gutterBottom>
            아직 챌린지가 없습니다
          </Typography>
          <Typography variant="body2">
            새로운 챌린지가 시작되면 여기에 표시됩니다.
          </Typography>
        </EmptyState>
      )}
    </Box>
  );
};

export default ChallengeList;
