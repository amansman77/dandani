import React, { useState } from 'react';
import { Box, Typography, Drawer, Snackbar } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import { logPhraseShared } from '../utils/analytics';

const SANS = FONT.sans;
const SERIF = FONT.serif;

const BASE = 'https://dandani.yetimates.com/';

// 채널마다 utm_source를 달리 달아서, 캠페인 리포트에서 "인스타 광고로 온
// 사람"과 "지인이 카톡으로 보내줘서 온 사람"이 갈라져 보이게 한다.
const linkFor = (source) =>
  `${BASE}?utm_source=${source}&utm_medium=organic&utm_campaign=phrase_share`;

const captionOf = (phrase) =>
  phrase.visit_days
    ? `"${phrase.phrase}" — ${phrase.visit_days}번째 아침`
    : `"${phrase.phrase}"`;

const rowSx = (primary) => ({
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: 'none',
  padding: '13px 0',
  cursor: 'pointer',
  fontFamily: SANS,
  fontSize: '0.9rem',
  fontWeight: primary ? 600 : 500,
  color: primary ? COLOR.accent.main : COLOR.text.strong,
  borderBottom: `1px solid ${COLOR.line.faint}`,
  '&:hover': { opacity: 0.72 },
  '&:last-of-type': { borderBottom: 'none' },
});

const ShareSheet = ({ open, onClose, phrase }) => {
  const [notice, setNotice] = useState('');

  // navigator.share가 있으면 그 시트 안에 카카오톡이 들어있다. 카카오 SDK를
  // 붙이기 전까지는 이게 카톡으로 가는 유일한 길이라, 있는 기기에선 맨 위에 둔다.
  const hasOsShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  if (!phrase) return null;
  const caption = captionOf(phrase);

  const done = (method) => { logPhraseShared(method); onClose(); };

  const shareToOs = async () => {
    try {
      await navigator.share({ title: '단단이', text: caption, url: linkFor('share') });
      done('share_sheet');
    } catch (err) {
      // 시트를 그냥 닫은 것(AbortError)은 실패가 아니라 취소 — 조용히 둔다.
      if (!err || err.name !== 'AbortError') setNotice('공유하지 못했어요');
    }
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`
      + `&url=${encodeURIComponent(linkFor('twitter'))}`;
    // 클릭 핸들러 안에서 바로 열어야 팝업 차단에 안 걸린다.
    window.open(url, '_blank', 'noopener,noreferrer');
    done('twitter');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${caption}\n${linkFor('copy')}`);
      logPhraseShared('copy');
      setNotice('문장과 링크를 복사했어요');
      onClose();
    } catch (err) {
      setNotice('복사하지 못했어요');
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
            paddingBottom: 'env(safe-area-inset-bottom)',
          },
        }}
      >
        <Box sx={{ width: 34, height: 4, borderRadius: 2, background: COLOR.line.main, margin: '10px auto 4px' }} />

        <Box sx={{ padding: '8px 20px 24px' }}>
          {/* 내 문장은 사적인 글이라, 무엇이 나가는지 먼저 그대로 보여준다. */}
          <Typography sx={{ fontFamily: SANS, fontSize: '0.72rem', color: COLOR.text.muted, mb: 1.25 }}>
            이렇게 공유돼요
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF, fontWeight: 700, fontSize: '1.05rem',
              color: COLOR.text.primary, lineHeight: 1.5,
            }}
          >
            “{phrase.phrase}”
          </Typography>
          {Boolean(phrase.visit_days) && (
            <Typography sx={{ fontFamily: SANS, fontSize: '0.76rem', color: COLOR.text.muted, mt: 0.5 }}>
              {phrase.visit_days}번째 아침
            </Typography>
          )}

          <Box sx={{ mt: 2.5, borderTop: `1px solid ${COLOR.line.faint}` }}>
            {hasOsShare && (
              <Box component="button" type="button" onClick={shareToOs} sx={rowSx(true)}>
                다른 앱으로 공유
                <Typography component="span" sx={{ display: 'block', fontFamily: SANS, fontSize: '0.72rem', fontWeight: 400, color: COLOR.text.muted, mt: 0.25 }}>
                  카카오톡 등
                </Typography>
              </Box>
            )}
            <Box component="button" type="button" onClick={shareToTwitter} sx={rowSx(!hasOsShare)}>
              트위터에 올리기
            </Box>
            <Box component="button" type="button" onClick={copyLink} sx={rowSx(false)}>
              링크 복사
            </Box>
          </Box>
        </Box>
      </Drawer>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2400}
        onClose={() => setNotice('')}
        message={notice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 88 } }}
      />
    </>
  );
};

export default ShareSheet;
