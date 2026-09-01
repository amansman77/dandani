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
        <Typography
          variant="subtitle1"
          component="h1"
          sx={{
            fontWeight: 700,
            fontFamily: '"Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important',
            color: '#322f29',
            letterSpacing: '0.02em',
          }}
        >
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
              color: '#a9603a',
              '&:hover': {
                backgroundColor: 'rgba(169, 96, 58, 0.08)'
              }
            }}
          >
            <HelpIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {isNonKoreanUser && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            backgroundColor: '#f7e9de',
            color: '#a9603a',
            '& .MuiAlert-icon': { color: '#c98354' },
          }}
        >
          이 서비스는 한국어로 제공됩니다.
        </Alert>
      )}
    </>
  );
};

export default AppHeaderSection;
