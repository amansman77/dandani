import React from 'react';
import { Alert, Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';

const AppHeaderSection = ({
  isNonKoreanUser,
  onRestartOnboarding
}) => {
  return (
    <>
      <Box sx={{ position: 'relative', textAlign: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" component="h1" sx={{ fontWeight: 'bold' }}>
          단단이
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
