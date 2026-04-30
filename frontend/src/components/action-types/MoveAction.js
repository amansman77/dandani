import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import ActionCharacterCard from './ActionCharacterCard';

const MOVE_SECONDS = 20;

const MoveAction = ({ action, message, onComplete }) => {
  const [phase, setPhase] = useState('idle'); // idle | moving | done
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (phase !== 'moving') return;
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= MOVE_SECONDS) {
          clearInterval(intervalRef.current);
          setPhase('done');
          return MOVE_SECONDS;
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
    setElapsed(0);
    setPhase('moving');
  };

  const handleSkip = () => {
    clearInterval(intervalRef.current);
    setPhase('done');
  };

  const progress = (elapsed / MOVE_SECONDS) * 100;

  return (
    <Box>
      <ActionCharacterCard actionType="MOVE" message={message} />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {action?.description}
      </Typography>

      {phase === 'idle' && (
        <Button fullWidth variant="contained" size="large" onClick={handleStart}>
          같이 걷기
        </Button>
      )}

      {phase === 'moving' && (
        <Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 10, borderRadius: 5, mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            {elapsed}초 / {MOVE_SECONDS}초
          </Typography>
          <Button fullWidth variant="outlined" size="large" onClick={handleSkip}>
            결과 알려줄게
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default MoveAction;
