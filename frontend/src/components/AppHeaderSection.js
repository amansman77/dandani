import React from 'react';
import { Alert, Box, Tooltip } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';

// 글자 크기가 작아서 글자 크기 그대로면 누를 자리가 20×14px밖에 안 됐다(측정값).
// 손가락으로 누르는 자리는 44px는 돼야 해서 padding으로 넓히고, 같은 크기의
// 음수 margin으로 되돌려 보이는 위치·헤더 높이는 그대로 두었다.
// 글자는 하나도 안 커지고 누를 자리만 40×44px가 된다.
const HIT_X = 10;
const HIT_Y = 15;

const makeLinkSx = (ink) => ({
  border: 'none',
  background: 'none',
  padding: `${HIT_Y}px ${HIT_X}px`,
  margin: `-${HIT_Y}px -${HIT_X}px`,
  cursor: 'pointer',
  fontFamily: FONT.sans,
  fontSize: '0.72rem',
  lineHeight: 1.2,
  color: ink.faint,
  WebkitTapHighlightColor: 'transparent',
  '&:hover': { opacity: 0.75 },
});

// 안내와 톤이 같으면 눈에 안 띄어서, 앱 전반의 액션 색과 굵기로 "이건 액션이다"를
// 분명히 함. 어두운 배경에서는 같은 역할의 밝은 색으로 뒤집힌다.
const makeActionSx = (ink) => ({ ...makeLinkSx(ink), color: ink.accent, fontWeight: 600 });

const AppHeaderSection = ({
  isNonKoreanUser,
  onRestartOnboarding,
  showEditPhrase,
  onEditPhrase,
  showShare,
  onShare,
  isEditing,
  onCancelEdit,
  ink,
}) => {
  const linkButtonSx = makeLinkSx(ink);
  const actionButtonSx = makeActionSx(ink);
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

        {/* 오른쪽은 "내 문장에 할 수 있는 일" 묶음. 둘 다 같은 액션 색이라 한
            덩어리로 읽히고, 왼쪽의 옅은 안내와 2단 위계가 그대로 유지된다. */}
        {/* 간격 24px — 누를 자리를 좌우로 10px씩 넓혔더니 예전 간격(14px)에선
            두 버튼의 영역이 서로 겹쳤다. 겹치면 어느 쪽이 눌렸는지 모호해진다.
            같은 색 글자 둘이 붙어 보이던 것도 이 간격에서 나아진다. */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {showShare && (
            <Box component="button" type="button" onClick={onShare} sx={actionButtonSx}>
              공유
            </Box>
          )}
          {showEditPhrase && (
            <Box component="button" type="button" onClick={onEditPhrase} sx={actionButtonSx}>
              편집
            </Box>
          )}
        </Box>
      </Box>

      {isNonKoreanUser && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            backgroundColor: COLOR.surface.alert,
            color: COLOR.accent.main,
            '& .MuiAlert-icon': { color: COLOR.accent.line },
          }}
        >
          이 서비스는 한국어로 제공됩니다.
        </Alert>
      )}
    </>
  );
};

export default AppHeaderSection;
