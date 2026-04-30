import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ActionCharacterCard from './ActionCharacterCard';

const TOTAL_ROUNDS = 3;
const INHALE_SECONDS = 4;
const EXHALE_SECONDS = 4;

const BreathingAction = ({ message, onComplete }) => {
  const [phase, setPhase] = useState('idle'); // idle | inhale | exhale | done
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(INHALE_SECONDS);
  const stateRef = useRef({ phase: 'idle', round: 1 });
  const intervalRef = useRef(null);

  const startBreathing = () => {
    stateRef.current = { phase: 'inhale', round: 1 };
    setPhase('inhale');
    setRound(1);
    setTimeLeft(INHALE_SECONDS);
  };

  useEffect(() => {
    if (phase === 'idle' || phase === 'done') return;

    const duration = phase === 'inhale' ? INHALE_SECONDS : EXHALE_SECONDS;
    setTimeLeft(duration);

    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          // Transition
          const currentPhase = stateRef.current.phase;
          const currentRound = stateRef.current.round;

          if (currentPhase === 'inhale') {
            stateRef.current.phase = 'exhale';
            setPhase('exhale');
          } else {
            // exhale done
            if (currentRound >= TOTAL_ROUNDS) {
              stateRef.current.phase = 'done';
              setPhase('done');
            } else {
              stateRef.current.round = currentRound + 1;
              stateRef.current.phase = 'inhale';
              setRound(currentRound + 1);
              setPhase('inhale');
            }
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') {
      onComplete();
    }
  }, [phase, onComplete]);

  const circleSize = phase === 'inhale' ? 160 : 80;
  const circleLabel = phase === 'inhale' ? '들이마셔...' : phase === 'exhale' ? '내쉬어...' : '';

  return (
    <Box>
      <ActionCharacterCard actionType="CALM" message={message} />

      {phase === 'idle' && (
        <Button fullWidth variant="contained" size="large" onClick={startBreathing}>
          같이 숨 쉬기
        </Button>
      )}

      {(phase === 'inhale' || phase === 'exhale') && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {round}/{TOTAL_ROUNDS}
          </Typography>
          <Box
            sx={{
              width: circleSize,
              height: circleSize,
              borderRadius: '50%',
              backgroundColor: 'primary.light',
              opacity: 0.7,
              transition: `all ${phase === 'inhale' ? INHALE_SECONDS : EXHALE_SECONDS}s ease-in-out`,
            }}
          />
          <Typography variant="h6" color="primary.main">
            {circleLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {timeLeft}초
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BreathingAction;
