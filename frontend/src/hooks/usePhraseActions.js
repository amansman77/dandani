import { useState, useEffect, useRef } from 'react';
import { savePhrase, logPhraseToday } from '../utils/phraseApi';
import { logPhraseExampleUsed, logPhraseDayLogged } from '../utils/analytics';

function useSavePhrase(resource, onFirstPhraseCreated) {
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const commit = async (text, source) => {
    if (busy.current) throw new Error('문장을 저장하고 있어요. 잠시 기다려 주세요.');
    busy.current = true;
    setSubmitting(true);
    try {
      const isFirstPhrase = !resource.phrase;
      await savePhrase(text, resource.phrase?.id, source);
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
  const { submitting, commit } = useSavePhrase(resource, onFirstPhraseCreated);
  useEffect(() => {
    if (isEditing && resource.phrase) setInputValue(resource.phrase.phrase);
  }, [isEditing, resource.phrase]);
  const onExampleSelect = example => {
    logPhraseExampleUsed(example);
    setInputValue(example);
  };
  // 문장을 바꾸면 되새김은 처음부터 다시 센다. 다른 말을 살기로 한 것이니
  // 그 문장의 날수도 거기서 시작하는 게 맞다. 누브와 이미 발행한 엽서는
  // 사람과 기록에 붙어 있어서 여기서 영향을 받지 않는다.
  const onSubmit = async () => {
    if (!inputValue.trim() || submitting) return;
    resource.setError(null);
    try {
      const resolvedSource = typeof source === 'function' ? source(inputValue) : source;
      if (await commit(inputValue, resolvedSource)) {
        setInputValue('');
        onEditingChange(false);
      }
    } catch (error) {
      resource.setError(error.message);
    }
  };

  const onUseCommunityPhrase = async text => {
    if (typeof text !== 'string' || !text.trim()) return;
    if (!(await commit(text, 'picked'))) {
      throw new Error('문장은 저장됐지만 다시 불러오지 못했어요. 새로고침해 주세요.');
    }
  };
  return { inputValue, setInputValue, submitting, onSubmit, onExampleSelect, onUseCommunityPhrase };
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
