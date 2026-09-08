import React, { useState, useEffect } from 'react';
import { Box, Typography, Drawer, Snackbar } from '@mui/material';
import { COLOR, FONT } from '../theme/tokens';
import { logPhraseShared } from '../utils/analytics';
import { isKakaoConfigured, preloadKakao, shareToKakao } from '../utils/kakaoShare';
import PhraseCardSheet from './PhraseCardSheet';

const SANS = FONT.sans;
const SERIF = FONT.serif;

const BASE = 'https://dandani.yetimates.com/';
const OG_IMAGE = 'https://dandani.yetimates.com/og-image.png';

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
  const [cardOpen, setCardOpen] = useState(false);

  const hasOsShare = typeof navigator !== 'undefined' && Boolean(navigator.share);
  // 카카오 키가 없으면(앱 미등록) 카카오 줄은 아예 안 뜨고, 카톡으로 가는 길은
  // OS 공유 시트뿐이다 — 그때는 그 줄이 "카카오톡 등"이라고 스스로 밝힌다.
  const hasKakao = isKakaoConfigured();

  // 시트가 열리는 순간 SDK를 미리 받아둔다 — 누를 때 동기로 열려야 팝업이 안 막힌다.
  useEffect(() => { if (open && hasKakao) preloadKakao(); }, [open, hasKakao]);

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

  const shareKakao = async () => {
    try {
      await shareToKakao({
        phrase: phrase.phrase,
        visitDays: phrase.visit_days,
        link: linkFor('kakao'),
        imageUrl: OG_IMAGE,
      });
      done('kakao');
    } catch (err) {
      // SDK를 못 불러왔거나(광고 차단·네트워크) 도메인 등록이 안 된 경우.
      // 시트는 열어둔 채로 알려서, 바로 아래 다른 길을 쓸 수 있게 한다.
      setNotice('카카오톡 공유를 열지 못했어요');
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
            <Box component="button" type="button"
              onClick={() => { onClose(); setCardOpen(true); }} sx={rowSx(true)}>
              이미지 카드로 공유
              <Typography component="span" sx={{ display: 'block', fontFamily: SANS, fontSize: '0.72rem', fontWeight: 400, color: COLOR.text.muted, mt: 0.25 }}>
                배경 고르기 · 인스타그램
              </Typography>
            </Box>
            {hasKakao && (
              <Box component="button" type="button" onClick={shareKakao} sx={rowSx(false)}>
                카카오톡으로 보내기
              </Box>
            )}
            {hasOsShare && (
              <Box component="button" type="button" onClick={shareToOs} sx={rowSx(false)}>
                다른 앱으로 공유
                {!hasKakao && (
                  <Typography component="span" sx={{ display: 'block', fontFamily: SANS, fontSize: '0.72rem', fontWeight: 400, color: COLOR.text.muted, mt: 0.25 }}>
                    카카오톡 등
                  </Typography>
                )}
              </Box>
            )}
            <Box component="button" type="button" onClick={shareToTwitter} sx={rowSx(false)}>
              트위터에 올리기
            </Box>
            <Box component="button" type="button" onClick={copyLink} sx={rowSx(false)}>
              링크 복사
            </Box>
          </Box>
        </Box>
      </Drawer>

      <PhraseCardSheet open={cardOpen} onClose={() => setCardOpen(false)} phrase={phrase} />

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
