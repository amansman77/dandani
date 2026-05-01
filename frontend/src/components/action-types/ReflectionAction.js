import React, { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import ActionCharacterCard from './ActionCharacterCard';

const ReflectionAction = ({ message, onComplete }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    onComplete();
  };

  return (
    <Box>
      <ActionCharacterCard actionType="REFLECT" message={message} />

      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        placeholder="떠오르는 대로 써줘..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Button fullWidth variant="contained" size="large" onClick={handleSubmit}>
        저장하기
      </Button>
    </Box>
  );
};

export default ReflectionAction;
