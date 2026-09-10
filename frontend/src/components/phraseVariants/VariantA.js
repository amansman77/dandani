import React from 'react';
import { Box, Typography, TextField, Chip, Button } from '@mui/material';
import { getRollingWeekTicks } from '../../utils/phraseStreak';
import { EXAMPLE_PHRASES } from '../../utils/phraseExamples';
import CommunityTicker from '../CommunityTicker';
import Loader from '../Loader';
import { COLOR, FONT } from '../../theme/tokens';
import { Scene, Eyebrow, Phrase, Tick, submitStyle, logButtonStyle } from './phraseVariantStyles';

function ExamplePhrases({ onSelect }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3, position: 'relative' }}>
      {EXAMPLE_PHRASES.map(example => (
        <Chip key={example} label={example} variant="outlined" onClick={() => onSelect(example)}
          sx={{ cursor: 'pointer', fontFamily: FONT.serif, borderColor: COLOR.line.main,
            color: COLOR.text.body, background: 'rgba(255,255,255,0.5)' }} />
      ))}
    </Box>
  );
}

function PhraseEditor({ inputValue, setInputValue, onExampleSelect, submitting, onSubmit, isEditing }) {
  return (
    <Scene>
      <Eyebrow sx={{ mb: 2.5 }}>{isEditing ? '문구 수정' : '오늘부터, 나에게'}</Eyebrow>
      <Phrase sx={{ fontSize: '1.25rem', mb: 3.5, fontWeight: 700, maxWidth: 'none' }}>
        매일 아침 나에게 되새기고 싶은<br />한 문장을 적어보세요.
      </Phrase>
      <ExamplePhrases onSelect={onExampleSelect} />
      <TextField fullWidth multiline minRows={2} value={inputValue}
        onChange={event => setInputValue(event.target.value)} placeholder="예: 행복한 일은 매일 있다고 생각한다"
        sx={{ mb: 3, maxWidth: 420, position: 'relative',
          '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.6)', fontFamily: FONT.serif } }} />
      <Button disableRipple disabled={!inputValue.trim() || submitting} onClick={onSubmit} sx={submitStyle}>
        {submitting ? <Loader small /> : (isEditing ? '이 문장으로 바꿀게요' : '이 문장으로 시작할게요')}
      </Button>
    </Scene>
  );
}

function ActivePhrase({ phrase, logging, onLogToday, onViewHistory, onUseCommunityPhrase, hasActivePhrase }) {
  const ticks = getRollingWeekTicks(phrase.logged_dates, phrase.today);
  const date = phrase.today ? new Date(`${phrase.today}T12:00:00Z`) : new Date();
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', ...(phrase.today ? { timeZone: 'UTC' } : {}) };
  return (
    <Scene>
      <Eyebrow sx={{ mb: 2.5 }}>{date.toLocaleDateString('ko-KR', dateOptions)}, 아침</Eyebrow>
      <Typography variant="body2"
        sx={{ fontFamily: FONT.sans, fontSize: '0.75rem', color: COLOR.text.muted, mb: 2.5, position: 'relative' }}>
        {phrase.visit_days}번째 아침이에요
      </Typography>
      <Phrase sx={{ mb: 3.5 }}>{phrase.phrase}</Phrase>
      <Box sx={{ display: 'flex', gap: 0.75, mb: 4, position: 'relative' }}>
        {ticks.map((filled, index) => <Tick key={index} filled={filled} sx={{ animationDelay: `${index * 220}ms` }} />)}
      </Box>
      <Button disabled={!phrase.logged_today && logging} onClick={phrase.logged_today ? onViewHistory : onLogToday}
        sx={logButtonStyle(phrase.logged_today)}>
        {logging ? <Loader small /> : (phrase.logged_today ? '오늘도 되새겼어요' : '오늘의 문장 되새기기')}
      </Button>
      <CommunityTicker onUseCommunityPhrase={onUseCommunityPhrase} hasActivePhrase={hasActivePhrase} />
    </Scene>
  );
}

export default function VariantA(props) {
  return !props.phrase || props.isEditing ? <PhraseEditor {...props} /> : <ActivePhrase {...props} />;
}
