import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, Chip, Button } from '@mui/material';
import { getRollingWeekTicks } from '../../utils/phraseStreak';
import { EXAMPLE_PHRASES } from '../../utils/phraseExamples';
import CommunityTicker from '../CommunityTicker';
import FloatingActions from '../FloatingActions';
import Loader from '../Loader';
import { COLOR, FONT } from '../../theme/tokens';
import { Scene, Eyebrow, Phrase, Tick, submitStyle } from './phraseVariantStyles';

const MILESTONE_LABELS = {
  7: '일곱', 14: '열네', 21: '스물한', 28: '스물여덟', 35: '서른다섯',
  42: '마흔두', 49: '마흔아홉', 56: '쉰여섯', 63: '예순세', 70: '일흔',
};

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

function PhraseEditor({
  inputValue, setInputValue, onExampleSelect, submitting, onSubmit,
  isEditing, cameFromPicker, onBackToPicker,
}) {
  return (
    <Scene>
      <Eyebrow sx={{ mb: 2.5 }}>
        {isEditing ? '문장 수정' : (cameFromPicker ? '고른 문장' : '오늘부터, 나에게')}
      </Eyebrow>
      <Phrase sx={{ fontSize: '1.25rem', mb: 3.5, fontWeight: 700, maxWidth: 'none' }}>
        {cameFromPicker ? <>{isEditing ? '이 문장으로 바꿀까요?' : '이 문장으로 시작할까요?'}<br />고쳐 써도 괜찮아요.</>
          : <>매일 아침 나에게 되새기고 싶은<br />한 문장을 적어보세요.</>}
      </Phrase>
      {!cameFromPicker && <ExamplePhrases onSelect={onExampleSelect} />}
      <TextField fullWidth multiline minRows={2} autoFocus={Boolean(cameFromPicker) && !isEditing}
        value={inputValue} onChange={event => setInputValue(event.target.value)}
        placeholder="예: 행복한 일은 매일 있다고 생각한다"
        sx={{ mb: 3, maxWidth: 420, position: 'relative',
          '& .MuiOutlinedInput-root': { background: 'rgba(255,255,255,0.6)', fontFamily: FONT.serif } }} />
      <Button disableRipple disabled={!inputValue.trim() || submitting} onClick={onSubmit} sx={submitStyle}>
        {submitting ? <Loader small /> : (isEditing ? '이 문장으로 바꿀게요' : '이 문장으로 시작할게요')}
      </Button>
      {onBackToPicker && (
        <Box component="button" type="button" onClick={onBackToPicker}
          sx={{ mt: 2, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FONT.sans,
            fontSize: '0.76rem', color: COLOR.text.faint, WebkitTapHighlightColor: 'transparent',
            '&:hover': { opacity: 0.75 } }}>
          {cameFromPicker ? '다시 고를래요' : '다른 문장에서 고를래요'}
        </Box>
      )}
    </Scene>
  );
}

function milestoneFor(phrase, streak) {
  if (!phrase.logged_today) return null;
  if (streak > 0 && streak % 7 === 0) {
    const weeks = streak / 7;
    return { key: 'streak_' + streak, text: weeks === 1 ? '일주일을 이어갔어요' : weeks + '주를 이어갔어요' };
  }
  const total = phrase.logged_days || 0;
  if (total > 0 && total % 7 === 0) {
    return { key: 'total_' + total, text: (MILESTONE_LABELS[total] || String(total)) + ' 번의 아침이 쌓였어요' };
  }
  return null;
}

function useMilestone(phrase, streak) {
  const [milestone, setMilestone] = useState(null);
  useEffect(() => {
    const hit = milestoneFor(phrase, streak);
    if (!hit) return;
    const key = 'dandani_milestone_' + phrase.id + '_' + hit.key;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch (error) {
      // Storage is optional; still show the celebration for this render.
    }
    setMilestone(hit);
  }, [phrase, streak]);
  return milestone;
}

function ActivePhrase({
  phrase, logging, onLogToday, onViewHistory, onUseCommunityPhrase, hasActivePhrase,
  onShare, onWritePractice,
}) {
  const ticks = getRollingWeekTicks(phrase.logged_dates, phrase.today);
  const streak = ticks.filter(Boolean).length;
  const milestone = useMilestone(phrase, streak);
  const date = phrase.today ? new Date(phrase.today + 'T12:00:00Z') : new Date();
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', ...(phrase.today ? { timeZone: 'UTC' } : {}) };
  return (
    <Scene>
      <Eyebrow sx={{ mb: 2.5 }}>{date.toLocaleDateString('ko-KR', dateOptions)}, 아침</Eyebrow>
      <Typography variant="body2"
        sx={{ fontFamily: FONT.sans, fontSize: '0.75rem', color: COLOR.text.muted, mb: 2.5, position: 'relative' }}>
        {phrase.visit_days}번째 아침이에요
      </Typography>
      <Phrase sx={{ mb: 3.5 }}>{phrase.phrase}</Phrase>
      {milestone && (
        <Box sx={{ position: 'relative', mb: 2, px: 3, py: 1.5, borderRadius: '14px',
          background: 'radial-gradient(ellipse at center, rgba(255,240,208,0.95) 0%, rgba(255,235,196,0.35) 55%, rgba(255,235,196,0) 78%)' }}>
          <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.82rem', fontWeight: 700, color: COLOR.accent.main }}>
            {milestone.text}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1, position: 'relative' }}>
        {ticks.map((filled, index) => <Tick key={index} filled={filled} sx={{ animationDelay: (index * 220) + 'ms' }} />)}
      </Box>
      {(phrase.logged_days || 0) > 0 ? (
        <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.68rem', color: COLOR.text.muted, mb: 4, position: 'relative' }}>
          {streak > 0 && <Box component="span" sx={{ color: COLOR.accent.main, fontWeight: 700 }}>{streak}일 연속</Box>}
          {streak > 0 && ' · '}모두 {phrase.logged_days}번
        </Typography>
      ) : <Box sx={{ mb: 4 }} />}
      <FloatingActions done={phrase.logged_today} logging={logging} onLog={onLogToday}
        onViewHistory={onViewHistory} onShare={onShare} onWritePractice={onWritePractice} />
      <CommunityTicker onUseCommunityPhrase={onUseCommunityPhrase} hasActivePhrase={hasActivePhrase} />
    </Scene>
  );
}

export default function VariantA(props) {
  return !props.phrase || props.isEditing ? <PhraseEditor {...props} /> : <ActivePhrase {...props} />;
}
