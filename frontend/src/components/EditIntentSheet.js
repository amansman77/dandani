import React from 'react';
import { Box, Typography, Drawer } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';

// 문장을 고쳐 쓰고 저장할 때, 되새김 기록이 걸려 있으면 한 번 묻는다.
//
// 예전엔 묻지 않고 늘 새 문장으로 시작했다. 다른 말을 살기로 했다면 그게
// 맞지만, 띄어쓰기 하나를 고치는 것도 같은 길로 가서 31일치 되새김이
// 말없이 0이 됐다. 둘 중 무엇인지는 사람만 안다 — 글자가 얼마나 바뀌었는지로
// 짐작하면 어느 쪽으로 틀리든 조용히 틀린다.
//
// 잃을 게 없을 때(한 번도 안 되새긴 문장)는 이 시트가 뜨지 않는다.
// 아무 때나 물으면 그냥 한 단계가 늘어난 것뿐이다.

const optionSx = (primary) => ({
  width: '100%',
  textAlign: 'left',
  border: `1.4px solid ${primary ? COLOR.accent.line : COLOR.line.main}`,
  background: primary ? 'rgba(201,131,84,0.07)' : 'none',
  borderRadius: '14px',
  padding: '15px 17px',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  '&:hover': { background: primary ? 'rgba(201,131,84,0.12)' : 'rgba(0,0,0,0.02)' },
});

const Option = ({ primary, title, detail, onClick }) => (
  <Box component="button" type="button" onClick={onClick} sx={optionSx(primary)}>
    <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.92rem', fontWeight: 700,
      color: primary ? COLOR.accent.main : COLOR.text.strong }}>
      {title}
    </Typography>
    <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.78rem', color: COLOR.text.body, mt: 0.5 }}>
      {detail}
    </Typography>
  </Box>
);

const EditIntentSheet = ({ open, onClose, phrase, nextText, onResolve, submitting }) => (
  <Drawer anchor="bottom" open={open} onClose={onClose}
    PaperProps={{ sx: {
      background: COLOR.surface.sheet, borderRadius: '18px 18px 0 0', px: 3, pt: 2, pb: 4,
    } }}>
    <Box sx={{ width: 38, height: 4, borderRadius: 2, background: COLOR.line.main, mx: 'auto', mb: 2.5 }} />

    {/* 무엇이 무엇으로 바뀌는지 먼저 보여준다 — 고르기 전에 확인할 수 있어야 한다. */}
    {phrase && (
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontFamily: FONT.serif, fontSize: '0.86rem', fontStyle: 'italic',
          color: COLOR.text.muted, textDecoration: 'line-through' }}>
          “{phrase.phrase}”
        </Typography>
        <Typography sx={{ fontFamily: FONT.serif, fontSize: '0.95rem', fontWeight: 700,
          color: COLOR.text.primary, mt: 0.75 }}>
          “{nextText}”
        </Typography>
      </Box>
    )}

    <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.8rem', color: COLOR.text.body, mb: 2 }}>
      이 문장으로 <b>{phrase?.logged_days}번</b> 되새겼어요. 기록을 어떻게 할까요?
    </Typography>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, opacity: submitting ? 0.5 : 1 }}>
      <Option primary title="고쳐 쓰기"
        detail={`되새김 ${phrase?.logged_days}번이 그대로 이어져요`}
        onClick={() => !submitting && onResolve('rewrite')} />
      <Option title="새 문장으로 시작"
        detail="되새김 기록이 처음부터 다시 시작돼요"
        onClick={() => !submitting && onResolve('replace')} />
    </Box>

    {/* 이미 발행한 엽서는 어느 쪽을 골라도 안 사라진다. 그 말이 없으면
        "기록이 처음부터"가 엽서까지 지운다는 뜻으로 읽힌다. */}
    <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.72rem', color: COLOR.text.faint, mt: 2 }}>
      누브와 이미 발행한 엽서는 어느 쪽을 골라도 그대로예요.
    </Typography>
  </Drawer>
);

export default EditIntentSheet;
