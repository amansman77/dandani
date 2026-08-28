import React from 'react';
import { Box, Typography, TextField, Chip, Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { EXAMPLE_PHRASES } from '../../utils/phraseExamples';

const SERIF = '"Nanum Myeongjo", Georgia, "Noto Serif KR", serif';

const Scene = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 24,
  minHeight: 'min(62vh, 480px)',
  padding: theme.spacing(6, 4, 5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  background: 'linear-gradient(180deg, #eef2f4 0%, #f3ece2 55%, #f8f1e6 100%)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-30%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,225,190,0.55) 0%, rgba(255,225,190,0) 70%)',
    pointerEvents: 'none',
  },
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
  color: '#322f29',
  whiteSpace: 'pre-wrap',
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
  phrase, inputValue, setInputValue, submitting, onSubmit, logging, onLogToday, onRetire,
}) => {
  if (!phrase) {
    return (
      <Scene>
        <Eyebrow sx={{ mb: 2.5 }}>오늘부터, 나에게</Eyebrow>
        <Phrase sx={{ fontSize: '1.25rem', mb: 3.5, fontWeight: 700 }}>
          매일 아침 나에게 되새기고 싶은
          <br />한 문장을 적어보세요.
        </Phrase>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3, position: 'relative' }}>
          {EXAMPLE_PHRASES.map((example) => (
            <Chip
              key={example}
              label={example}
              variant="outlined"
              onClick={() => setInputValue(example)}
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
          disabled={!inputValue.trim() || submitting}
          onClick={onSubmit}
          sx={{
            position: 'relative',
            fontFamily: SERIF,
            fontSize: '0.95rem',
            color: '#a9603a',
            borderBottom: '1px solid #c98354',
            borderRadius: 0,
            pb: 0.3,
            '&:hover': { background: 'transparent', opacity: 0.75 },
            '&.Mui-disabled': { color: '#c9bfa8', borderColor: '#e2dbc9' },
          }}
        >
          {submitting ? <CircularProgress size={18} /> : '이 문장으로 시작할게요'}
        </Button>
      </Scene>
    );
  }

  const ticks = getRollingWeekTicks(phrase.logged_dates);

  return (
    <Scene>
      <Eyebrow sx={{ mb: 2.5 }}>
        {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}, 아침
      </Eyebrow>
      <Typography variant="body2" sx={{ color: '#8c8578', mb: 2.5, position: 'relative' }}>
        {phrase.logged_days === 0 ? '첫 아침이에요' : `${phrase.logged_days}일째 이어가는 중이에요`}
      </Typography>
      <Phrase sx={{ mb: 3.5 }}>{phrase.phrase}</Phrase>
      <Box sx={{ display: 'flex', gap: 0.75, mb: 4, position: 'relative' }}>
        {ticks.map((filled, i) => (
          <Tick key={i} filled={filled} />
        ))}
      </Box>
      <Button
        disabled={phrase.logged_today || logging}
        onClick={onLogToday}
        sx={{
          position: 'relative',
          fontFamily: SERIF,
          fontSize: '0.95rem',
          color: phrase.logged_today ? '#b6ac9a' : '#a9603a',
          borderBottom: phrase.logged_today ? 'none' : '1px solid #c98354',
          borderRadius: 0,
          pb: 0.3,
          '&:hover': { background: 'transparent', opacity: 0.75 },
        }}
      >
        {logging ? <CircularProgress size={18} /> : (phrase.logged_today ? '오늘도 되새겼어요' : '오늘의 문장 되새기기')}
      </Button>
      <Typography
        variant="caption"
        onClick={onRetire}
        sx={{ mt: 3, color: '#a39a89', cursor: 'pointer', position: 'relative' }}
      >
        문구 바꾸기
      </Typography>
    </Scene>
  );
};

export default VariantA;
