import React from 'react';
import { Alert, Box, Tooltip } from '@mui/material';

const linkButtonSx = {
  border: 'none',
  background: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: '"Pretendard", -apple-system, "system-ui", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important',
  fontSize: '0.72rem',
  color: '#a39a89',
  '&:hover': { opacity: 0.75 },
};

// 안내와 톤이 같으면 눈에 안 띄어서, 앱 전반의 액션 색(#a9603a — 되새기기
// 버튼·"모두 보기" 등과 동일)과 굵기로 "이건 액션이다"를 분명히 함.
const actionButtonSx = { ...linkButtonSx, color: '#a9603a', fontWeight: 600 };

const AppHeaderSection = ({
  isNonKoreanUser,
  onRestartOnboarding,
  showEditPhrase,
  onEditPhrase,
  isEditing,
  onCancelEdit,
}) => {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        {isEditing ? (
          // 편집 중엔 왼쪽 자리를 "안내" 대신 "취소"가 차지한다 — 온보딩을 다시 볼
          // 상황이 아니니, 지금 하는 일(편집)을 그만두는 액션이 그 자리를 대신함.
          <Box component="button" type="button" onClick={onCancelEdit} sx={actionButtonSx}>
            취소
          </Box>
        ) : (
          <Tooltip title="온보딩 다시 보기 (Ctrl+Shift+H)">
            <Box component="button" type="button" onClick={onRestartOnboarding} sx={linkButtonSx}>
              안내
            </Box>
          </Tooltip>
        )}

        {showEditPhrase && (
          <Box component="button" type="button" onClick={onEditPhrase} sx={actionButtonSx}>
            편집
          </Box>
        )}
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
