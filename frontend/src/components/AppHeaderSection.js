import React from 'react';
import { Alert, Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';

const AppHeaderSection = ({
  isNonKoreanUser,
  onRestartOnboarding
}) => {
  return (
    <>
      <Box sx={{ position: 'relative', textAlign: 'center', mb: 2 }}>
        <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 'bold' }}>
          단단이
        </Typography>
        <Typography
          variant="body2"
          color="text.primary"
          sx={{
            fontWeight: 500,
            opacity: 0.75,
            mt: 0.25
          }}
        >
          감정적으로 힘들 때 중심을 잃지 않게 해주는 동반자
        </Typography>

        <Tooltip title="온보딩 다시 보기 (Ctrl+Shift+H)">
          <IconButton
            onClick={onRestartOnboarding}
            size="small"
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.50'
              }
            }}
          >
            <HelpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {isNonKoreanUser && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          이 서비스는 한국어로 제공됩니다.
        </Alert>
      )}
    </>
  );
};

export default AppHeaderSection;
