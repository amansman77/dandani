import React from 'react';
import { Box, Typography, TextField, Chip, Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { EXAMPLE_PHRASES } from '../../utils/phraseExamples';
import { FONT } from '../../theme/tokens';

const SERIF = FONT.serif;

const Scene = styled(Box)(({ theme }) => ({
  borderRadius: 24,
  minHeight: 'min(62vh, 480px)',
  padding: theme.spacing(6, 4.5, 5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  background: '#f8f5ee',
  color: '#2b2822',
}));

const Eyebrow = styled(Typography)({
  fontSize: '0.65rem',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: '#a39a89',
});

const Rule = styled(Box)({
  width: 28,
  height: 1,
  background: '#c9bfa8',
});

const Phrase = styled(Typography)({
  fontFamily: SERIF,
  fontSize: '1.4rem',
  lineHeight: 1.7,
  color: '#2b2822',
  whiteSpace: 'pre-wrap',
});

const VariantC = ({
  phrase, inputValue, setInputValue, onExampleSelect, submitting, onSubmit, logging, onLogToday, onRetire,
}) => {
  if (!phrase) {
    return (
      <Scene>
        <Eyebrow sx={{ mb: 2.75 }}>오늘부터, 나에게</Eyebrow>
        <Rule sx={{ mb: 3.25 }} />
        <Phrase sx={{ fontSize: '1.15rem', fontWeight: 700, mb: 3.25 }}>
          매일 아침 나에게 되새기고 싶은
          <br />한 문장을 적어보세요.
        </Phrase>
        <Rule sx={{ mb: 4 }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3 }}>
          {EXAMPLE_PHRASES.map((example) => (
            <Chip
              key={example}
              label={example}
              variant="outlined"
              onClick={() => onExampleSelect(example)}
              sx={{ cursor: 'pointer', color: '#6b6355', borderColor: '#d8d2c4' }}
            />
          ))}
        </Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="예: 행복한 일은 매일 있다고 생각한다"
          sx={{ mb: 3, maxWidth: 420 }}
        />
        <Typography
          component="button"
          onClick={onSubmit}
          disabled={!inputValue.trim() || submitting}
          sx={{
            fontSize: '0.8rem',
            letterSpacing: '0.06em',
            color: '#6b6355',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            '&:disabled': { color: '#c9bfa8', cursor: 'default' },
          }}
        >
          {submitting ? <CircularProgress size={16} /> : '이 문장으로 시작할게요'}
        </Typography>
      </Scene>
    );
  }

  return (
    <Scene>
      <Eyebrow sx={{ mb: 2.75 }}>오늘의 문장</Eyebrow>
      <Rule sx={{ mb: 3.25 }} />
      <Phrase sx={{ mb: 3.25 }}>{phrase.phrase}</Phrase>
      <Rule sx={{ mb: 4.5 }} />
      <Typography
        component="button"
        onClick={onLogToday}
        disabled={phrase.logged_today || logging}
        sx={{
          fontSize: '0.78rem',
          letterSpacing: '0.06em',
          color: '#6b6355',
          textDecoration: 'underline',
          textUnderlineOffset: '4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          mb: 2.5,
          '&:disabled': { color: '#c9bfa8', cursor: 'default', textDecoration: 'none' },
        }}
      >
        {logging ? <CircularProgress size={16} /> : (phrase.logged_today ? '되새겼습니다' : '오늘의 문장 되새기기')}
      </Typography>
      <Typography sx={{ fontSize: '0.7rem', letterSpacing: '0.04em', color: '#a39a89' }}>
        {phrase.logged_days}일째
      </Typography>
      <Typography
        variant="caption"
        onClick={onRetire}
        sx={{ mt: 3, color: '#c9bfa8', cursor: 'pointer' }}
      >
        문구 바꾸기
      </Typography>
    </Scene>
  );
};

export default VariantC;
