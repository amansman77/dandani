import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { getUserId } from '../utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const SERIF = '"Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important';
const SANS = '-apple-system, "system-ui", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important';

// 카드 프레임은 고정해두고, 안쪽 문구만 위로 밀려 나가고 아래에서 새 문구가 밀려
// 들어오는 것처럼 보이게 한다 — 그냥 사라졌다 나타나는 게 아니라 "롤업"으로 읽히도록.
const ROLL_MS = 320;
const DWELL_MS = 4500; // 다음 문구로 넘어가기 전 한 문구를 보여주는 시간

const CommunityTicker = () => {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | leaving | entering

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
      setPhase('leaving');
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setPhase('entering');
        // entering은 transition 없이 순간 이동시킨 뒤, 다음 프레임에 idle로 되돌려
        // "아래에서 위로 굴러 들어오는" 애니메이션을 태운다.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setPhase('idle'));
        });
      }, ROLL_MS);
    }, DWELL_MS);
    return () => clearInterval(timer);
  }, [items]);

  if (items.length === 0) return null;

  const item = items[index];
  const daysLabel = item.logged_days === 0 ? '오늘부터' : `${item.logged_days}일째`;
  const offsetY = phase === 'leaving' ? -10 : phase === 'entering' ? 10 : 0;

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
                // 롤업 대상이 1명뿐이라 문구가 안 바뀌는 순간에도, 이 점만은 계속 살아있다는
                // 신호를 줘야 해서 items.length 조건 없이 항상 돈다.
                animation: `ticker-pulse 1.6s ease-in-out ${i * 0.2}s infinite`,
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                '@keyframes ticker-pulse': {
                  '0%, 100%': { opacity: 0.55, transform: 'scale(0.85)' },
                  '50%': { opacity: 1, transform: 'scale(1)' },
                },
              }}
            />
          ))}
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: '0.66rem', color: '#8c8578' }}>
          다른 사람들의 아침
        </Typography>
      </Box>
      <Box sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            transform: `translateY(${offsetY}px)`,
            opacity: phase === 'idle' ? 1 : 0,
            transition: phase === 'entering' ? 'none' : `transform ${ROLL_MS}ms ease, opacity ${ROLL_MS}ms ease`,
            '@media (prefers-reduced-motion: reduce)': { transform: 'none', transition: 'opacity 0.3s ease' },
          }}
        >
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
      </Box>
      {items.length > 1 && (
        // 곧 다음 문구로 바뀐다는 걸 채워지는 진행바로 미리 알려준다 — 카드가
        // 그냥 멈춰있는 게 아니라 "다음 것을 기다리는 중"임을 계속 인식할 수 있게.
        <Box sx={{ mt: 1.25, height: 2, borderRadius: 1, background: '#ecdfc7', overflow: 'hidden' }}>
          <Box
            key={index}
            sx={{
              height: '100%',
              background: '#c98354',
              width: '0%',
              animation: `ticker-progress ${DWELL_MS}ms linear forwards`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none', width: '55%' },
              '@keyframes ticker-progress': { from: { width: '0%' }, to: { width: '100%' } },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default CommunityTicker;
