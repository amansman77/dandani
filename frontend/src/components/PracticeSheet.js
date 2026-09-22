import React, { useEffect, useState } from 'react';
import { Box, Typography, Drawer, TextField, Snackbar } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import Loader from './Loader';
import { savePracticeRecord } from '../utils/practiceApi';

const SANS = FONT.sans;
const SERIF = FONT.serif;

// 실천을 적는 자리.
//
// 묻는 말이 "실천했나요?"가 아니라 "적어주세요"인 게 이 화면의 전부다.
// 예/아니오를 물으면 평가가 되고, 여기까지 온 사람은 이미 답이 "예"인
// 사람이다. 물어서 얻을 게 없고, 물으면 잃는다.
//
// 글자 수도 세지 않는다. 세는 순간 숙제가 되고, 한 줄짜리 기록도 기록이다.

const todayString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const labelSx = {
  fontFamily: SANS, fontSize: '0.7rem', color: COLOR.text.muted,
};

const submitSx = (enabled) => ({
  width: '100%',
  border: 'none',
  borderRadius: 999,
  padding: '13px 0',
  fontFamily: SANS,
  fontSize: '0.88rem',
  fontWeight: 700,
  cursor: enabled ? 'pointer' : 'default',
  background: enabled ? COLOR.accent.main : 'none',
  color: enabled ? '#fff' : COLOR.line.disabled,
  boxShadow: enabled ? '0 6px 18px rgba(80,64,46,0.24)' : 'none',
  outline: enabled ? 'none' : `1px solid ${COLOR.line.disabledSoft}`,
  WebkitTapHighlightColor: 'transparent',
});

const PracticeSheet = ({ open, onClose, phrase, onSaved }) => {
  const [body, setBody] = useState('');
  const [practicedOn, setPracticedOn] = useState(todayString);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!open) return;
    setBody('');
    setPracticedOn(todayString());
  }, [open]);

  const submit = async () => {
    if (!body.trim() || saving || !phrase) return;
    setSaving(true);
    try {
      const result = await savePracticeRecord(phrase.id, body.trim(), practicedOn);
      onClose();
      onSaved?.(result);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Drawer anchor="bottom" open={open} onClose={onClose}
        PaperProps={{ sx: {
          background: COLOR.surface.sheet, borderRadius: '18px 18px 0 0', px: 3, pt: 2, pb: 4,
        } }}>
        <Box sx={{ width: 38, height: 4, borderRadius: 2, background: COLOR.line.main, mx: 'auto', mb: 2.5 }} />

        {phrase && (
          <Typography sx={{ fontFamily: SERIF, fontSize: '0.86rem', fontStyle: 'italic',
            color: COLOR.text.quote, textAlign: 'center', mb: 1 }}>
            “{phrase.phrase}”
          </Typography>
        )}
        <Typography sx={{ fontFamily: SANS, fontSize: '1rem', fontWeight: 700,
          color: COLOR.text.primary, textAlign: 'center', mb: 2.5, lineHeight: 1.5 }}>
          이 말대로 한 순간을<br />적어주세요
        </Typography>

        <TextField fullWidth multiline minRows={4} autoFocus value={body}
          onChange={event => setBody(event.target.value)}
          placeholder="어떤 상황이었고, 어떻게 했는지"
          sx={{ mb: 2,
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255,255,255,0.7)', fontFamily: SERIF, fontSize: '0.92rem',
            } }} />

        {/* 실천이 오늘 있었으란 법이 없다. 그저께 일을 오늘 적을 수도 있어서
            날짜는 고칠 수 있게 둔다 — 실천은 일정표대로 오지 않는다. */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography sx={labelSx}>언제 있었던 일인가요</Typography>
          <Box component="input" type="date" value={practicedOn} max={todayString()}
            onChange={event => setPracticedOn(event.target.value)}
            aria-label="실천한 날짜"
            sx={{ fontFamily: SANS, fontSize: '0.8rem', color: COLOR.text.body,
              background: 'none', border: `1px solid ${COLOR.line.main}`, borderRadius: '8px',
              padding: '6px 10px' }} />
        </Box>

        <Box component="button" type="button" onClick={submit}
          disabled={!body.trim() || saving} sx={submitSx(Boolean(body.trim()) && !saving)}>
          {saving ? <Loader small /> : '남기기'}
        </Box>
      </Drawer>

      <Snackbar open={Boolean(notice)} autoHideDuration={3200} onClose={() => setNotice('')}
        message={notice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </>
  );
};

export default PracticeSheet;
