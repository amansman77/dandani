import React, { useEffect, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import { getUserId } from '../utils/userId';
import { PRESETS, renderPhraseCard } from '../utils/phraseCard';
import Loader from './Loader';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const presetLabels = Object.fromEntries(PRESETS.map((preset) => [preset.id, preset.label]));

const PostcardPreview = ({ postcard }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);

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
      setPreviewUrl(objectUrl);
    }).catch(() => {
      if (alive) setPreviewFailed(true);
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [postcard]);

  return (
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
  );
};

const PostcardHistory = () => {
  const [postcards, setPostcards] = useState(null);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

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

  const download = async (postcard) => {
    setDownloadingId(postcard.id);
    try {
      const blob = await renderPhraseCard({
        phrase: postcard.phrase,
        visitDays: postcard.visit_days,
        preset: postcard.preset,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `단단이-엽서-${postcard.id}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setError('엽서를 다운로드하지 못했어요');
    } finally {
      setDownloadingId(null);
    }
  };

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
      ) : postcards.map((postcard) => (
        <Box key={postcard.id} sx={{ maxWidth: 360, mx: 'auto', mb: 3 }}>
          <PostcardPreview postcard={postcard} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.25 }}>
            <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.7rem', color: COLOR.text.muted }}>
              {presetLabels[postcard.preset] || postcard.preset} · {postcard.visit_days}번째 아침
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={() => download(postcard)}
              disabled={downloadingId === postcard.id}
              sx={{ border: 'none', background: 'none', color: COLOR.accent.main, fontFamily: FONT.sans, fontWeight: 600, cursor: 'pointer' }}
            >
              {downloadingId === postcard.id ? '준비 중…' : '다운로드'}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default PostcardHistory;
