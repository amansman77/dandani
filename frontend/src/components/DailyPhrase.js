import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { getUserId } from '../utils/userId';
import { getClientTimeHeaders } from '../utils/clientTime';
import VariantA from './phraseVariants/VariantA';
import Loader from './Loader';
import PhrasePicker from './PhrasePicker';
import { logPhraseOnboardingShown, logPhraseExampleUsed, logPhraseDayLogged } from '../utils/analytics';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

// 디자인 시안 A/B/C 중 현재는 A(새벽 편지)만 사용 중.
// B/C는 frontend/src/components/phraseVariants/ 에 완성된 상태로 대기.
const ActiveVariant = VariantA;

const DailyPhrase = ({ onViewHistory, isEditing, onEditingChange, onActivePhraseChange }) => {
  const [phrase, setPhrase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logging, setLogging] = useState(false);

  const fetchActivePhrase = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/phrases/active`, {
        // 서버가 "오늘 이미 되새겼는지"를 내 로컬 자정 기준으로 판단하도록.
        headers: { 'X-User-ID': getUserId(), ...getClientTimeHeaders() },
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

  // 편집 버튼이 헤더(안내 버튼 옆)로 옮겨가면서, "편집 시작"이 이제 App 쪽에서
  // isEditing을 true로 뒤집는 걸로 온다. 여기서는 그 순간 입력창에 지금 문구를
  // 미리 채워 넣는 것만 담당한다.
  useEffect(() => {
    if (isEditing && phrase) {
      setInputValue(phrase.phrase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // 헤더의 편집·공유 버튼이 활성 문구에 따라 달라져서, 문구 자체를 App으로
  // 올려보낸다(공유는 문장과 기록 값이 필요해서 불리언으론 부족하다).
  useEffect(() => {
    if (onActivePhraseChange) onActivePhraseChange(phrase || null);
  }, [phrase, onActivePhraseChange]);

  const handleExampleSelect = (example) => {
    logPhraseExampleUsed(example);
    setInputValue(example);
  };

  // 기존 활성 문구가 있으면 retire 먼저, 없으면 바로 create. 새 문구 등록 경로가
  // 여기 하나로 모여서 handleSubmit(수정 폼 제출)과 handleUseCommunityPhrase(커뮤니티
  // 문구 채택) 둘 다 재사용한다.
  // 'browse'(고르기) | 'write'(직접 쓰기). 처음 온 사람은 고르기부터 본다.
  // 고른 뒤에도 write로 넘어가 그 문장을 고칠 수 있다.
  const [entryMode, setEntryMode] = useState('browse');
  // 이 문장을 어떻게 얻었는지 — 고른 그대로인지, 고쳐 썼는지, 처음부터 쓴 건지.
  // 고르기가 문턱은 낮추면서 애착까지 낮추는지 보려면 이 구분이 있어야 한다.
  const [pickedText, setPickedText] = useState(null);

  const startSource = (text) => {
    if (pickedText === null) return 'written';
    return text.trim() === pickedText.trim() ? 'picked' : 'picked_edited';
  };

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
      body: JSON.stringify({ phrase: text.trim(), source: startSource(text) }),
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
      onEditingChange(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogToday = async () => {
    if (!phrase || logging) return;
    setLogging(true);
    try {
      const response = await fetch(`${API_URL}/api/phrases/${phrase.id}/log`, {
        method: 'POST',
        // 몇 월 며칠로 기록할지를 서버가 내 로컬 자정 기준으로 정하도록.
        headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId(), ...getClientTimeHeaders() },
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
    setPickedText(text);
    await commitNewPhrase(text);
  };

  // 목록에서 고르면 바로 시작하지 않고, 그 문장을 입력칸에 담아 쓰기 화면으로.
  // 그대로 시작해도 되고 고쳐도 된다.
  const handlePickPhrase = (text) => {
    setPickedText(text);
    setInputValue(text);
    setEntryMode('write');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  // 활성 문구가 없고, 고치는 중도 아니고, 아직 직접 쓰기를 고르지도 않았다면
  // 빈 칸 대신 고를 수 있는 문장들을 먼저 보여준다.
  if (!phrase && !isEditing && entryMode === 'browse') {
    return (
      <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
        <PhrasePicker
          onPick={handlePickPhrase}
          onWriteOwn={() => { setPickedText(null); setInputValue(''); setEntryMode('write'); }}
        />
      </Box>
    );
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
        cameFromPicker={pickedText !== null}
        onBackToPicker={() => { setPickedText(null); setInputValue(''); setEntryMode('browse'); }}
        hasActivePhrase={Boolean(phrase)}
        isEditing={isEditing}
      />
    </Box>
  );
};

export default DailyPhrase;
