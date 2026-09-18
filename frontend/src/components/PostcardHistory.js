import React, { useEffect, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import { getUserId } from '../utils/userId';
import { PRESETS, renderPhraseCard } from '../utils/phraseCard';
import Loader from './Loader';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const presetLabels = Object.fromEntries(PRESETS.map((preset) => [preset.id, preset.label]));

const PostcardCard = ({ postcard }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    setPreviewFailed(false);
    renderPhraseCard({
      phrase: postcard.phrase,
      visitDays: postcard.visit_days,
      preset: postcard.preset,
    }).then((blob) => {
      if (!alive) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewBlob(blob);
      setPreviewUrl(objectUrl);
    }).catch(() => {
      if (alive) setPreviewFailed(true);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [postcard]);

  const saveOnMobile = async (event) => {
    const isMobileBrowser = navigator.maxTouchPoints > 0
      || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobileBrowser || !previewBlob || !navigator.share || !navigator.canShare) return;
    const file = new File([previewBlob], `단단이-엽서-${postcard.id}.png`, { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) return;

    event.preventDefault();
    setSaveFailed(false);
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if (!error || error.name !== 'AbortError') setSaveFailed(true);
    }
  };

  return (
    <Box sx={{ maxWidth: 360, mx: 'auto', mb: 3 }}>
      <Box
        sx={{
          width: '100%', aspectRatio: '1 / 1', borderRadius: 2, overflow: 'hidden',
          background: COLOR.surface.ring, border: `1px solid ${COLOR.line.soft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {previewUrl ? (
          <Box component="img" src={previewUrl} alt={`“${postcard.phrase}” 엽서`}
            sx={{ width: '100%', height: '100%', display: 'block' }} />
        ) : previewFailed ? (
          <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.76rem', color: COLOR.text.muted }}>
            미리보기를 만들지 못했어요
          </Typography>
        ) : <Loader />}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.25 }}>
        <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.7rem', color: COLOR.text.muted }}>
          {presetLabels[postcard.preset] || postcard.preset} · {postcard.visit_days}번째 아침
        </Typography>
        <Box
          component="a"
          href={previewUrl || undefined}
          download={`단단이-엽서-${postcard.id}.png`}
          onClick={saveOnMobile}
          aria-disabled={!previewUrl}
          sx={{
            color: COLOR.accent.main, fontFamily: FONT.sans, fontWeight: 600,
            textDecoration: 'none', cursor: previewUrl ? 'pointer' : 'default',
            opacity: previewUrl ? 1 : 0.45, pointerEvents: previewUrl ? 'auto' : 'none',
          }}
        >
          다운로드
        </Box>
      </Box>
      {saveFailed && (
        <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.7rem', color: COLOR.error, textAlign: 'right', mt: 0.5 }}>
          기기 저장 화면을 열지 못했어요
        </Typography>
      )}
    </Box>
  );
};

const PostcardHistory = () => {
  const [postcards, setPostcards] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const fetchPostcards = async () => {
      try {
        const response = await fetch(`${API_URL}/api/nuv/postcards`, {
          headers: { 'X-User-ID': getUserId() },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '엽서함을 불러오지 못했어요');
        if (alive) setPostcards(data.postcards);
      } catch (fetchError) {
        if (alive) setError(fetchError.message);
      }
    };
    fetchPostcards();
    return () => { alive = false; };
  }, []);

  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  if (postcards === null) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><Loader /></Box>;
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', pt: 3 }}>
      <Typography sx={{ fontFamily: FONT.serif, fontWeight: 700, fontSize: '1.2rem', color: COLOR.text.primary, mb: 2 }}>
        내 엽서함
      </Typography>
      {postcards.length === 0 ? (
        <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.82rem', color: COLOR.text.muted }}>
          아직 저장한 엽서가 없어요.
        </Typography>
      ) : postcards.map((postcard) => <PostcardCard key={postcard.id} postcard={postcard} />)}
    </Box>
  );
};

export default PostcardHistory;
