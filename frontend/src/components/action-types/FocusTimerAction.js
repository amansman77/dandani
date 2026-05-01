import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material'; // Typography used for timer display
import ActionCharacterCard from './ActionCharacterCard';

const FOCUS_SECONDS = 3 * 60; // 3 minutes

const pad = (n) => String(n).padStart(2, '0');

const FocusTimerAction = ({ action, message, onComplete }) => {
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [remaining, setRemaining] = useState(FOCUS_SECONDS);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (phase !== 'running') return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          setPhase('done');
          return 0;
        }
        return r - 1;
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
    setRemaining(FOCUS_SECONDS);
    setPhase('running');
  };

  const handleSkip = () => {
    clearInterval(intervalRef.current);
    setPhase('done');
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <Box>
      <ActionCharacterCard actionType="FOCUS" message={message} />

      {phase === 'idle' && (
        <Button fullWidth variant="contained" size="large" onClick={handleStart}>
          3분 집중 시작
        </Button>
      )}

      {phase === 'running' && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h2" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
            {pad(minutes)}:{pad(seconds)}
          </Typography>
          <Button fullWidth variant="outlined" size="large" onClick={handleSkip}>
            결과 알려줄게
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FocusTimerAction;
