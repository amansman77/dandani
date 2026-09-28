import React, { useEffect, useState } from 'react';
import { Box, Typography, Drawer } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import Loader from './Loader';
import { fetchNuvLedger } from '../utils/nuvApi';

const SANS = FONT.sans;
const SERIF = FONT.serif;

// 누브 장부.
//
// 누브는 받는 것이 아니라 남는 것이다. 그래서 이 화면엔 "잔액"도 "받았어요"도
// 없다 — 되새긴 하루가 한 줄씩 적혀 있고, 그 줄 수가 곧 누브다. 체인·코인·지갑
// 이야기도 하지 않는다. 봉인은 실제로 매일 밤 일어나는 일이라 말하지만, 체인에
// 새겨진다는 말은 도장 지갑이 연결된 뒤에야 사실이 된다
// (docs/plan/0014-nuv-ledger-stamping-wallet.md).

const formatDay = (day) => {
  const [, month, date] = day.split('-').map(Number);
  return `${month}월 ${date}일`;
};

const NuvLedgerSheet = ({ open, onClose }) => {
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    fetchNuvLedger()
      .then((data) => { if (!cancelled) setLedger(data); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [open]);

  const days = ledger?.days || [];

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}
      PaperProps={{ sx: {
        background: COLOR.surface.sheet, borderRadius: '18px 18px 0 0', px: 3, pt: 2, pb: 4,
        maxHeight: '82vh', display: 'flex', flexDirection: 'column',
      } }}>
      <Box sx={{ width: 38, height: 4, borderRadius: 2, background: COLOR.line.main, mx: 'auto', mb: 2.5, flexShrink: 0 }} />

      <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
        <Typography sx={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.78rem', color: COLOR.accent.eyebrow }}>
          누브 장부
        </Typography>
        <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.6rem', lineHeight: 1.3, color: COLOR.text.primary, mt: 0.75 }}>
          {ledger ? ledger.total : ' '}
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: '0.74rem', lineHeight: 1.65, color: COLOR.text.muted, mt: 0.5 }}>
          되새긴 하루가 하나씩 누브로 남아요.
        </Typography>
      </Box>

      <Box sx={{ mt: 2.5, borderTop: `1px solid ${COLOR.line.faint}`, overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {!ledger && !error && <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><Loader /></Box>}
        {error && (
          <Typography sx={{ fontFamily: SANS, fontSize: '0.78rem', color: COLOR.error, textAlign: 'center', py: 3 }}>
            {error}
          </Typography>
        )}
        {ledger && days.length === 0 && (
          <Typography sx={{ fontFamily: SANS, fontSize: '0.78rem', lineHeight: 1.7, color: COLOR.text.body, textAlign: 'center', py: 3 }}>
            아직 남은 누브가 없어요.
            <br />오늘 문장을 되새기면 첫 누브가 남아요.
          </Typography>
        )}
        {days.map((entry) => (
          <Box key={entry.day} sx={{ py: 1.5, borderBottom: `1px solid ${COLOR.line.faint}` }}>
            <Typography sx={{ fontFamily: SANS, fontSize: '0.68rem', color: COLOR.text.muted }}>
              {formatDay(entry.day)}
            </Typography>
            <Typography sx={{ fontFamily: SERIF, fontSize: '0.9rem', lineHeight: 1.55, color: COLOR.text.primary, mt: 0.25 }}>
              {entry.phrase || '되새긴 하루'}
            </Typography>
          </Box>
        ))}
      </Box>

      {ledger && (
        <Typography sx={{ fontFamily: SANS, fontSize: '0.68rem', lineHeight: 1.6, color: COLOR.text.faint, textAlign: 'center', mt: 2, flexShrink: 0 }}>
          매일 밤 장부가 봉인돼요
          {' · '}
          {ledger.last_sealed_day ? `마지막 봉인 ${formatDay(ledger.last_sealed_day)}` : '첫 봉인은 오늘 밤이에요'}
        </Typography>
      )}
    </Drawer>
  );
};

export default NuvLedgerSheet;
