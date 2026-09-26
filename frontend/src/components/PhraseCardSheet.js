import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Drawer, Snackbar } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import Loader from './Loader';
import { PRESETS, renderPhraseCard } from '../utils/phraseCard';
import { shareImageFile } from '../utils/shareImageFile';
import { proofCaption } from '../utils/practiceDate';
import { getUserId } from '../utils/userId';

const SANS = FONT.sans;
const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

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

const PhraseCardSheet = ({ open, onClose, phrase, postcardId, practicedOn, loggedDays }) => {
  const [preset, setPreset] = useState('morning');
  const [url, setUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedPreset, setSavedPreset] = useState(null);
  // 미리보기 URL은 다음 그림으로 바뀔 때 반드시 해제해야 한다 — 배경을 여러 번
  // 바꾸면 그때마다 blob이 쌓인다.
  const urlRef = useRef(null);

  const draw = useCallback(async () => {
    if (!phrase) return;
    setBusy(true);
    try {
      const b = await renderPhraseCard({
        phrase: phrase.phrase, meta: proofCaption(practicedOn, loggedDays), preset,
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
  }, [phrase, preset, practicedOn, loggedDays]);

  useEffect(() => { if (open) draw(); }, [open, draw]);

  useEffect(() => { setSavedPreset(null); }, [postcardId]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  if (!phrase) return null;

  const shareImage = async () => {
    const result = await shareImageFile(blob, 'card_share');
    if (result === 'shared') onClose();
    if (result === 'unsupported') setNotice('이 브라우저에서는 이미지를 내보낼 수 없어요');
    if (result === 'failed') setNotice('공유하지 못했어요');
  };

  const savePostcard = async () => {
    if (!postcardId || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/nuv/postcards/${postcardId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({ preset }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '엽서를 저장하지 못했어요');
      // 그림은 서버로 보내지 않는다. 엽서함 미리보기는 문장·프리셋으로
      // 그때그때 다시 그리는 것이라, 고른 배경만 남기면 충분하다.
      setSavedPreset(preset);
      setNotice('내 엽서함에 저장했어요');
    } catch (error) {
      setNotice(error.message || '엽서를 저장하지 못했어요');
    } finally {
      setSaving(false);
    }
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
            배경을 고르고 엽서함에 간직하거나 이미지로 내보내요
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
                <Loader />
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

          {/* 다운로드 버튼이 여기 있었다. 브라우저마다 blob 다운로드가
              제각각이라(빈 파일이 받아지는 환경이 있었다) 걷어냈다.
              이미지를 밖으로 내보내는 길은 OS 공유 시트 하나로 모은다 —
              사진 앱에 저장하는 것도 거기서 되고, 인스타로 가는 유일한
              길이기도 하다. */}
          <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5 }}>
            <Box component="button" type="button" onClick={savePostcard}
              disabled={!postcardId || saving || savedPreset === preset} sx={actionSx(true)}>
              {saving ? '저장 중…' : (savedPreset === preset ? '저장됨' : '엽서함에 저장')}
            </Box>
            <Box component="button" type="button" onClick={shareImage}
              disabled={!blob || busy} sx={actionSx(false)}>
              이미지 공유
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
