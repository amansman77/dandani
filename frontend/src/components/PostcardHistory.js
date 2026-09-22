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
  const [downloadUrl, setDownloadUrl] = useState(postcard.download_url);
  const [preparingDownload, setPreparingDownload] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);

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

  const prepareLegacyDownload = async () => {
    if (!previewBlob || preparingDownload) return;
    setPreparingDownload(true);
    setDownloadFailed(false);
    try {
      const response = await fetch(`${API_URL}/api/nuv/postcards/${postcard.id}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png', 'X-User-ID': getUserId() },
        body: previewBlob,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'download preparation failed');
      setDownloadUrl(data.download_url);
      window.location.assign(data.download_url);
    } catch {
      setDownloadFailed(true);
    } finally {
      setPreparingDownload(false);
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
      {/* 증명의 본문. 엽서 그림에는 문장만 들어가서, 무엇을 살아냈는지는
          여기서 읽는다 — 이게 없으면 그냥 예쁜 카드다. */}
      {postcard.practice_body && (
        <Box sx={{ mt: 1.5, pl: 1.5, borderLeft: `2px solid ${COLOR.accent.line}` }}>
          <Typography sx={{ fontFamily: FONT.serif, fontSize: '0.86rem', color: COLOR.text.body,
            lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {postcard.practice_body}
          </Typography>
          <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.68rem', color: COLOR.text.muted, mt: 0.75 }}>
            {postcard.practiced_on}에 있었던 일 · 그때까지 되새김 {postcard.nuv_at_issue}번
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
        <Box
          component={downloadUrl ? 'a' : 'button'}
          href={downloadUrl || undefined}
          type={downloadUrl ? undefined : 'button'}
          onClick={downloadUrl ? undefined : prepareLegacyDownload}
          aria-disabled={!downloadUrl && (!previewBlob || preparingDownload)}
          sx={{
            border: 'none', background: 'none', padding: 0,
            color: COLOR.accent.main, fontFamily: FONT.sans, fontWeight: 600,
            textDecoration: 'none', cursor: previewBlob ? 'pointer' : 'default',
            opacity: previewBlob ? 1 : 0.45,
          }}
        >
          {preparingDownload ? '준비 중…' : '다운로드'}
        </Box>
      </Box>
      {downloadFailed && (
        <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.7rem', color: COLOR.error, textAlign: 'right', mt: 0.5 }}>
          다운로드 파일을 준비하지 못했어요
        </Typography>
      )}
    </Box>
  );
};

// 아직 문턱을 못 넘어 봉해지지 않은 기록. 사라진 게 아니라 기다리는 중이라는
// 걸 보여줘야 다시 쓸 마음이 생기고, 비어 있던 탭이 "곧 될 것이 쌓이는 탭"이 된다.
const AwaitingRecord = ({ record, threshold }) => (
  <Box sx={{ border: `1px dashed ${COLOR.line.main}`, borderRadius: 2, p: 2, mb: 1.5 }}>
    <Typography sx={{ fontFamily: FONT.serif, fontSize: '0.84rem', fontStyle: 'italic',
      color: COLOR.text.quote, mb: 0.75 }}>
      “{record.phrase}”
    </Typography>
    <Typography sx={{ fontFamily: FONT.serif, fontSize: '0.86rem', color: COLOR.text.body,
      lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
      {record.body}
    </Typography>
    <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.68rem', color: COLOR.text.muted, mt: 1 }}>
      {record.practiced_on} · 되새김 {Math.max(0, threshold - record.nuv_at_record)}번 더 쌓이면 엽서가 돼요
    </Typography>
  </Box>
);

const PostcardHistory = () => {
  const [postcards, setPostcards] = useState(null);
  const [awaiting, setAwaiting] = useState([]);
  const [threshold, setThreshold] = useState(10);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [postcardResponse, practiceResponse] = await Promise.all([
          fetch(`${API_URL}/api/nuv/postcards`, { headers: { 'X-User-ID': getUserId() } }),
          fetch(`${API_URL}/api/practices`, { headers: { 'X-User-ID': getUserId() } }),
        ]);
        const data = await postcardResponse.json();
        if (!postcardResponse.ok) throw new Error(data.error || '엽서함을 불러오지 못했어요');
        if (!alive) return;
        setPostcards(data.postcards);
        // 기다리는 기록을 못 읽어도 엽서함은 열려야 한다.
        if (practiceResponse.ok) {
          const practices = await practiceResponse.json();
          setAwaiting(practices.records.filter((record) => record.awaiting_issue));
          if (practices.threshold) setThreshold(practices.threshold);
        }
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
      {postcards.length === 0 && awaiting.length === 0 ? (
        <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.82rem', color: COLOR.text.muted }}>
          아직 저장한 엽서가 없어요.
        </Typography>
      ) : postcards.map((postcard) => <PostcardCard key={postcard.id} postcard={postcard} />)}

      {awaiting.length > 0 && (
        <Box sx={{ mt: postcards.length ? 4 : 0 }}>
          <Typography sx={{ fontFamily: FONT.sans, fontSize: '0.76rem', color: COLOR.text.muted, mb: 1.5 }}>
            봉해지기를 기다리는 기록
          </Typography>
          {awaiting.map((record) => (
            <AwaitingRecord key={record.id} record={record} threshold={threshold} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PostcardHistory;
