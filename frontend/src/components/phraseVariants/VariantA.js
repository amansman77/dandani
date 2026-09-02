import React from 'react';
import { Box, Typography, TextField, Chip, Button, IconButton, CircularProgress } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { styled } from '@mui/material/styles';
import { EXAMPLE_PHRASES } from '../../utils/phraseExamples';
import CommunityTicker from '../CommunityTicker';

const SERIF = '"Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important';
const SANS = '-apple-system, "system-ui", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important';

const Scene = styled(Box)(({ theme }) => ({
  position: 'relative',
  minHeight: 'min(62vh, 480px)',
  padding: theme.spacing(6, 4, 5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}));

const Eyebrow = styled(Typography)({
  fontFamily: SERIF,
  fontStyle: 'italic',
  fontSize: '0.85rem',
  color: '#a9764f',
  position: 'relative',
});

const Phrase = styled(Typography)({
  fontFamily: SERIF,
  fontSize: '1.7rem',
  lineHeight: 1.75,
  letterSpacing: '0.01em',
  color: '#322f29',
  whiteSpace: 'pre-wrap',
  maxWidth: 230,
  marginLeft: 'auto',
  marginRight: 'auto',
  position: 'relative',
});

const Tick = styled(Box, { shouldForwardProp: (prop) => prop !== 'filled' })(({ filled }) => ({
  width: 3,
  borderRadius: 2,
  height: filled ? 20 : 16,
  background: filled ? '#c98354' : '#ddceb9',
}));

function getRollingWeekTicks(loggedDates) {
  const set = new Set(loggedDates || []);
  const ticks = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split('T')[0];
    ticks.push(set.has(key));
  }
  return ticks;
}

const VariantA = ({
  phrase, inputValue, setInputValue, onExampleSelect, submitting, onSubmit, logging, onLogToday, onViewHistory,
  onUseCommunityPhrase, hasActivePhrase, isEditing, onEditPhrase, onCancelEdit,
}) => {
  if (!phrase || isEditing) {
    return (
      <Scene>
        {isEditing && (
          // 수정 도중엔 서버에 아직 아무것도 안 바뀐 상태라, 언제든 원래 문구로
          // 조용히 되돌아갈 수 있어야 한다.
          <Typography
            onClick={onCancelEdit}
            sx={{
              position: 'absolute', top: 16, left: 20, fontFamily: SANS, fontSize: '0.8rem',
              color: '#a39a89', cursor: 'pointer',
            }}
          >
            ‹ 취소
          </Typography>
        )}
        <Eyebrow sx={{ mb: 2.5 }}>{isEditing ? '문구 수정' : '오늘부터, 나에게'}</Eyebrow>
        <Phrase sx={{ fontSize: '1.25rem', mb: 3.5, fontWeight: 700, maxWidth: 'none' }}>
          매일 아침 나에게 되새기고 싶은
          <br />한 문장을 적어보세요.
        </Phrase>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3, position: 'relative' }}>
          {EXAMPLE_PHRASES.map((example) => (
            <Chip
              key={example}
              label={example}
              variant="outlined"
              onClick={() => onExampleSelect(example)}
              sx={{
                cursor: 'pointer',
                fontFamily: SERIF,
                borderColor: '#ddceb9',
                color: '#6b6355',
                background: 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="예: 오늘도 흔들리지 않는다"
          sx={{
            mb: 3,
            maxWidth: 420,
            position: 'relative',
            '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.6)', fontFamily: SERIF },
          }}
        />
        <Button
          disableRipple
          disabled={!inputValue.trim() || submitting}
          onClick={onSubmit}
          sx={{
            position: 'relative',
            fontFamily: SERIF,
            fontSize: '0.95rem',
            fontWeight: 400,
            textTransform: 'none',
            color: '#a9603a',
            borderBottom: '1px solid #c98354',
            borderRadius: 0,
            padding: 0,
            minWidth: 'auto',
            minHeight: 'auto',
            lineHeight: 'normal',
            paddingBottom: '3px',
            '&:hover': { background: 'transparent', opacity: 0.75 },
            '&.Mui-disabled': { color: '#c9bfa8', borderColor: '#e2dbc9' },
          }}
        >
          {submitting ? <CircularProgress size={18} /> : (isEditing ? '이 문장으로 바꿀게요' : '이 문장으로 시작할게요')}
        </Button>
      </Scene>
    );
  }

  const ticks = getRollingWeekTicks(phrase.logged_dates);
  const morningNumber = phrase.logged_days + (phrase.logged_today ? 0 : 1);

  return (
    <Scene>
      <IconButton
        onClick={onEditPhrase}
        aria-label="문구 바꾸기"
        size="small"
        sx={{
          position: 'absolute',
          top: 14,
          right: 14,
          zIndex: 2,
          width: 30,
          height: 30,
          color: '#a39a89',
          background: 'rgba(255,255,255,0.45)',
          '&:hover': { background: 'rgba(255,255,255,0.65)' },
        }}
      >
        <EditOutlinedIcon sx={{ fontSize: '1rem' }} />
      </IconButton>
      <Eyebrow sx={{ mb: 2.5 }}>
        {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}, 아침
      </Eyebrow>
      <Typography
        variant="body2"
        sx={{ fontFamily: SANS, fontSize: '0.75rem', color: '#8c8578', mb: 2.5, position: 'relative' }}
      >
        {morningNumber}번째 아침이에요
      </Typography>
      <Phrase sx={{ mb: 3.5 }}>{phrase.phrase}</Phrase>
      <Box sx={{ display: 'flex', gap: 0.75, mb: 4, position: 'relative' }}>
        {ticks.map((filled, i) => (
          <Tick key={i} filled={filled} />
        ))}
      </Box>
      <Button
        disabled={!phrase.logged_today && logging}
        onClick={phrase.logged_today ? onViewHistory : onLogToday}
        sx={{
          position: 'relative',
          fontFamily: SERIF,
          fontSize: '0.92rem',
          fontWeight: 400,
          textTransform: 'none',
          color: phrase.logged_today ? '#8c8578' : '#a9603a',
          border: phrase.logged_today ? '1.4px solid #cabfa9' : '1.4px solid #c98354',
          borderRadius: '999px',
          padding: '9px 24px',
          minWidth: 'auto',
          minHeight: 'auto',
          lineHeight: 'normal',
          '&:hover': { background: 'rgba(201,131,84,0.08)', border: phrase.logged_today ? '1.4px solid #cabfa9' : '1.4px solid #c98354' },
          '&.Mui-disabled': { color: '#8c8578', border: '1.4px solid #cabfa9' },
        }}
      >
        {logging ? <CircularProgress size={18} /> : (phrase.logged_today ? '오늘도 되새겼어요' : '오늘의 문장 되새기기')}
      </Button>
      <CommunityTicker onUseCommunityPhrase={onUseCommunityPhrase} hasActivePhrase={hasActivePhrase} />
    </Scene>
  );
};

export default VariantA;
