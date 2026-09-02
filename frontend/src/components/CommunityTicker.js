import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { getUserId } from '../utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const SERIF = '"Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important';
const SANS = '-apple-system, "system-ui", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important';

const CommunityTicker = () => {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const response = await fetch(`${API_URL}/api/phrases/community`, {
          headers: { 'X-User-ID': getUserId() },
        });
        if (!response.ok) return;
        const data = await response.json();
        setItems(data.items || []);
      } catch (err) {
        // 티커는 부가 기능이라 실패해도 조용히 무시
      }
    };
    fetchCommunity();
  }, []);

  useEffect(() => {
    if (items.length < 2) return undefined;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setVisible(true);
      }, 300);
    }, 4500);
    return () => clearInterval(timer);
  }, [items]);

  if (items.length === 0) return null;

  const item = items[index];
  const daysLabel = item.logged_days === 0 ? '오늘부터' : `${item.logged_days}일째`;

  return (
    <Box
      sx={{
        mt: 3,
        maxWidth: 260,
        width: '100%',
        textAlign: 'left',
        borderRadius: '14px',
        border: '1px solid #e8dcc6',
        background: 'rgba(255,255,255,0.55)',
        padding: '14px 16px 12px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mb: 1 }}>
        <Box sx={{ display: 'flex' }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: '#c9b79c',
                border: '1.5px solid #f8f1e6',
                marginLeft: i === 0 ? 0 : '-4px',
              }}
            />
          ))}
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: '0.66rem', color: '#8c8578' }}>
          다른 사람들의 아침
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: '0.82rem',
          color: '#6b5a4a',
          lineHeight: 1.55,
          mb: 0.5,
        }}
      >
        “{item.phrase}”
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: '0.68rem', color: '#a39a89' }}>
        {item.nickname} · {daysLabel}
      </Typography>
    </Box>
  );
};

export default CommunityTicker;
