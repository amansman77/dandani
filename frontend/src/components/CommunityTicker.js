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
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <Typography
        sx={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: '0.85rem',
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
