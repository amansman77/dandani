import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Chip,
  Divider,
  Fade,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';

// 단단이 캐릭터 이미지 URL
const DANDANI_CHARACTER_URL = '/assets/images/dandani-character/단단이-32x32.png';

const BUDDY_API_URL = 'https://buddy.yetimates.com';

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

const MessageBubble = styled(Box)(({ theme, isUser }) => ({
  display: 'flex',
  justifyContent: isUser ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(2),
}));

const MessageContent = styled(Paper)(({ theme, isUser }) => ({
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

const EmotionChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  '&.happy': {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
  },
  '&.sad': {
    backgroundColor: theme.palette.info.light,
    color: theme.palette.info.contrastText,
  },
  '&.angry': {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
  },
  '&.anxious': {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
  },
  '&.frustrated': {
    backgroundColor: theme.palette.grey[400],
    color: theme.palette.grey[800],
  },
  '&.tired': {
    backgroundColor: theme.palette.grey[500],
    color: theme.palette.grey[100],
  },
  '&.neutral': {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[700],
  },
}));

const ChatInterface = ({ practice, messages, setMessages, sessionId }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const emotions = [
    { label: '행복', value: 'happy', color: 'success' },
    { label: '슬픔', value: 'sad', color: 'info' },
    { label: '화남', value: 'angry', color: 'error' },
    { label: '불안', value: 'anxious', color: 'warning' },
    { label: '좌절', value: 'frustrated', color: 'default' },
    { label: '피로', value: 'tired', color: 'default' },
    { label: '보통', value: 'neutral', color: 'default' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 초기 환영 메시지 (메시지가 비어있을 때만)
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          content: '안녕! 나는 단단이야. 감정적으로 힘들 때 함께 이야기하면서 중심을 잃지 않도록 도와줄게. 오늘은 어떤 기분이야? 😊',
          isUser: false,
          timestamp: new Date(),
          emotion: null,
        }
      ]);
    }
  }, [messages.length, setMessages]);

  const handleSendMessage = async (emotion = null) => {
    if (!inputMessage.trim() && !emotion) return;

    const userMessage = {
      id: Date.now(),
      content: inputMessage || `${emotion.label}한 기분이에요`,
      isUser: true,
      timestamp: new Date(),
      emotion: emotion?.value || null,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BUDDY_API_URL}/api/chat/dandani`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          emotion: emotion?.value || null,
          sessionId: sessionId,
          service: 'dandani',
          practice: practice,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          content: data.data.message,
          isUser: false,
          timestamp: new Date(),
          emotion: data.data.emotion,
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error?.message || 'AI 응답 처리 실패');
      }
    } catch (err) {
      console.error('Chat API error:', err);
      setError(err.message);

      // 에러 메시지 추가
      const errorMessage = {
        id: Date.now() + 1,
        content: '죄송합니다. 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        isUser: false,
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      <ChatContainer>
        <MessagesContainer>
          <List>
            {messages.map((message) => (
              <ListItem key={message.id} sx={{ px: 0, py: 0.5 }}>
                <MessageBubble isUser={message.isUser}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    {!message.isUser && (
                      <Avatar 
                        src={DANDANI_CHARACTER_URL}
                        alt="단단이"
                        sx={{ width: 32, height: 32 }}
                      />
                    )}
                    <Box>
                      <MessageContent isUser={message.isUser} elevation={1}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                          {message.content}
                        </Typography>
                        {message.emotion && (
                          <Box sx={{ mt: 1 }}>
                            <EmotionChip
                              label={emotions.find(e => e.value === message.emotion)?.label || message.emotion}
                              size="small"
                              className={message.emotion}
                            />
                          </Box>
                        )}
                      </MessageContent>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mt: 0.5, display: 'block' }}>
                        {formatTime(message.timestamp)}
                      </Typography>
                    </Box>
                    {message.isUser && (
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
                    <Avatar 
                      src={DANDANI_CHARACTER_URL}
                      alt="단단이"
                      sx={{ width: 32, height: 32 }}
                    />
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

        {error && (
          <Box sx={{ px: 2, py: 1 }}>
            <Alert severity="error" sx={{ fontSize: '0.875rem' }}>
              {error}
            </Alert>
          </Box>
        )}

        <InputContainer>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              현재 감정을 선택하거나 메시지를 입력하세요:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {emotions.map((emotion) => (
                <EmotionChip
                  key={emotion.value}
                  label={emotion.label}
                  onClick={() => handleSendMessage(emotion)}
                  clickable
                  disabled={isLoading}
                  className={emotion.value}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="메시지를 입력하세요..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              multiline
              maxRows={3}
              size="small"
            />
            <IconButton
              color="primary"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              sx={{ alignSelf: 'flex-end' }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </InputContainer>
      </ChatContainer>
    </Box>
  );
};

export default ChatInterface; 