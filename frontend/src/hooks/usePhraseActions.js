import { useState, useEffect, useRef } from 'react';
import { savePhrase, logPhraseToday } from '../utils/phraseApi';
import { logPhraseExampleUsed, logPhraseDayLogged } from '../utils/analytics';

function useSavePhrase(resource) {
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const commit = async text => {
    if (busy.current) throw new Error('문장을 저장하고 있어요. 잠시 기다려 주세요.');
    busy.current = true;
    setSubmitting(true);
    try {
      await savePhrase(text, resource.phrase?.id);
      return await resource.refresh();
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };
  return { submitting, commit };
}

export function usePhraseEditor(resource, { isEditing, onEditingChange }) {
  const [inputValue, setInputValue] = useState('');
  const { submitting, commit } = useSavePhrase(resource);
  useEffect(() => {
    if (isEditing && resource.phrase) setInputValue(resource.phrase.phrase);
  }, [isEditing, resource.phrase]);
  const onExampleSelect = example => {
    logPhraseExampleUsed(example);
    setInputValue(example);
  };
  const onSubmit = async () => {
    if (!inputValue.trim() || submitting) return;
    resource.setError(null);
    try {
      if (await commit(inputValue)) {
        setInputValue('');
        onEditingChange(false);
      }
    } catch (error) {
      resource.setError(error.message);
    }
  };
  const onUseCommunityPhrase = async text => {
    if (typeof text !== 'string' || !text.trim()) return;
    if (!(await commit(text))) throw new Error('문장은 저장됐지만 다시 불러오지 못했어요. 새로고침해 주세요.');
  };
  return { inputValue, setInputValue, submitting, onSubmit, onExampleSelect, onUseCommunityPhrase };
}

export function usePhraseLogging(resource) {
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
