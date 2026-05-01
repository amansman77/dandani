import React, { useState, useRef, useEffect } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import { getUserId } from '../utils/userId';
import ActionDispatcher from './action-types/ActionDispatcher';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';
const DANDANI_AVATAR = '/assets/images/dandani-character/단단이-32x32.png';

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

const ChatContainer = styled(Box)(({ theme }) => ({
  height: '70vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})(({ isUser }) => ({
  display: 'flex',
  justifyContent: isUser ? 'flex-end' : 'flex-start',
  marginBottom: 16,
}));

const MessageContent = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})(({ theme, isUser }) => ({
  maxWidth: '70%',
  padding: theme.spacing(1.5, 2),
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.background.paper,
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  wordWrap: 'break-word',
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const initialMessages = [
  { id: 0, content: '왔구나. 지금 어떤 상태야?', isUser: false }
];

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

const ActionFlow = () => {
  const [step, setStep] = useState(STEPS.CURRENT_INPUT);
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState('');
  const [session, setSession] = useState(initialSession);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMsg = (content) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), content, isUser: false }]);
  };

  const addUserMsg = (content) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), content, isUser: true }]);
  };

  const handleCurrentStateSubmit = () => {
    const value = inputText.trim();
    if (!value) return;
    addUserMsg(value);
    setSession((prev) => ({ ...prev, currentState: value }));
    setInputText('');
    setTimeout(() => {
      addBotMsg('그럼 지금은 어떻게 되고 싶어?');
      setStep(STEPS.DESIRED_INPUT);
    }, 300);
  };

  const handleDesiredStateSubmit = async () => {
    const value = inputText.trim();
    if (!value) return;
    addUserMsg(value);
    setInputText('');
    setStep(STEPS.SUGGESTING);

    const currentState = session.currentState;
    const desiredState = value;
    setSession((prev) => ({ ...prev, desiredState }));

    try {
      const res = await fetch(`${API_URL}/api/action-flow/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getUserId(),
        },
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

      // Show a brief preview in chat before switching to action UI
      const preview = [
        message,
        '',
        `💡 ${action.description}`,
        `⏱ ${action.estimated_minutes}분 이내 · ${action.completion_condition}`,
      ].join('\n');
      addBotMsg(preview);

      setStep(STEPS.ACTION_ACTIVE);
    } catch {
      addBotMsg('지금은 행동을 제안하기 어려워. 잠시 후 다시 시도해줄래?');
      setStep(STEPS.DONE);
    }
  };

  const handleActionComplete = () => {
    addBotMsg('어땠어?');
    setStep(STEPS.RESULT_SELECT);
  };

  const handleResultSelect = (result) => {
    addUserMsg(result);
    const { started, completed } = RESULT_MAP[result];
    setSession((prev) => ({ ...prev, result, started, completed }));
    setTimeout(() => {
      addBotMsg('하고 나니까 어땠어? 한 줄로 남겨줄래?');
      setStep(STEPS.FEELING_INPUT);
    }, 300);
  };

  const handleFeelingSubmit = async () => {
    const value = inputText.trim();
    if (!value) return;
    addUserMsg(value);
    setInputText('');
    setStep(STEPS.REFLECTING);

    const snap = { ...session, afterFeeling: value };

    try {
      const reflectRes = await fetch(`${API_URL}/api/action-flow/reflect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getUserId(),
        },
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

      addBotMsg(reflection);
      setTimeout(() => addBotMsg(nextStep), 800);

      fetch(`${API_URL}/api/action-flow/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getUserId(),
        },
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
      addBotMsg('오늘도 시도해줘서 고마워. 작은 한 걸음이 쌓이면 달라져.');
    }

    setTimeout(() => setStep(STEPS.DONE), 1600);
  };

  const handleRestart = () => {
    setMessages(initialMessages);
    setSession(initialSession);
    setInputText('');
    setStep(STEPS.CURRENT_INPUT);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (step === STEPS.CURRENT_INPUT) handleCurrentStateSubmit();
      else if (step === STEPS.DESIRED_INPUT) handleDesiredStateSubmit();
      else if (step === STEPS.FEELING_INPUT) handleFeelingSubmit();
    }
  };

  const showTextInput = [STEPS.CURRENT_INPUT, STEPS.DESIRED_INPUT, STEPS.FEELING_INPUT].includes(step);
  const isLoading = [STEPS.SUGGESTING, STEPS.REFLECTING].includes(step);

  const placeholder =
    step === STEPS.CURRENT_INPUT ? '지금 어떤 상태인지 써줘...' :
    step === STEPS.DESIRED_INPUT ? '어떻게 되고 싶은지 써줘...' :
    '느낌을 한 줄로...';

  const handleSend = () => {
    if (step === STEPS.CURRENT_INPUT) handleCurrentStateSubmit();
    else if (step === STEPS.DESIRED_INPUT) handleDesiredStateSubmit();
    else if (step === STEPS.FEELING_INPUT) handleFeelingSubmit();
  };

  // ACTION_ACTIVE: full-width replacement of chat UI
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
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      <ChatContainer>
        <MessagesContainer>
          <List disablePadding>
            {messages.map((msg) => (
              <ListItem key={msg.id} sx={{ px: 0, py: 0.5 }}>
                <MessageBubble isUser={msg.isUser}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {!msg.isUser && (
                      <Avatar src={DANDANI_AVATAR} alt="단단이" sx={{ width: 32, height: 32 }} />
                    )}
                    <MessageContent isUser={msg.isUser} elevation={1}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </Typography>
                    </MessageContent>
                    {msg.isUser && (
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                        <PersonIcon />
                      </Avatar>
                    )}
                  </Box>
                </MessageBubble>
              </ListItem>
            ))}

            {isLoading && (
              <ListItem sx={{ px: 0, py: 0.5 }}>
                <MessageBubble isUser={false}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={DANDANI_AVATAR} alt="단단이" sx={{ width: 32, height: 32 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">
                        단단이가 생각하고 있어요...
                      </Typography>
                    </Box>
                  </Box>
                </MessageBubble>
              </ListItem>
            )}
          </List>
          <div ref={messagesEndRef} />
        </MessagesContainer>

        <InputContainer>
          {step === STEPS.RESULT_SELECT && (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
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
        </InputContainer>
      </ChatContainer>
    </Box>
  );
};

export default ActionFlow;
