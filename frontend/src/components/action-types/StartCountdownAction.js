import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import ActionCharacterCard from './ActionCharacterCard';

const TIMER_SECONDS = 10;

const StartCountdownAction = ({ action, message, onComplete }) => {
  const [phase, setPhase] = useState('idle'); // idle | countdown | timer | done
  const [countdown, setCountdown] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  // Countdown phase: 3 → 2 → 1
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('timer');
      setElapsed(0);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Timer phase: 0 → TIMER_SECONDS
  useEffect(() => {
    if (phase !== 'timer') return;
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= TIMER_SECONDS) {
          clearInterval(intervalRef.current);
          setPhase('done');
          return TIMER_SECONDS;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') {
      onComplete();
    }
  }, [phase, onComplete]);

  const handleStart = () => {
    setCountdown(3);
    setPhase('countdown');
  };

  const handleComplete = () => {
    clearInterval(intervalRef.current);
    setPhase('done');
  };

  const progress = (elapsed / TIMER_SECONDS) * 100;

  return (
    <Box>
      <ActionCharacterCard actionType="START" message={message} />

      {phase === 'idle' && (
        <Button fullWidth variant="contained" size="large" onClick={handleStart}>
          시작하기
        </Button>
      )}

      {phase === 'countdown' && (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="h1" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {countdown > 0 ? countdown : '시작!'}
          </Typography>
        </Box>
      )}

      {phase === 'timer' && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 10, borderRadius: 5, mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            {elapsed}초 / {TIMER_SECONDS}초
          </Typography>
          <Button fullWidth variant="outlined" size="large" onClick={handleComplete}>
            완료
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default StartCountdownAction;
