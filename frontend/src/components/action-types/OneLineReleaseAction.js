import React, { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import ActionCharacterCard from './ActionCharacterCard';

const OneLineReleaseAction = ({ message, onComplete }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onComplete();
  };

  return (
    <Box>
      <ActionCharacterCard actionType="RELEASE" message={message} />

      <TextField
        fullWidth
        multiline
        maxRows={2}
        placeholder="지금 머릿속에 있는 말 한 줄..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={!text.trim()}
        onClick={handleSubmit}
      >
        남기기
      </Button>
    </Box>
  );
};

export default OneLineReleaseAction;
