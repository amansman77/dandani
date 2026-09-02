import React from 'react';
import { Box, Typography, TextField, Chip, Button, CircularProgress } from '@mui/material';
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

function dateKeyDaysAgo(offsetDays) {
  return new Date(Date.now() - offsetDays * 86400000).toISOString().split('T')[0];
}

// 스트릭(연속 일수) 표시. 이전엔 지난 7일 중 그날 기록이 있는지를 하루씩 따로
// 봤는데, 그러면 중간에 하루 빠졌다가 다시 시작한 경우에도 예전 기록이 그대로
// 켜져 있어서 "지금 며칠째 이어지는 중"인지가 안 보였다. 이제는 오늘(또는
// 아직 오늘 기록 전이면 어제까지, 듀오링고식 유예)부터 거꾸로 걸으며 끊기지
// 않는 구간만 스트릭으로 보고, 그 구간에 든 날짜만 채운다 — 끊기기 전의 옛날
// 기록은 화면(7칸)에 남아있어도 더 이상 채워 보이지 않는다.
function getRollingWeekTicks(loggedDates) {
  const set = new Set(loggedDates || []);

  const streakDates = new Set();
  let anchor = null;
  if (set.has(dateKeyDaysAgo(0))) anchor = 0;
  else if (set.has(dateKeyDaysAgo(1))) anchor = 1; // 오늘 기록 전이어도 어제까지 이어졌으면 유예

  if (anchor !== null) {
    let offset = anchor;
    while (set.has(dateKeyDaysAgo(offset))) {
      streakDates.add(dateKeyDaysAgo(offset));
      offset += 1;
    }
  }

  const ticks = [];
  for (let i = 6; i >= 0; i -= 1) {
    ticks.push(streakDates.has(dateKeyDaysAgo(i)));
  }
  return ticks;
}

const VariantA = ({
  phrase, inputValue, setInputValue, onExampleSelect, submitting, onSubmit, logging, onLogToday, onViewHistory,
  onUseCommunityPhrase, hasActivePhrase, isEditing,
}) => {
  if (!phrase || isEditing) {
    // 취소는 이제 헤더의 "안내" 자리(같은 왼쪽 위)를 대신하는 걸로 옮겨가서,
    // 여기서 또 하나 띄우면 취소가 두 번 보이게 된다 — 그래서 안 넣는다.
    return (
      <Scene>
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
  // 되새기기 완료 횟수(logged_days) 대신 방문한 날 수 — 서버가 오늘 몫까지 계산해서 내려준다.
  const morningNumber = phrase.visit_days;

  return (
    <Scene>
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
