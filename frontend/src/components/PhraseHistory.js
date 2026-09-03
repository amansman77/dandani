import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { getUserId } from '../utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const SERIF = '"Pretendard", "Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important';
const SANS = '"Pretendard", -apple-system, "system-ui", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important';

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
        <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
          <Typography sx={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.85rem', color: '#a9764f', mb: 2 }}>
            아직, 여기엔
          </Typography>
          <Typography sx={{ fontFamily: SERIF, fontSize: '1.2rem', color: '#322f29', mb: 1.5, lineHeight: 1.6 }}>
            쌓인 아침이 없어요
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: '0.8rem', color: '#8c8578', lineHeight: 1.8 }}>
            오늘 탭에서 문장을 적으면
            <br />
            여기에 하루씩 쌓여요.
          </Typography>
        </Box>
      ) : (
        phrases.map((p) => (
          <Box key={p.id} sx={{ py: 2.75, borderBottom: '1px solid rgba(128,128,128,0.16)' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.25 }}>
              <Typography sx={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.75rem', color: '#a9764f' }}>
                {formatDate(p.started_at)}부터
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: '0.66rem',
                  letterSpacing: '0.02em',
                  color: p.status === 'active' ? '#b06a45' : '#a39a89',
                }}
              >
                {p.status === 'active' ? '진행 중' : '종료'}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: '1.1rem',
                lineHeight: 1.55,
                color: p.status === 'active' ? '#322f29' : '#6b6355',
                mb: 1,
              }}
            >
              {p.phrase}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: '0.72rem', color: '#8c8578' }}>
              {p.logged_days}일 되새김
            </Typography>
          </Box>
        ))
      )}
    </Box>
  );
};

export default PhraseHistory;
