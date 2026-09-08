import React, { useState, useEffect, useRef } from 'react';
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

// 브랜드 심볼은 각 서비스의 색을 그대로 쓴다. 앱의 차분한 톤과는 이질적이지만,
// 사람들은 노란 말풍선과 검은 X를 '모양'이 아니라 '색'으로 먼저 알아본다.
// 대신 크기를 44px로 묶고 아래에 이름을 붙여, 작게 두 개만 놓이도록 했다.
const brandBtnSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '7px',
  border: 'none',
  background: 'none',
  padding: '4px 12px',
  cursor: 'pointer',
  fontFamily: SANS,
  fontSize: '0.7rem',
  color: COLOR.text.muted,
  WebkitTapHighlightColor: 'transparent',
  '&:hover': { opacity: 0.72 },
};

const circleSx = (background) => ({
  width: 44,
  height: 44,
  borderRadius: '50%',
  background,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const KakaoMark = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#3B1E1E" d="M12 3.5C6.9 3.5 2.8 6.74 2.8 10.73c0 2.55 1.68 4.79 4.21 6.07-.19.68-.68 2.47-.78 2.85-.12.48.18.47.37.34.15-.1 2.4-1.63 3.38-2.3.65.09 1.32.14 2.02.14 5.1 0 9.2-3.24 9.2-7.1S17.1 3.5 12 3.5z" />
  </svg>
);

const XMark = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#FFFFFF" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ShareSheet = ({ open, onClose, phrase }) => {
  const [notice, setNotice] = useState('');
  const [cardOpen, setCardOpen] = useState(false);

  // 카카오 키가 없으면(앱 미등록) 카카오 심볼은 아예 안 뜨고 트위터만 남는다.
  const hasKakao = isKakaoConfigured();

  // 시트가 열리는 순간 SDK를 미리 받아둔다 — 누를 때 동기로 열려야 팝업이 안 막힌다.
  useEffect(() => { if (open && hasKakao) preloadKakao(); }, [open, hasKakao]);

  // 시트가 떠 있을 때 뒤로가기를 누르면 시트만 닫혀야 하는데, 아무 처리가 없어서
  // 앱 밖으로 나가버렸다(측정으로 확인). 시트가 떠 있는 동안 히스토리 항목을
  // 하나 얹어두고, 뒤로가기가 그걸 먹게 한다.
  //
  // 항목은 "공유 흐름" 전체에 하나만 얹는다. 시트마다 얹으면, 공유 시트를 닫고
  // 카드 시트를 여는 순간(같은 틱에 일어난다) 되돌리기와 얹기가 엉켜서 카드
  // 시트가 열리자마자 닫힌다.
  const flowOpen = open || cardOpen;
  const closedByBackRef = useRef(false);
  // onClose는 부모가 인라인 화살표로 넘겨서 렌더마다 새 함수다. 의존성에 넣으면
  // 렌더할 때마다 히스토리 항목이 하나씩 쌓인다.
  const closeFlowRef = useRef(null);
  closeFlowRef.current = () => { setCardOpen(false); onClose(); };

  useEffect(() => {
    if (!flowOpen) return undefined;
    closedByBackRef.current = false;
    window.history.pushState({ dandaniSheet: true }, '');
    const onPop = () => { closedByBackRef.current = true; closeFlowRef.current(); };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // 버튼·바깥 탭으로 닫았을 땐 우리가 얹은 항목을 직접 걷어낸다.
      // 뒤로가기로 닫힌 경우엔 이미 걷혔으니 건드리면 한 칸 더 나간다.
      if (!closedByBackRef.current && window.history.state?.dandaniSheet) {
        window.history.back();
      }
    };
  }, [flowOpen]);

  if (!phrase) return null;
  const caption = captionOf(phrase);

  const done = (method) => { logPhraseShared(method); onClose(); };

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
            <Box component="button" type="button" onClick={copyLink} sx={rowSx(false)}>
              링크 복사
            </Box>
          </Box>

          {/* 카톡·트위터는 "무엇을 하는지"보다 "어디로 가는지"가 전부라, 글자 줄
              대신 심볼로 둔다. 글자 줄과 섞지 않고 아래에 따로 묶어야 둘의 성격
              차이(동작 / 목적지)가 드러난다. */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2.5, mt: 3 }}>
            {hasKakao && (
              <Box component="button" type="button" onClick={shareKakao} sx={brandBtnSx} aria-label="카카오톡으로 보내기">
                <Box sx={circleSx('#FEE500')}><KakaoMark /></Box>
                카카오톡
              </Box>
            )}
            <Box component="button" type="button" onClick={shareToTwitter} sx={brandBtnSx} aria-label="트위터에 올리기">
              <Box sx={circleSx('#000000')}><XMark /></Box>
              트위터
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
