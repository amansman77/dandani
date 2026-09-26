import React, { useEffect, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import { getUserId } from '../utils/userId';
import { PRESETS, renderPhraseCard } from '../utils/phraseCard';
import { formatPracticedOn, proofCaption } from '../utils/practiceDate';
import Loader from './Loader';
import ShareSheet from './ShareSheet';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const presetLabels = Object.fromEntries(PRESETS.map((preset) => [preset.id, preset.label]));

const PostcardCard = ({ postcard, onShare }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  // 공유는 그린 그림 자체를 넘겨야 해서 blob을 들고 있는다. 미리보기용
  // objectURL만으로는 파일을 만들 수 없다.
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    setPreviewFailed(false);
    renderPhraseCard({
      phrase: postcard.phrase,
      meta: proofCaption(postcard.practiced_on, postcard.logged_days_at_issue),
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
      {/* 증명의 본문. 엽서 그림에는 문장만 들어가서, 무엇을 살아냈는지는
          여기서 읽는다 — 이게 없으면 그냥 예쁜 카드다. */}
      {postcard.practice_body && (
        <Box sx={{ mt: 1.5, pl: 1.5, borderLeft: `2px solid ${COLOR.accent.line}` }}>
          <Typography sx={{ fontFamily: FONT.serif, fontSize: '0.86rem', color: COLOR.text.body,
            lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {postcard.practice_body}
          </Typography>
          {/* 누브는 여기 적지 않는다. 이 숫자는 발행 순간의 잔액이라,
              누브를 주고받게 되면 "산 숫자"가 증명서에 박힌다. 증명에 남을
              것은 무엇을 언제 살아냈는가뿐이다. */}
          <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.68rem', color: COLOR.text.muted, mt: 0.75 }}>
            {formatPracticedOn(postcard.practiced_on)}에 있었던 일
            {postcard.logged_days_at_issue > 0
              && ` · 그때까지 ${postcard.logged_days_at_issue}일 되새김`}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.25 }}>
        <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.7rem', color: COLOR.text.muted }}>
          {postcard.issue_no
            ? <Box component="span" sx={{ color: COLOR.accent.main, fontWeight: 700,
                fontVariantNumeric: 'tabular-nums' }}>
                #{String(postcard.issue_no).padStart(4, '0')}
              </Box>
            : '초기 엽서'}
          {' · '}{presetLabels[postcard.preset] || postcard.preset}
        </Typography>
        {/* 공유는 앱 어디서나 같은 시트를 쓴다. 그림에는 문장과 날짜만
            들어가고 실천 기록 본문은 안 그려서, 밖으로 나가는 건
            "무엇을 언제"까지다. */}
        {previewBlob && (
          <Box component="button" type="button"
            onClick={() => onShare({ blob: previewBlob, phrase: postcard.phrase })}
            sx={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer',
              color: COLOR.accent.main, fontFamily: FONT.sans, fontSize: '0.72rem',
              fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}>
            공유하기
          </Box>
        )}
      </Box>
    </Box>
  );
};

const PostcardHistory = () => {
  const [postcards, setPostcards] = useState(null);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
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
    load();
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
      ) : postcards.map((postcard) => (
        <PostcardCard key={postcard.id} postcard={postcard} onShare={setSharing} />
      ))}

      <ShareSheet
        open={Boolean(sharing)} onClose={() => setSharing(null)}
        phrase={sharing ? { phrase: sharing.phrase } : null} image={sharing?.blob}
      />
    </Box>
  );
};

export default PostcardHistory;
