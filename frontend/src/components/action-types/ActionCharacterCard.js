import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

const CHARACTER_IMAGE_MAP = {
  START: 'character-coding.png',
  CALM: 'character-reading.png',
  FOCUS: 'character-coding.png',
  MOVE: 'character-hiking.png',
  RELEASE: 'character-writing.png',
  REFLECT: 'character-camping.png',
};

const BASE_PATH = '/assets/images/dandani-character/';

const ActionCharacterCard = ({ actionType, message }) => {
  const filename = CHARACTER_IMAGE_MAP[actionType] || '단단이.png';
  const imageSrc = BASE_PATH + filename;

  return (
    <Paper
      elevation={2}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        mb: 2,
        borderRadius: 3,
        backgroundColor: 'background.paper',
      }}
    >
      <Box
        component="img"
        src={imageSrc}
        alt="단단이"
        sx={{
          width: 120,
          height: 120,
          objectFit: 'contain',
          flexShrink: 0,
          borderRadius: 2,
        }}
      />
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
        {message}
      </Typography>
    </Paper>
  );
};

export default ActionCharacterCard;
