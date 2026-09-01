import React from 'react';
import { Alert, Box, Tooltip } from '@mui/material';

const AppHeaderSection = ({
  isNonKoreanUser,
  onRestartOnboarding
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Tooltip title="온보딩 다시 보기 (Ctrl+Shift+H)">
          <Box
            component="button"
            type="button"
            onClick={onRestartOnboarding}
            sx={{
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: '-apple-system, "system-ui", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important',
              fontSize: '0.72rem',
              color: '#a39a89',
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
