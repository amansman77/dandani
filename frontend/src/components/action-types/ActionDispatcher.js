import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import StartCountdownAction from './StartCountdownAction';
import BreathingAction from './BreathingAction';
import FocusTimerAction from './FocusTimerAction';
import MoveAction from './MoveAction';
import OneLineReleaseAction from './OneLineReleaseAction';
import ReflectionAction from './ReflectionAction';

/**
 * Dispatches to the correct action component based on actionType.
 * Falls back to a generic flow if the type is unknown.
 */
const ActionDispatcher = ({ actionType, action, message, onComplete }) => {
  switch (actionType) {
    case 'START':
      return (
        <StartCountdownAction
          action={action}
          message={message}
          onComplete={onComplete}
        />
      );
    case 'CALM':
      return (
        <BreathingAction
          message={message}
          onComplete={onComplete}
        />
      );
    case 'FOCUS':
      return (
        <FocusTimerAction
          action={action}
          message={message}
          onComplete={onComplete}
        />
      );
    case 'MOVE':
      return (
        <MoveAction
          action={action}
          message={message}
          onComplete={onComplete}
        />
      );
    case 'RELEASE':
      return (
        <OneLineReleaseAction
          message={message}
          onComplete={onComplete}
        />
      );
    case 'REFLECT':
      return (
        <ReflectionAction
          message={message}
          onComplete={onComplete}
        />
      );
    default:
      return (
        <GenericAction
          action={action}
          message={message}
          onComplete={onComplete}
        />
      );
  }
};

const GenericAction = ({ action, message, onComplete }) => (
  <Box>
    <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
      {message}
    </Typography>
    {action?.description && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {action.description}
      </Typography>
    )}
    <Button fullWidth variant="contained" size="large" onClick={onComplete}>
      결과 알려줄게
    </Button>
  </Box>
);

export default ActionDispatcher;
