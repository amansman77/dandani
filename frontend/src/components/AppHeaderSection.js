import React from 'react';
import { Alert, Box, Tooltip, Typography } from '@mui/material';

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
          <Box
            component="button"
            type="button"
            onClick={onRestartOnboarding}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: '"Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important',
              fontSize: '0.75rem',
              color: '#a9603a',
              borderBottom: '1px solid #c98354',
              paddingBottom: '2px',
              '&:hover': { opacity: 0.75 },
            }}
          >
            안내
          </Box>
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
