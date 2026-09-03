import React from 'react';
import { Box, Typography, TextField, Chip, Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { EXAMPLE_PHRASES } from '../../utils/phraseExamples';

const SERIF = '"Pretendard", "Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important';

const Scene = styled(Box)(({ theme }) => ({
  borderRadius: 24,
  minHeight: 'min(62vh, 480px)',
  padding: theme.spacing(6, 4, 5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  background: 'linear-gradient(160deg, #2a231d 0%, #211b16 100%)',
  color: '#e9dfd0',
}));

const Eyebrow = styled(Typography)({
  fontSize: '0.7rem',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: '#7d7263',
});

const Phrase = styled(Typography)({
  fontFamily: SERIF,
  fontWeight: 700,
  fontSize: '1.85rem',
  lineHeight: 1.55,
  color: '#f1e8d8',
  whiteSpace: 'pre-wrap',
  textShadow: '0 1px 0 rgba(255,255,255,0.08), 0 -1px 1px rgba(0,0,0,0.6)',
});

const VariantB = ({
  phrase, inputValue, setInputValue, onExampleSelect, submitting, onSubmit, logging, onLogToday, onRetire,
}) => {
  if (!phrase) {
    return (
      <Scene>
        <Eyebrow sx={{ mb: 3.5 }}>오늘부터, 나에게</Eyebrow>
        <Phrase sx={{ fontSize: '1.35rem', mb: 4 }}>
          매일 아침 나에게 되새기고 싶은
          <br />한 문장을 적어보세요.
        </Phrase>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3 }}>
          {EXAMPLE_PHRASES.map((example) => (
            <Chip
              key={example}
              label={example}
              variant="outlined"
              onClick={() => onExampleSelect(example)}
              sx={{
                cursor: 'pointer',
                color: '#c7b596',
                borderColor: '#4a4136',
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
          placeholder="예: 매일 행복하진 않지만, 행복한 일은 매일 있다고 생각하기로"
          sx={{
            mb: 3,
            maxWidth: 420,
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255,255,255,0.04)',
              color: '#e9dfd0',
              '& fieldset': { borderColor: '#4a4136' },
              '&:hover fieldset': { borderColor: '#7d7263' },
            },
            '& .MuiInputBase-input::placeholder': { color: '#7d7263', opacity: 1 },
          }}
        />
        <Button
          disabled={!inputValue.trim() || submitting}
          onClick={onSubmit}
          sx={{
            fontSize: '0.85rem',
            letterSpacing: '0.08em',
            color: '#211b16',
            background: '#c7b596',
            px: 4.5,
            py: 1.5,
            borderRadius: '3px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.15)',
            '&:hover': { background: '#d9c8a8' },
            '&.Mui-disabled': { background: '#3a352c', color: '#6b6355' },
          }}
        >
          {submitting ? <CircularProgress size={18} /> : '이 문장으로 시작할게요'}
        </Button>
      </Scene>
    );
  }

  return (
    <Scene>
      <Eyebrow sx={{ mb: 3.5 }}>오늘의 다짐</Eyebrow>
      <Phrase sx={{ mb: 5 }}>{phrase.phrase}</Phrase>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, mb: 4.5 }}>
        <Typography sx={{ fontFamily: SERIF, fontVariantNumeric: 'tabular-nums', fontSize: '2.1rem', color: '#9fb8c9', lineHeight: 1 }}>
          {String(phrase.logged_days).padStart(2, '0')}
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: '#7d7263' }}>
          일째 새기는 중
        </Typography>
      </Box>
      <Button
        disabled={phrase.logged_today || logging}
        onClick={onLogToday}
        sx={{
          fontSize: '0.85rem',
          letterSpacing: '0.08em',
          color: '#211b16',
          background: '#c7b596',
          px: 4.5,
          py: 1.5,
          borderRadius: '3px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.15)',
          '&:hover': { background: '#d9c8a8' },
          '&.Mui-disabled': { background: '#3a352c', color: '#6b6355' },
        }}
      >
        {logging ? <CircularProgress size={18} /> : (phrase.logged_today ? '오늘도 새겼습니다' : '새겼습니다')}
      </Button>
      <Typography
        variant="caption"
        onClick={onRetire}
        sx={{ mt: 3.5, color: '#7d7263', cursor: 'pointer' }}
      >
        문구 바꾸기
      </Typography>
    </Scene>
  );
};

export default VariantB;
