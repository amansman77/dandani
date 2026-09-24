import { useState, useEffect, useRef } from 'react';
import { savePhrase, logPhraseToday } from '../utils/phraseApi';
import { logPhraseExampleUsed, logPhraseDayLogged } from '../utils/analytics';

function useSavePhrase(resource, onFirstPhraseCreated) {
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const commit = async (text, source, mode) => {
    if (busy.current) throw new Error('문장을 저장하고 있어요. 잠시 기다려 주세요.');
    busy.current = true;
    setSubmitting(true);
    try {
      const isFirstPhrase = !resource.phrase;
      await savePhrase(text, resource.phrase?.id, source, mode);
      const refreshed = await resource.refresh();
      if (refreshed && isFirstPhrase && onFirstPhraseCreated) onFirstPhraseCreated();
      return refreshed;
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };
  return { submitting, commit };
}

export function usePhraseEditor(resource, {
  isEditing, onEditingChange, source = 'written', onFirstPhraseCreated,
}) {
  const [inputValue, setInputValue] = useState('');
  // 되새김 기록이 걸려 있을 때만 "고칠까 바꿀까"를 묻는다. 잃을 게 없으면
  // 묻지 않는 게 맞다 — 아무 때나 물으면 그냥 한 단계 늘어난 것뿐이다.
  const [pendingText, setPendingText] = useState(null);
  const { submitting, commit } = useSavePhrase(resource, onFirstPhraseCreated);
  useEffect(() => {
    if (isEditing && resource.phrase) setInputValue(resource.phrase.phrase);
  }, [isEditing, resource.phrase]);
  const onExampleSelect = example => {
    logPhraseExampleUsed(example);
    setInputValue(example);
  };
  const finish = async (text, mode) => {
    resource.setError(null);
    try {
      const resolvedSource = typeof source === 'function' ? source(text) : source;
      if (await commit(text, resolvedSource, mode)) {
        setInputValue('');
        setPendingText(null);
        onEditingChange(false);
      }
    } catch (error) {
      resource.setError(error.message);
    }
  };

  const onSubmit = async () => {
    const text = inputValue.trim();
    if (!text || submitting) return;
    const current = resource.phrase;
    // 글자가 그대로면 아무 일도 아니다.
    if (current && current.phrase.trim() === text) {
      setInputValue('');
      onEditingChange(false);
      return;
    }
    // 되새긴 적이 있는 문장을 고쳐 쓰는 중이라면, 기록을 이어갈지 새로
    // 시작할지는 사람만 안다. 여기서 멈추고 묻는다.
    if (current && (current.logged_days || 0) > 0) {
      setPendingText(text);
      return;
    }
    await finish(text, 'replace');
  };

  const onResolveEdit = mode => finish(pendingText, mode);
  const onCancelResolve = () => setPendingText(null);
  const onUseCommunityPhrase = async text => {
    if (typeof text !== 'string' || !text.trim()) return;
    if (!(await commit(text, 'picked', 'replace'))) {
      throw new Error('문장은 저장됐지만 다시 불러오지 못했어요. 새로고침해 주세요.');
    }
  };
  return {
    inputValue, setInputValue, submitting, onSubmit, onExampleSelect, onUseCommunityPhrase,
    pendingText, onResolveEdit, onCancelResolve,
  };
}

export function usePhraseLogging(resource, { onNuvBalanceChange, onNuvAwarded } = {}) {
  const [logging, setLogging] = useState(false);
  const busy = useRef(false);
  const onLogToday = async () => {
    if (!resource.phrase || busy.current) return;
    busy.current = true;
    setLogging(true);
    resource.setError(null);
    try {
      const data = await logPhraseToday(resource.phrase.id);
      logPhraseDayLogged(resource.phrase.id, data.logged_days);
      if (onNuvBalanceChange && data.balance !== undefined) onNuvBalanceChange(data.balance);
      if (onNuvAwarded && data.awarded_nuv > 0) onNuvAwarded(data.awarded_nuv);
      await resource.refresh();
    } catch (error) {
      resource.setError(error.message);
    } finally {
      busy.current = false;
      setLogging(false);
    }
  };
  return { logging, onLogToday };
}
