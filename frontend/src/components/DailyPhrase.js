import React, { useEffect, useState } from 'react';
import { Box, Alert, Button, Snackbar } from '@mui/material';
import VariantA from './phraseVariants/VariantA';
import Loader from './Loader';
import PhrasePicker from './PhrasePicker';
import PracticeSheet from './PracticeSheet';
import { logPhraseOnboardingShown } from '../utils/analytics';
import usePhraseResource from '../hooks/usePhraseResource';
import { usePhraseEditor, usePhraseLogging } from '../hooks/usePhraseActions';

const DailyPhrase = ({
  onViewHistory, isEditing, onEditingChange, onActivePhraseChange, onShare,
  onNuvBalanceChange, onFirstPhraseCreated,
}) => {
  const resource = usePhraseResource();
  const [entryMode, setEntryMode] = useState('browse');
  const [pickedText, setPickedText] = useState(null);
  const [notice, setNotice] = useState('');
  const [practiceOpen, setPracticeOpen] = useState(false);
  const source = pickedText === null
    ? 'written'
    : (editorText => editorText.trim() === pickedText.trim() ? 'picked' : 'picked_edited');
  const editor = usePhraseEditor(resource, {
    isEditing, onEditingChange, source, onFirstPhraseCreated,
  });
  const logging = usePhraseLogging(resource, {
    onNuvBalanceChange,
    onNuvAwarded: amount => setNotice(`되새기고 ${amount} 누브를 받았어요`),
  });
  const { phrase, loading, error, refresh } = resource;
  useEffect(() => {
    if (!loading && !error && !phrase) logPhraseOnboardingShown();
  }, [loading, error, phrase]);
  useEffect(() => {
    if (onActivePhraseChange) onActivePhraseChange(phrase || null);
  }, [phrase, onActivePhraseChange]);
  useEffect(() => {
    if (!isEditing || !phrase) return;
    setEntryMode('write');
    setPickedText(null);
  }, [isEditing, phrase]);

  if (loading && !phrase) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><Loader /></Box>;
  }
  if ((!phrase || isEditing) && entryMode === 'browse') {
    return (
      <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
        <PhrasePicker
          onPick={text => {
            setPickedText(text);
            editor.setInputValue(text);
            setEntryMode('write');
          }}
          onWriteOwn={() => {
            setPickedText(null);
            editor.setInputValue(isEditing && phrase ? phrase.phrase : '');
            setEntryMode('write');
          }}
        />
      </Box>
    );
  }
  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={refresh}>다시 불러오기</Button>}>
          {error}
        </Alert>
      )}
      <VariantA
        phrase={phrase} {...editor} {...logging}
        onViewHistory={onViewHistory} hasActivePhrase={Boolean(phrase)} isEditing={isEditing}
        onShare={onShare}
        onWritePractice={() => setPracticeOpen(true)}
        cameFromPicker={pickedText !== null}
        onBackToPicker={() => {
          setPickedText(null);
          editor.setInputValue('');
          setEntryMode('browse');
        }}
      />
      <PracticeSheet
        open={practiceOpen} onClose={() => setPracticeOpen(false)} phrase={phrase}
        onSaved={result => setNotice(result.issued
          ? '실천을 남겼어요 — 엽서가 되었어요'
          // 문턱을 못 넘어도 기록은 남았다. 사라진 게 아니라 기다린다는
          // 걸 분명히 말해줘야 다시 쓸 마음이 생긴다.
          : `실천을 남겼어요 — ${result.nuv_needed} 누브가 더 쌓이면 엽서가 돼요`)}
      />
      <Snackbar
        open={Boolean(notice)} autoHideDuration={3600} onClose={() => setNotice('')}
        message={notice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 88 } }}
      />
    </Box>
  );
};

export default DailyPhrase;
