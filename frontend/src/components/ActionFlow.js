import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, IconButton, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { getUserId } from '../utils/userId';
import ActionDispatcher from './action-types/ActionDispatcher';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const CHARACTER_IMAGES = {
  START: '/assets/images/dandani-character/character-coding.png',
  CALM: '/assets/images/dandani-character/character-breathing.png',
  FOCUS: '/assets/images/dandani-character/character-coding.png',
  MOVE: '/assets/images/dandani-character/character-hiking.png',
  RELEASE: '/assets/images/dandani-character/character-writing.png',
  REFLECT: '/assets/images/dandani-character/character-camping.png',
  DEFAULT: '/assets/images/dandani-character/단단이.png',
};

const STEPS = {
  CURRENT_INPUT: 'current_input',
  DESIRED_INPUT: 'desired_input',
  SUGGESTING: 'suggesting',
  ACTION_ACTIVE: 'action_active',
  RESULT_SELECT: 'result_select',
  FEELING_INPUT: 'feeling_input',
  REFLECTING: 'reflecting',
  DONE: 'done',
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
  const [greetingSceneType, setGreetingSceneType] = useState('DEFAULT');

  useEffect(() => {
    fetch(`${API_URL}/api/action-flow/greeting`, {
      headers: { 'X-User-ID': getUserId() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.greeting) setGreeting(data.greeting);
        if (data.scene_type) setGreetingSceneType(data.scene_type);
      })
      .catch(() => {});
  }, []);

  const isLoading = [STEPS.SUGGESTING, STEPS.REFLECTING].includes(step);
  const showTextInput = [STEPS.CURRENT_INPUT, STEPS.DESIRED_INPUT, STEPS.FEELING_INPUT].includes(step);

  const sceneImage =
    [STEPS.RESULT_SELECT, STEPS.FEELING_INPUT, STEPS.REFLECTING, STEPS.DONE].includes(step)
      ? (CHARACTER_IMAGES[session.actionType] || CHARACTER_IMAGES.DEFAULT)
      : (CHARACTER_IMAGES[greetingSceneType] || CHARACTER_IMAGES.DEFAULT);

  const overlayText =
    step === STEPS.CURRENT_INPUT ? greeting :
    step === STEPS.DESIRED_INPUT ? '그럼 어떻게 되고 싶어?' :
    step === STEPS.SUGGESTING ? '같이 생각해볼게...' :
    step === STEPS.RESULT_SELECT ? '어땠어?' :
    step === STEPS.FEELING_INPUT ? '하고 나니까 어때?' :
    step === STEPS.REFLECTING ? '잠깐, 같이 정리해볼게...' :
    step === STEPS.DONE ? doneText : '';

  const placeholder =
    step === STEPS.CURRENT_INPUT ? '지금 어떤 상태인지 써줘...' :
    step === STEPS.DESIRED_INPUT ? '어떻게 되고 싶은지 써줘...' :
    '느낌을 한 줄로...';

  const handleCurrentStateSubmit = () => {
    const value = inputText.trim();
    if (!value) return;
    setSession((prev) => ({ ...prev, currentState: value }));
    setInputText('');
    setStep(STEPS.DESIRED_INPUT);
  };

  const handleDesiredStateSubmit = async () => {
    const value = inputText.trim();
    if (!value) return;
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

    setTimeout(() => setStep(STEPS.DONE), 1200);
  };

  const handleRestart = () => {
    setSession(initialSession);
    setInputText('');
    setDoneText('오늘도 한 걸음 했어.');
    setStep(STEPS.CURRENT_INPUT);
    fetch(`${API_URL}/api/action-flow/greeting`, {
      headers: { 'X-User-ID': getUserId() },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.greeting) setGreeting(data.greeting);
        if (data.scene_type) setGreetingSceneType(data.scene_type);
      })
      .catch(() => {});
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (step === STEPS.CURRENT_INPUT) handleCurrentStateSubmit();
      else if (step === STEPS.DESIRED_INPUT) handleDesiredStateSubmit();
      else if (step === STEPS.FEELING_INPUT) handleFeelingSubmit();
    }
  };

  const handleSend = () => {
    if (step === STEPS.CURRENT_INPUT) handleCurrentStateSubmit();
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

      {step === STEPS.DONE && (
        <Button fullWidth variant="contained" color="primary" size="large" onClick={handleRestart}>
          다시 시작하기
        </Button>
      )}
    </SceneLayout>
  );
};

export default ActionFlow;
