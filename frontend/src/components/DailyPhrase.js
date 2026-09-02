import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { getUserId } from '../utils/userId';
import VariantA from './phraseVariants/VariantA';
import { logPhraseOnboardingShown, logPhraseExampleUsed, logPhraseDayLogged } from '../utils/analytics';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

// 디자인 시안 A/B/C 중 현재는 A(새벽 편지)만 사용 중.
// B/C는 frontend/src/components/phraseVariants/ 에 완성된 상태로 대기.
const ActiveVariant = VariantA;

const DailyPhrase = ({ onViewHistory }) => {
  const [phrase, setPhrase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logging, setLogging] = useState(false);
  // 연필 아이콘을 누른 순간 바로 기존 문구를 지우던 것 대신, 화면만 입력 폼으로
  // 바꿔두는 클라이언트 상태. 실제 retire는 새 문구를 확정 제출할 때만 일어나서,
  // "취소"를 누르면 서버엔 아무 일도 안 일어나고 원래 문구로 그대로 돌아간다.
  const [isEditing, setIsEditing] = useState(false);

  const fetchActivePhrase = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/phrases/active`, {
        headers: { 'X-User-ID': getUserId() },
      });
      if (!response.ok) throw new Error(`Failed to fetch phrase: ${response.status}`);
      const data = await response.json();
      setPhrase(data.phrase);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePhrase();
  }, []);

  useEffect(() => {
    if (!loading && !phrase) {
      logPhraseOnboardingShown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, phrase]);

  const handleExampleSelect = (example) => {
    logPhraseExampleUsed(example);
    setInputValue(example);
  };

  // 기존 활성 문구가 있으면 retire 먼저, 없으면 바로 create. 새 문구 등록 경로가
  // 여기 하나로 모여서 handleSubmit(수정 폼 제출)과 handleUseCommunityPhrase(커뮤니티
  // 문구 채택) 둘 다 재사용한다.
  const commitNewPhrase = async (text) => {
    if (phrase) {
      const retireResponse = await fetch(`${API_URL}/api/phrases/${phrase.id}/retire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({}),
      });
      if (!retireResponse.ok) throw new Error(`Failed to retire phrase: ${retireResponse.status}`);
    }
    const response = await fetch(`${API_URL}/api/phrases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
      body: JSON.stringify({ phrase: text.trim() }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '문구 등록에 실패했습니다.');
    await fetchActivePhrase();
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await commitNewPhrase(inputValue.trim());
      setInputValue('');
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPhrase = () => {
    if (!phrase) return;
    setInputValue(phrase.phrase);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setInputValue('');
    setIsEditing(false);
  };

  const handleLogToday = async () => {
    if (!phrase || logging) return;
    setLogging(true);
    try {
      const response = await fetch(`${API_URL}/api/phrases/${phrase.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Failed to log phrase day: ${response.status}`);
      const data = await response.json();
      logPhraseDayLogged(phrase.id, data.logged_days);
      await fetchActivePhrase();
    } catch (err) {
      setError(err.message);
    } finally {
      setLogging(false);
    }
  };

  const handleRetire = async () => {
    if (!phrase) return;
    try {
      const response = await fetch(`${API_URL}/api/phrases/${phrase.id}/retire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Failed to retire phrase: ${response.status}`);
      await fetchActivePhrase();
    } catch (err) {
      setError(err.message);
    }
  };

  // 커뮤니티 목록에서 다른 사람의 문구를 골라 그대로 시작한다. 화면 전체를 에러로
  // 덮어버리는 setError는 여기서는 쓰지 않고 그대로 던진다 — 확인 UI(바텀시트) 안에서
  // 실패를 보여주고 다시 시도할 수 있어야 하기 때문.
  const handleUseCommunityPhrase = async (text) => {
    if (!text || !text.trim()) return;
    await commitNewPhrase(text);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <ActiveVariant
        phrase={phrase}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onExampleSelect={handleExampleSelect}
        submitting={submitting}
        onSubmit={handleSubmit}
        logging={logging}
        onLogToday={handleLogToday}
        onRetire={handleRetire}
        onViewHistory={onViewHistory}
        onUseCommunityPhrase={handleUseCommunityPhrase}
        hasActivePhrase={Boolean(phrase)}
        isEditing={isEditing}
        onEditPhrase={handleEditPhrase}
        onCancelEdit={handleCancelEdit}
      />
    </Box>
  );
};

export default DailyPhrase;
