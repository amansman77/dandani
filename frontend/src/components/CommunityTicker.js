import React, { useState, useEffect } from 'react';
import { Box, Typography, Drawer, Button, CircularProgress, Skeleton } from '@mui/material';
import { getUserId } from '../utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const SERIF = '"Pretendard", "Nanum Myeongjo", Georgia, "Noto Serif KR", serif !important';
const SANS = '"Pretendard", -apple-system, "system-ui", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif !important';

// 실제 다른 사용자 데이터 위에, 편집팀이 고른 문구를 앞쪽에 끼워 넣는다.
// 절대 실제 유저인 척(가짜 닉네임·가짜 N일째)하지 않고 "단단이 추천"으로
// 명확히 구분해서 보여준다 — 이 티커는 "다른 사람들도 진짜 쓰고 있다"는
// 신뢰를 파는 곳이라, 가짜 활동을 섞으면 그 신뢰 자체가 무너진다.
// 책이나 다른 작품에서 그대로 인용한 문장은 "추천"이 아니라 출처 표시가
// 맞다 — source를 달면 "책 제목 中"으로 뜨고(전집이 아니라 원 출처를
// 밝히는 인용구 관례), "단단이 추천" 대신 이걸 보여준다.
const RECOMMENDED_ITEMS = [
  {
    // EXAMPLE_PHRASES[0]("행복한 일은 매일 있다고 생각한다")의 짧은 자기
    // 다짐형과는 별개 — 이건 그 원문 그대로의 인용이라 출처가 다르게 붙는다.
    phrase: '매일 행복하진 않지만, 행복한 일은 매일 있어.',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
  {
    // EXAMPLE_PHRASES[2]("기분 좋은 하루를 그려본다")의 짧은 자기 다짐형과는
    // 별개 — 이건 그 원문 그대로의 인용이라 출처가 다르게 붙는다.
    phrase: '기분 좋은 하루를 보내는 모습을 짧게 떠올리며 오늘 하루 다 잘될 거라고 마음속으로 확신한다.',
    isRecommended: true,
    source: '나는 아침마다 삶의 감각을 깨운다',
  },
  {
    phrase: '나의 선택이 옳다는 생각이 들 때는, 남의 말은 그저 흘려보내는 것이 어떨까요?',
    isRecommended: true,
    source: '곰돌이 푸, 행복한 일은 매일 있어',
  },
];

// 항상 1·2·3 순서 그대로 뜨면 "다른 사람들의 아침"인데도 짜여진 것처럼
// 보인다는 피드백 — 매번 순서를 섞어서, 셋 중 뭐가 먼저 나올지 매 방문마다
// 달라지게 한다 (Fisher–Yates).
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 실제 유저 항목은 "닉네임 · N일째"를, 추천 항목은 가짜 활동을 안 만들고
// 출처가 있으면 "『책 제목』 中", 없으면 "단단이 추천"이라고 표시한다.
const metaLabel = (it) => {
  if (it.isRecommended) {
    return it.source ? `『${it.source}』 中` : '단단이 추천';
  }
  return `${it.nickname} · ${it.logged_days === 0 ? '오늘부터' : `${it.logged_days}일째`}`;
};

// 카드 자체가 쌓인 더미에서 빠져나가고 새 카드가 그 자리로 올라오는 것처럼 보이게 한다.
// 뒤에 쌓인 카드 가장자리(box-shadow)는 "다음 것이 있다"를 진행바 없이도 항상 보여준다.
const CARD_MS = 550; // 카드가 빠지고 들어오는 전환 속도 — 360ms는 너무 빨라 550ms로
const DWELL_MS = 8000; // 다음 문구로 넘어가기 전 한 문구를 보여주는 시간 — 4.5s → 6.5s → 8s

const CommunityTicker = ({ onUseCommunityPhrase, hasActivePhrase }) => {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | exit | enter
  // 데이터가 오기 전엔 갑자기 카드가 툭 튀어나오는 대신, 같은 자리에 스켈레톤을
  // 먼저 보여준다. 추천 문구 2개는 항상 있어서, 이제 실제 커뮤니티 데이터가
  // 하나도 없거나 요청이 실패해도 티커 자체가 사라지지는 않는다.
  const [status, setStatus] = useState('loading'); // loading | ready
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null); // 목록에서 고른 문구(확인 화면으로 전환)
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(null);

  const closeSheet = () => {
    setOpen(false);
    setSelected(null);
    setApplyError(null);
  };

  const handleConfirmUse = async () => {
    if (!selected || applying) return;
    setApplying(true);
    setApplyError(null);
    try {
      await onUseCommunityPhrase(selected.phrase);
      closeSheet();
    } catch (err) {
      setApplyError(err.message || '문구를 시작하지 못했어요. 다시 시도해주세요.');
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    const fetchCommunity = async () => {
      let list = [];
      try {
        const response = await fetch(`${API_URL}/api/phrases/community`, {
          headers: { 'X-User-ID': getUserId() },
        });
        if (response.ok) {
          const data = await response.json();
          list = data.items || [];
        }
      } catch (err) {
        // 티커는 부가 기능이라 실제 데이터 요청이 실패해도 조용히 무시하고
        // 추천 문구만이라도 보여준다 (아래에서 항상 합쳐진다).
      }
      setItems([...shuffle(RECOMMENDED_ITEMS), ...list]);
      setStatus('ready');
      // 처음 나타날 때도 스택 회전과 같은 "뒤쪽에서 떠올라 자리 잡는" 모션을
      // 그대로 태워서, 로딩 끝나자마자 뚝 떨어지듯 보이지 않게 한다.
      setPhase('enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('idle'));
      });
    };
    fetchCommunity();
  }, []);

  useEffect(() => {
    // 전체 목록을 보는 중엔 뒤에서 카드가 계속 넘어가지 않게 잠시 멈춘다.
    if (items.length < 2 || open) return undefined;
    const timer = setInterval(() => {
      setPhase('exit');
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setPhase('enter');
        // enter는 transition 없이 스택 뒤쪽(아래·오른쪽, 축소)에서 순간 대기시킨 뒤,
        // 다음 프레임에 idle로 되돌려 "쌓인 곳에서 앞으로 올라오는" 애니메이션을 태운다.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setPhase('idle'));
        });
      }, CARD_MS);
    }, DWELL_MS);
    return () => clearInterval(timer);
  }, [items, open]);

  if (status === 'loading') {
    // 되새기기 버튼과 확실히 떨어져 보이도록 (기존 mt:3에서 늘림)
    return (
      <Box sx={{ mt: 7, maxWidth: 260, width: '100%' }}>
        <Box
          sx={{
            textAlign: 'left',
            borderRadius: '14px',
            border: '1px solid #e8dcc6',
            background: 'rgba(255,255,255,0.85)',
            padding: '14px 16px 12px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mb: 1 }}>
            <Box sx={{ display: 'flex' }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: '#c9b79c',
                    border: '1.5px solid #f8f1e6',
                    marginLeft: i === 0 ? 0 : '-4px',
                  }}
                />
              ))}
            </Box>
            <Typography sx={{ fontFamily: SANS, fontSize: '0.66rem', color: '#8c8578' }}>
              다른 사람들의 아침
            </Typography>
          </Box>
          <Skeleton variant="text" sx={{ fontSize: '0.82rem', bgcolor: '#ecdfc7' }} width="88%" />
          <Skeleton variant="text" sx={{ fontSize: '0.68rem', bgcolor: '#ecdfc7' }} width="42%" />
        </Box>
      </Box>
    );
  }

  const item = items[index];
  const hasStack = items.length > 1;

  const cardTransform = {
    exit: 'translate(-18px, -12px) scale(0.98) rotate(-5deg)',
    enter: 'translate(14px, 18px) scale(0.9) rotate(3deg)',
    idle: 'translate(0, 0) scale(1) rotate(0deg)',
  }[phase];

  return (
    <Box
      sx={{
        // VariantA Scene 안에서 제일 큰 내부 간격은 ticks→버튼 mb:4(32px). 이 카드는
        // "다른 섹션"이니 그보다 확실히 더 떨어뜨려서 32px보다 큰 값(56px)으로 잡음.
        mt: 7,
        maxWidth: 260,
        width: '100%',
        // 뒤에 쌓인 카드 가장자리를 box-shadow 두 겹으로 흉내 낸다 — 문구 길이가
        // 바뀌어도 카드 높이에 자동으로 맞춰지고, 실제 DOM을 더 만들 필요가 없다.
        boxShadow: hasStack
          ? '7px 9px 0 0 #f3e7d6, 14px 18px 0 0 #ecdfc7, 0 10px 24px rgba(60,40,10,0.06)'
          : 'none',
      }}
    >
      <Box
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(true); }}
        sx={{
          textAlign: 'left',
          borderRadius: '14px',
          border: '1px solid #e8dcc6',
          background: 'rgba(255,255,255,0.85)',
          padding: '14px 16px 12px',
          cursor: 'pointer',
          transform: cardTransform,
          opacity: phase === 'idle' ? 1 : 0,
          transition: phase === 'enter' ? 'none' : `transform ${CARD_MS}ms cubic-bezier(.22,.68,.35,1), opacity ${CARD_MS}ms ease`,
          '@media (prefers-reduced-motion: reduce)': { transform: 'none', transition: 'opacity 0.3s ease' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mb: 1 }}>
          <Box sx={{ display: 'flex' }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#c9b79c',
                  border: '1.5px solid #f8f1e6',
                  marginLeft: i === 0 ? 0 : '-4px',
                  // 스택 대상이 1명뿐이라 카드가 안 바뀌는 순간에도, 이 점만은 계속
                  // 살아있다는 신호를 줘야 해서 items.length 조건 없이 항상 돈다.
                  animation: `ticker-pulse 1.6s ease-in-out ${i * 0.2}s infinite`,
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  '@keyframes ticker-pulse': {
                    '0%, 100%': { opacity: 0.55, transform: 'scale(0.85)' },
                    '50%': { opacity: 1, transform: 'scale(1)' },
                  },
                }}
              />
            ))}
          </Box>
          <Typography sx={{ fontFamily: SANS, fontSize: '0.66rem', color: '#8c8578', flex: 1 }}>
            다른 사람들의 아침
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: '0.62rem', color: '#a9603a' }}>
            모두 보기 ›
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: '0.82rem',
            color: '#6b5a4a',
            lineHeight: 1.55,
            mb: 0.5,
          }}
        >
          “{item.phrase}”
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: '0.68rem', fontWeight: item.isRecommended ? 700 : 400, color: item.isRecommended ? '#a9603a' : '#a39a89' }}>
          {metaLabel(item)}
        </Typography>
        {hasStack && (
          // 곧 다음 카드로 바뀐다는 걸 채워지는 진행바로 미리 알려준다 — 스택은 "더
          // 있다"를, 이 바는 "언제 바뀌는지"를 맡는다.
          <Box sx={{ mt: 1.25, height: 2, borderRadius: 1, background: '#ecdfc7', overflow: 'hidden' }}>
            <Box
              key={index}
              sx={{
                height: '100%',
                background: '#c98354',
                width: '0%',
                animation: `ticker-progress ${DWELL_MS}ms linear forwards`,
                '@media (prefers-reduced-motion: reduce)': { animation: 'none', width: '55%' },
                '@keyframes ticker-progress': { from: { width: '0%' }, to: { width: '100%' } },
              }}
            />
          </Box>
        )}
      </Box>

      <Drawer
        anchor="bottom"
        open={open}
        onClose={closeSheet}
        PaperProps={{
          sx: {
            borderRadius: '18px 18px 0 0',
            background: '#fdf9f2',
            backgroundImage: 'none',
            maxHeight: '75vh',
            // 하단 탭바(고정, zIndex: appBar=1100)보다 시트가 항상 위에 뜨도록 —
            // Drawer의 기본 zIndex(modal=1300)가 이미 더 높아서 열리면 탭바를 자연스럽게 덮는다.
            paddingBottom: 'env(safe-area-inset-bottom)',
          },
        }}
      >
        <Box sx={{ width: 34, height: 4, borderRadius: 2, background: '#ddceb9', margin: '10px auto 4px' }} />

        {selected ? (
          <Box sx={{ padding: '4px 20px 28px', textAlign: 'left' }}>
            <Typography
              onClick={() => { setSelected(null); setApplyError(null); }}
              sx={{ fontFamily: SANS, fontSize: '0.78rem', color: '#a9603a', cursor: 'pointer', display: 'inline-block', mb: 2 }}
            >
              ‹ 목록으로
            </Typography>
            <Typography
              sx={{
                fontFamily: SERIF, fontWeight: 700, fontSize: '1.2rem', color: '#322f29', lineHeight: 1.45, mb: 0.75,
              }}
            >
              “{selected.phrase}”
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: '0.72rem', fontWeight: selected.isRecommended ? 700 : 400, color: selected.isRecommended ? '#a9603a' : '#8c8578', mb: 2.5 }}>
              {metaLabel(selected)}
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: '0.8rem', color: '#6b6355', lineHeight: 1.7, mb: 2 }}>
              {hasActivePhrase
                ? '지금 되새기는 문구는 그만두고, 이 문구로 다시 시작해요.'
                : '이 문구로 오늘부터 시작해요.'}
            </Typography>
            {applyError && (
              <Typography sx={{ fontFamily: SANS, fontSize: '0.74rem', color: '#c0503f', mb: 1.5 }}>
                {applyError}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Button
                disabled={applying}
                onClick={handleConfirmUse}
                sx={{
                  fontFamily: SERIF, fontSize: '0.88rem', fontWeight: 400, textTransform: 'none',
                  color: '#a9603a', border: '1.4px solid #c98354', borderRadius: '999px', padding: '8px 22px',
                  minWidth: 'auto', minHeight: 'auto', lineHeight: 'normal',
                  '&:hover': { background: 'rgba(201,131,84,0.08)' },
                  '&.Mui-disabled': { color: '#8c8578', border: '1.4px solid #cabfa9' },
                }}
              >
                {applying ? <CircularProgress size={16} /> : '이 문구로 시작할게요'}
              </Button>
              <Typography
                onClick={() => !applying && setSelected(null)}
                sx={{ fontFamily: SANS, fontSize: '0.78rem', color: '#a39a89', cursor: 'pointer' }}
              >
                취소
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            <Box sx={{ padding: '10px 20px 4px' }}>
              <Typography sx={{ fontFamily: SANS, fontSize: '0.9rem', fontWeight: 700, color: '#4a4437' }}>
                다른 사람들의 아침 · {items.length}
              </Typography>
            </Box>
            <Box sx={{ overflowY: 'auto', padding: '4px 20px 24px' }}>
              {items.map((it, i) => (
                <Box
                  key={`${it.nickname}-${i}`}
                  onClick={() => setSelected(it)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(it); }}
                  sx={{
                    position: 'relative',
                    padding: '14px 4px 14px 14px',
                    borderTop: i === 0 ? 'none' : '1px solid #ecdfc7',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    // 목록은 아이콘·사진 없이 텍스트뿐이라, 왼쪽 강조선으로 각 줄을 분리해
                    // "이건 별개의 문장이다"를 형태로도 보여준다.
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '16px',
                      bottom: '16px',
                      width: '2.5px',
                      borderRadius: '2px',
                      background: '#c98354',
                    },
                    '&:hover': { background: 'rgba(201,131,84,0.06)' },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: '#322f29',
                      lineHeight: 1.4,
                      mb: 0.5,
                    }}
                  >
                    “{it.phrase}”
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontWeight: it.isRecommended ? 700 : 500, fontSize: '0.72rem', color: it.isRecommended ? '#a9603a' : '#8c8578' }}>
                    {metaLabel(it)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
};

export default CommunityTicker;
