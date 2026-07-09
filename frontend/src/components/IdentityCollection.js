import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogContent, Typography } from '@mui/material';
import { getUserId } from '../utils/userId';
import { isAuthenticated, getAuthHeaders, getSessionToken } from '../utils/auth';
import AuthModal from './AuthModal';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const CHARACTER_IMAGES = {
  START: '/assets/images/dandani-character/character-coding.png',
  CALM: '/assets/images/dandani-character/character-breathing.png',
  FOCUS: '/assets/images/dandani-character/character-coding.png',
  MOVE: '/assets/images/dandani-character/character-hiking.png',
  RELEASE: '/assets/images/dandani-character/character-writing.png',
  REFLECT: '/assets/images/dandani-character/character-camping.png',
  DEFAULT: '/assets/images/dandani-character/character-default.png',
};

const IdentityCollection = () => {
  const [collection, setCollection] = useState([]);
  const [cycleCount, setCycleCount] = useState(0);
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchData = () => {
    const userId = getUserId();
    const headers = { 'X-User-ID': userId, ...getAuthHeaders() };
    return Promise.all([
      fetch(`${API_URL}/api/identity/collection`, { headers })
        .then((r) => r.json())
        .then((d) => (d.success ? d.data : [])),
      fetch(`${API_URL}/api/identity/eligibility`, { headers })
        .then((r) => r.json()),
    ]).then(([col, eli]) => {
      setCollection(col);
      setCycleCount(eli.cycle_count || 0);
      setEligible(eli.eligible || false);
    });
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasDandani = collection.length > 0;

  const handleCtaClick = async () => {
    if (!eligible) {
      setHintOpen(true);
      return;
    }
    if (!isAuthenticated()) {
      setAuthModalOpen(true);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/identity/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId(), ...getAuthHeaders() },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) setPreview(data.data);
    } catch {}
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!preview) return;
    await fetch(`${API_URL}/api/identity/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId(), ...getAuthHeaders() },
      body: JSON.stringify(preview),
    }).catch(() => {});
    setPreview(null);
    fetchData();
  };

  const handleSkip = () => setPreview(null);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // CTA button config
  let ctaLabel, ctaVariant, ctaColor, ctaSx;
  if (!eligible) {
    ctaLabel = `🔒 나만의 단단이 만들기  (${cycleCount} / 3)`;
    ctaVariant = 'contained';
    ctaColor = undefined;
    ctaSx = {
      bgcolor: 'grey.200',
      color: 'grey.600',
      '&:hover': { bgcolor: 'grey.300' },
      boxShadow: 'none',
    };
  } else if (!hasDandani) {
    ctaLabel = '✨ 나만의 단단이 만들기';
    ctaVariant = 'contained';
    ctaColor = 'primary';
    ctaSx = {};
  } else {
    ctaLabel = '+ 새로운 단단이 만들기';
    ctaVariant = 'outlined';
    ctaColor = 'primary';
    ctaSx = {};
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {!hasDandani && (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src={CHARACTER_IMAGES.DEFAULT}
            alt="단단이"
            sx={{
              width: '100%',
              maxHeight: 200,
              objectFit: 'cover',
              borderRadius: 3,
              mb: 2,
              opacity: 0.45,
            }}
          />
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            아직 너만의 단단이가 없어.
          </Typography>
        </Box>
      )}

      <Button
        fullWidth
        variant={ctaVariant}
        color={ctaColor}
        size="large"
        onClick={handleCtaClick}
        disabled={generating}
        sx={{ mb: 3, ...ctaSx }}
      >
        {generating ? <CircularProgress size={20} /> : ctaLabel}
      </Button>

      {hasDandani && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
            나의 시간들
          </Typography>
          {collection.map((item) => {
            const imageSrc = CHARACTER_IMAGES[item.dominant_action] || CHARACTER_IMAGES.DEFAULT;
            const date = new Date(item.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            return (
              <Box key={item.id} sx={{ mb: 3 }}>
                <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden' }}>
                  <Box
                    component="img"
                    src={imageSrc}
                    alt={item.title}
                    sx={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                      px: 2.5, py: 2,
                    }}
                  >
                    <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                      {item.title}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ px: 0.5, pt: 1 }}>
                  <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                  <Typography variant="caption" color="text.disabled">{date}</Typography>
                </Box>
              </Box>
            );
          })}
        </>
      )}

      {/* Locked hint dialog */}
      <Dialog open={hintOpen} onClose={() => setHintOpen(false)}>
        <DialogContent sx={{ textAlign: 'center', py: 3, px: 4 }}>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
            조금만 더 쌓이면 만들 수 있어.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            한 걸음을 {3 - cycleCount}번 더 완료하면{'\n'}너만의 단단이가 생겨.
          </Typography>
          <Button variant="contained" onClick={() => setHintOpen(false)}>
            알았어
          </Button>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      {preview && (
        <Dialog open fullWidth maxWidth="sm" onClose={handleSkip}>
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ position: 'relative' }}>
              <Box
                component="img"
                src={CHARACTER_IMAGES[preview.dominant_action] || CHARACTER_IMAGES.DEFAULT}
                alt={preview.title}
                sx={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                  px: 3, py: 2,
                }}
              >
                <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.2rem' }}>
                  {preview.title}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ px: 3, py: 2.5 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5, textAlign: 'center' }}>
                {preview.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button fullWidth variant="outlined" onClick={handleSkip}>
                  나중에
                </Button>
                <Button fullWidth variant="contained" color="primary" onClick={handleSave}>
                  저장할게
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </Box>
  );
};

export default IdentityCollection;
