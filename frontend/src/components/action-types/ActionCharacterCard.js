import React from 'react';
import { Box, Typography } from '@mui/material';

const CHARACTER_IMAGE_MAP = {
  START: 'character-coding.png',
  CALM: 'character-breathing.png',
  FOCUS: 'character-coding.png',
  MOVE: 'character-hiking.png',
  RELEASE: 'character-writing.png',
  REFLECT: 'character-camping.png',
};

const BASE_PATH = '/assets/images/dandani-character/';

const ActionCharacterCard = ({ actionType, message }) => {
  const filename = CHARACTER_IMAGE_MAP[actionType] || 'character-default.png';
  const imageSrc = BASE_PATH + filename;

  return (
    <Box sx={{ position: 'relative', width: '100%', mb: 3 }}>
      <Box
        component="img"
        src={imageSrc}
        alt="단단이"
        sx={{
          width: '100%',
          height: '55vh',
          maxHeight: 420,
          objectFit: 'cover',
          borderRadius: 3,
          display: 'block',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
          borderRadius: '0 0 12px 12px',
          px: 3,
          py: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: 'white', textAlign: 'center', fontWeight: 500, lineHeight: 1.4 }}
        >
          {message}
        </Typography>
      </Box>
    </Box>
  );
};

export default ActionCharacterCard;
