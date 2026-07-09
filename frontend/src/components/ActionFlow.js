import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, IconButton, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getUserId } from '../utils/userId';
import { isAuthenticated, getAuthHeaders } from '../utils/auth';
import ActionDispatcher from './action-types/ActionDispatcher';
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

const STEPS = {
  NAME_INPUT: 'name_input',
  CURRENT_INPUT: 'current_input',
  DESIRED_INPUT: 'desired_input',
  SUGGESTING: 'suggesting',
  ACTION_ACTIVE: 'action_active',
  RESULT_SELECT: 'result_select',
  FEELING_INPUT: 'feeling_input',
  REFLECTING: 'reflecting',
  DONE: 'done',
  IDENTITY_GENERATING: 'identity_generating',
  IDENTITY_PREVIEW: 'identity_preview',
};

const RESULT_MAP = {
  '못했어': { started: false, completed: false },
  '조금 했어': { started: true, completed: false },
  '해냈어': { started: true, completed: true },
};

const initialSession = {
  currentState: '',
  desiredState: '',
  suggestedAction: null,
  actionType: null,
  actionMessage: '',
  emotionVector: null,
  result: '',
  started: false,
  completed: false,
  afterFeeling: '',
};

async function detectNameFromLLM(apiUrl, text) {
  if (!text || text.length > 60) return null;
  try {
    const res = await fetch(`${apiUrl}/api/action-flow/detect-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data.name || null;
  } catch {
    return null;
  }
}

// 받침 여부에 따라 자연스러운 호격 형태 반환 (예: "호성" → "호성이", "지수" → "지수")
function toVocative(name) {
  if (!name) return name;
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return name;
  return (code - 0xAC00) % 28 !== 0 ? name + '이' : name;
}

const SceneLayout = ({ imageSrc, overlayText, isLoading, children }) => (
  <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', p: 2 }}>
    <Box sx={{ position: 'relative', width: '100%', mb: 2 }}>
      <Box
        component="img"
        src={imageSrc}
        alt="단단이"
        sx={{
          width: '100%',
          height: '55vh',
          maxHeight: 420,
          objectFit: 'cover',
          borderRadius: 3,
          display: 'block',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
          borderRadius: '0 0 12px 12px',
          px: 3, py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {isLoading && <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.8)' }} />}
        <Typography
          variant="h6"
          sx={{ color: 'white', textAlign: 'center', fontWeight: 500, lineHeight: 1.4 }}
        >
          {overlayText}
        </Typography>
      </Box>
    </Box>
    {children}
  </Box>
);

const ActionFlow = () => {
  const [step, setStep] = useState(STEPS.CURRENT_INPUT);
  const [inputText, setInputText] = useState('');
  const [session, setSession] = useState(initialSession);
  const [doneText, setDoneText] = useState('오늘도 한 걸음 했어.');
  const [greeting, setGreeting] = useState('왔구나. 지금 어떤 상태야?');
  const [greetingSceneType, setGreetingSceneType] = useState(
    () => localStorage.getItem('dandaniLastSceneType') || 'DEFAULT'
  );
  const [userName, setUserName] = useState(() => localStorage.getItem('dandaniUserName') || '');
  const [identityEligible, setIdentityEligible] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [generatedIdentity, setGeneratedIdentity] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchGreeting = () => {
    fetch(`${API_URL}/api/action-flow/greeting`, {
      headers: { 'X-User-ID': getUserId() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.greeting) setGreeting(data.greeting);
        if (data.scene_type) {
          setGreetingSceneType(data.scene_type);
          localStorage.setItem('dandaniLastSceneType', data.scene_type);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    const storedName = localStorage.getItem('dandaniUserName');
    if (!storedName) {
      setStep(STEPS.NAME_INPUT);
    } else {
      fetchGreeting();
    }
    fetch(`${API_URL}/api/identity/eligibility`, { headers: { 'X-User-ID': getUserId() } })
      .then((r) => r.json())
      .then((data) => {
        setIdentityEligible(data.eligible || false);
        setCycleCount(data.cycle_count || 0);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = [STEPS.SUGGESTING, STEPS.REFLECTING, STEPS.IDENTITY_GENERATING].includes(step);
  const showTextInput = [STEPS.NAME_INPUT, STEPS.CURRENT_INPUT, STEPS.DESIRED_INPUT, STEPS.FEELING_INPUT].includes(step);

  const sceneImage =
    [STEPS.RESULT_SELECT, STEPS.FEELING_INPUT, STEPS.REFLECTING, STEPS.DONE].includes(step)
      ? (CHARACTER_IMAGES[session.actionType] || CHARACTER_IMAGES.DEFAULT)
      : step === STEPS.IDENTITY_GENERATING || step === STEPS.IDENTITY_PREVIEW
      ? (CHARACTER_IMAGES[generatedIdentity?.dominant_action] || CHARACTER_IMAGES.DEFAULT)
      : (CHARACTER_IMAGES[greetingSceneType] || CHARACTER_IMAGES.DEFAULT);

  const overlayText =
    step === STEPS.NAME_INPUT ? '나는 단단이야.\n너를 어떻게 부르면 좋을까?' :
    step === STEPS.CURRENT_INPUT ? greeting :
    step === STEPS.DESIRED_INPUT ? '그럼 어떻게 되고 싶어?' :
    step === STEPS.SUGGESTING ? '같이 생각해볼게...' :
    step === STEPS.RESULT_SELECT ? '어땠어?' :
    step === STEPS.FEELING_INPUT ? '하고 나니까 어때?' :
    step === STEPS.REFLECTING ? '잠깐, 같이 정리해볼게...' :
    step === STEPS.DONE ? doneText :
    step === STEPS.IDENTITY_GENERATING ? '이 시기의 너를 담아볼게...' :
    step === STEPS.IDENTITY_PREVIEW ? (generatedIdentity?.title || '') : '';

  const placeholder =
    step === STEPS.NAME_INPUT ? '이름이나 별명을 써줘...' :
    step === STEPS.CURRENT_INPUT ? '지금 어떤 상태인지 써줘...' :
    step === STEPS.DESIRED_INPUT ? '어떻게 되고 싶은지 써줘...' :
    '느낌을 한 줄로...';

  const handleNameSubmit = () => {
    const raw = inputText.trim();
    const finalName = raw || '친구';
    localStorage.setItem('dandaniUserName', finalName);
    setUserName(finalName);
    setInputText('');
    fetch(`${API_URL}/api/user/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
      body: JSON.stringify({ name: finalName }),
    }).catch(() => {});
    fetchGreeting();
    setStep(STEPS.CURRENT_INPUT);
  };

  const applyNameChange = async (text) => {
    const newName = await detectNameFromLLM(API_URL, text);
    if (!newName) return false;
    localStorage.setItem('dandaniUserName', newName);
    setUserName(newName);
    setInputText('');
    fetch(`${API_URL}/api/user/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
      body: JSON.stringify({ name: newName }),
    }).catch(() => {});
    setGreeting(`${toVocative(newName)}! 이름 바꿔줬어. 지금 어떤 상태야?`);
    return true;
  };

  const handleCurrentStateSubmit = async () => {
    const value = inputText.trim();
    if (!value) return;
    if (await applyNameChange(value)) return;
    setSession((prev) => ({ ...prev, currentState: value }));
    setInputText('');
    setStep(STEPS.DESIRED_INPUT);
  };

  const handleDesiredStateSubmit = async () => {
    const value = inputText.trim();
    if (!value) return;
    if (await applyNameChange(value)) { setStep(STEPS.CURRENT_INPUT); return; }
    setInputText('');
    setStep(STEPS.SUGGESTING);

    const currentState = session.currentState;
    const desiredState = value;
    setSession((prev) => ({ ...prev, desiredState }));

    try {
      const res = await fetch(`${API_URL}/api/action-flow/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({ currentState, desiredState }),
      });
      const data = await res.json();
      if (!data.success) throw new Error('suggest failed');

      const { action_type, emotion_vector, message, action } = data.data;
      setSession((prev) => ({
        ...prev,
        suggestedAction: action,
        actionType: action_type || 'START',
        actionMessage: message,
        emotionVector: emotion_vector || null,
      }));
      setStep(STEPS.ACTION_ACTIVE);
    } catch {
      setDoneText('지금은 제안하기 어려워. 잠시 후 다시 시도해줄래?');
      setStep(STEPS.DONE);
    }
  };

  const handleActionComplete = () => {
    setStep(STEPS.RESULT_SELECT);
  };

  const handleResultSelect = (result) => {
    const { started, completed } = RESULT_MAP[result];
    setSession((prev) => ({ ...prev, result, started, completed }));
    setStep(STEPS.FEELING_INPUT);
  };

  const handleFeelingSubmit = async () => {
    const value = inputText.trim();
    if (!value) return;
    setInputText('');
    setStep(STEPS.REFLECTING);

    const snap = { ...session, afterFeeling: value };

    try {
      const reflectRes = await fetch(`${API_URL}/api/action-flow/reflect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({
          currentState: snap.currentState,
          desiredState: snap.desiredState,
          suggestedAction: snap.suggestedAction,
          result: snap.result,
          afterFeeling: value,
        }),
      });
      const reflectData = await reflectRes.json();
      if (!reflectData.success) throw new Error('reflect failed');

      const { reflection, nextStep, patternNote, nextHint } = reflectData.data;
      setDoneText(reflection);

      fetch(`${API_URL}/api/action-flow/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({
          currentState: snap.currentState,
          desiredState: snap.desiredState,
          suggestedAction: snap.suggestedAction,
          actionType: snap.actionType,
          emotionVector: snap.emotionVector,
          result: snap.result,
          started: snap.started,
          completed: snap.completed,
          afterFeeling: value,
          reflection,
          nextHint,
          patternNote,
        }),
      }).catch(() => {});
    } catch {
      setDoneText('오늘도 시도해줘서 고마워. 작은 한 걸음이 쌓이면 달라져.');
    }

    setTimeout(() => {
      setStep(STEPS.DONE);
      fetch(`${API_URL}/api/identity/eligibility`, { headers: { 'X-User-ID': getUserId() } })
        .then((r) => r.json())
        .then((data) => {
          setIdentityEligible(data.eligible || false);
          setCycleCount(data.cycle_count || 0);
        })
        .catch(() => {});
    }, 1200);
  };

  const handleCreateIdentity = async () => {
    if (!identityEligible) {
      setGreeting('한 걸음만 더 하면 너만의 단단이를 만들 수 있어!');
      return;
    }
    if (!isAuthenticated()) {
      setAuthModalOpen(true);
      return;
    }
    const sourceStep = step;
    setStep(STEPS.IDENTITY_GENERATING);
    try {
      const res = await fetch(`${API_URL}/api/identity/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId(), ...getAuthHeaders() },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error('generate failed');
      setGeneratedIdentity({ ...data.data, _sourceStep: sourceStep });
      setStep(STEPS.IDENTITY_PREVIEW);
    } catch {
      setStep(sourceStep);
    }
  };

  const handleSaveIdentity = async () => {
    if (!generatedIdentity) return;
    const sourceStep = generatedIdentity._sourceStep || STEPS.DONE;
    const { _sourceStep, ...payload } = generatedIdentity;
    try {
      await fetch(`${API_URL}/api/identity/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId(), ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
    } catch {}
    setGeneratedIdentity(null);
    setIdentityEligible(false);
    if (sourceStep === STEPS.CURRENT_INPUT) {
      setGreeting('단단이를 저장했어. 이어서 시작해볼까?');
      setStep(STEPS.CURRENT_INPUT);
    } else {
      setDoneText('단단이를 저장했어. 컬렉션에서 볼 수 있어.');
      setStep(STEPS.DONE);
    }
  };

  const handleSkipIdentity = () => {
    const sourceStep = generatedIdentity?._sourceStep || STEPS.DONE;
    setGeneratedIdentity(null);
    setStep(sourceStep);
  };

  const handleRestart = () => {
    setSession(initialSession);
    setInputText('');
    setDoneText('오늘도 한 걸음 했어.');
    setIdentityEligible(false);
    setCycleCount(0);
    setGeneratedIdentity(null);
    setStep(STEPS.CURRENT_INPUT);
    fetchGreeting();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (step === STEPS.NAME_INPUT) handleNameSubmit();
      else if (step === STEPS.CURRENT_INPUT) handleCurrentStateSubmit();
      else if (step === STEPS.DESIRED_INPUT) handleDesiredStateSubmit();
      else if (step === STEPS.FEELING_INPUT) handleFeelingSubmit();
    }
  };

  const handleSend = () => {
    if (step === STEPS.NAME_INPUT) handleNameSubmit();
    else if (step === STEPS.CURRENT_INPUT) handleCurrentStateSubmit();
    else if (step === STEPS.DESIRED_INPUT) handleDesiredStateSubmit();
    else if (step === STEPS.FEELING_INPUT) handleFeelingSubmit();
  };

  if (step === STEPS.ACTION_ACTIVE) {
    return (
      <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', p: 2 }}>
        <ActionDispatcher
          actionType={session.actionType}
          action={session.suggestedAction}
          message={session.actionMessage}
          onComplete={handleActionComplete}
        />
      </Box>
    );
  }

  return (
    <>
    <SceneLayout imageSrc={sceneImage} overlayText={overlayText} isLoading={isLoading}>
      {showTextInput && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={placeholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={3}
            size="small"
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
            sx={{ alignSelf: 'flex-end' }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      )}

      {step === STEPS.RESULT_SELECT && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {Object.keys(RESULT_MAP).map((r) => (
            <Button key={r} variant="outlined" onClick={() => handleResultSelect(r)} sx={{ flex: 1 }}>
              {r}
            </Button>
          ))}
        </Box>
      )}

      {step === STEPS.CURRENT_INPUT && cycleCount >= 2 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            너만의 단단이를 만들 수 있어
          </Typography>
          <Button size="small" variant="outlined" onClick={handleCreateIdentity}>
            만들기
          </Button>
        </Box>
      )}

      {step === STEPS.DONE && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {cycleCount === 1 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              지금까지 한 걸음이 쌓이고 있어. 3개가 모이면 너만의 단단이를 만들 수 있어.
            </Typography>
          )}
          {cycleCount === 2 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              한 걸음만 더 하면 너만의 단단이를 만들 수 있어.
            </Typography>
          )}
          {identityEligible && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                이 흐름으로 너만의 단단이를 만들 수 있어.
              </Typography>
              <Button fullWidth variant="contained" color="primary" size="large" onClick={handleCreateIdentity}>
                ✨ 나만의 단단이 만들기
              </Button>
            </>
          )}
          <Button
            fullWidth
            variant={identityEligible ? 'outlined' : 'contained'}
            color="primary"
            size="large"
            onClick={handleRestart}
          >
            다시 시작하기
          </Button>
        </Box>
      )}

      {step === STEPS.IDENTITY_PREVIEW && generatedIdentity && (
        <Box>
          <Typography variant="body1" sx={{ mb: 2, textAlign: 'center', color: 'text.secondary' }}>
            {generatedIdentity.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button fullWidth variant="outlined" onClick={handleSkipIdentity}>
              나중에
            </Button>
            <Button fullWidth variant="contained" color="primary" onClick={handleSaveIdentity}>
              저장할게
            </Button>
          </Box>
        </Box>
      )}
    </SceneLayout>
    <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

export default ActionFlow;
