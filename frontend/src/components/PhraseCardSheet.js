import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Drawer, Snackbar, CircularProgress } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import { logPhraseShared } from '../utils/analytics';
import { PRESETS, renderPhraseCard } from '../utils/phraseCard';

const SANS = FONT.sans;
const LINK = 'https://dandani.yetimates.com/?utm_source=card&utm_medium=organic&utm_campaign=phrase_share';

const chipSx = (on) => ({
  border: `1px solid ${on ? COLOR.accent.line : COLOR.line.main}`,
  background: on ? 'rgba(201,131,84,0.10)' : 'none',
  color: on ? COLOR.accent.main : COLOR.text.muted,
  fontWeight: on ? 600 : 500,
  borderRadius: 999,
  padding: '7px 16px',
  fontFamily: SANS,
  fontSize: '0.8rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const actionSx = (primary) => ({
  flex: 1,
  border: `1.4px solid ${primary ? COLOR.accent.line : COLOR.line.main}`,
  background: 'none',
  color: primary ? COLOR.accent.main : COLOR.text.strong,
  borderRadius: 999,
  padding: '13px 0',
  fontFamily: SANS,
  fontSize: '0.88rem',
  fontWeight: primary ? 600 : 500,
  cursor: 'pointer',
  '&:disabled': { opacity: 0.45, cursor: 'default' },
});

const PhraseCardSheet = ({ open, onClose, phrase }) => {
  const [preset, setPreset] = useState('morning');
  const [url, setUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  // 미리보기 URL은 다음 그림으로 바뀔 때 반드시 해제해야 한다 — 배경을 여러 번
  // 바꾸면 그때마다 blob이 쌓인다.
  const urlRef = useRef(null);

  const draw = useCallback(async () => {
    if (!phrase) return;
    setBusy(true);
    try {
      const b = await renderPhraseCard({
        phrase: phrase.phrase, visitDays: phrase.visit_days, preset,
      });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(b);
      setBlob(b);
      setUrl(urlRef.current);
    } catch (err) {
      setNotice('카드를 만들지 못했어요');
    } finally {
      setBusy(false);
    }
  }, [phrase, preset]);

  useEffect(() => { if (open) draw(); }, [open, draw]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  if (!phrase) return null;

  const fileOf = () => new File([blob], 'dandani.png', { type: 'image/png' });

  // 인스타는 웹에서 직접 열 수 없지만, OS 공유 시트에 이미지 파일을 넘기면
  // 목록에 인스타가 뜬다 — 이미지가 인스타로 가는 실질적인 경로.
  const shareImage = async () => {
    if (!blob) return;
    const file = fileOf();
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
      setNotice('이 브라우저는 이미지 공유를 지원하지 않아요. 저장 후 올려주세요');
      return;
    }
    try {
      // 카톡은 넘긴 항목마다 메시지를 하나씩 보낸다. files·text·url을 다 주면
      // 셋으로 쪼개져서(이미지·문장·링크) 처음엔 파일만 보냈는데, 그러면 돌아올
      // 링크가 없어진다. text는 뺀다 — 문장은 이미 그림 안에 있어서 중복이다.
      // 남는 건 이미지와 링크 둘, 즉 메시지 두 개.
      await navigator.share({ files: [file], url: LINK });
      logPhraseShared('card_share');
      onClose();
    } catch (err) {
      if (!err || err.name !== 'AbortError') setNotice('공유하지 못했어요');
    }
  };

  const saveImage = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `단단이-${phrase.visit_days || 1}번째아침.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    logPhraseShared('card_save');
    setNotice('이미지를 저장했어요');
  };

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            borderRadius: '18px 18px 0 0',
            background: COLOR.surface.sheet,
            backgroundImage: 'none',
            maxHeight: '92vh',
            paddingBottom: 'env(safe-area-inset-bottom)',
          },
        }}
      >
        <Box sx={{ width: 34, height: 4, borderRadius: 2, background: COLOR.line.main, margin: '10px auto 4px' }} />

        <Box sx={{ padding: '8px 20px 24px' }}>
          <Typography sx={{ fontFamily: SANS, fontSize: '0.72rem', color: COLOR.text.muted, mb: 1.25 }}>
            배경을 고르고 이미지로 내보내요
          </Typography>

          <Box
            sx={{
              position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '1 / 1',
              margin: '0 auto', borderRadius: '12px', overflow: 'hidden',
              border: `1px solid ${COLOR.line.soft}`, background: COLOR.surface.ring,
            }}
          >
            {url && (
              <Box component="img" src={url} alt="공유 카드 미리보기"
                sx={{ width: '100%', height: '100%', display: 'block' }} />
            )}
            {busy && (
              <Box sx={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(253,249,242,0.55)',
              }}>
                <CircularProgress size={22} sx={{ color: COLOR.accent.line }} />
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {PRESETS.map((p) => (
              <Box key={p.id} component="button" type="button"
                onClick={() => setPreset(p.id)} sx={chipSx(preset === p.id)}>
                {p.label}
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5 }}>
            <Box component="button" type="button" onClick={shareImage}
              disabled={!blob || busy} sx={actionSx(true)}>
              이미지 공유
            </Box>
            <Box component="button" type="button" onClick={saveImage}
              disabled={!url || busy} sx={actionSx(false)}>
              저장
            </Box>
          </Box>
        </Box>
      </Drawer>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3000}
        onClose={() => setNotice('')}
        message={notice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 88 } }}
      />
    </>
  );
};

export default PhraseCardSheet;
