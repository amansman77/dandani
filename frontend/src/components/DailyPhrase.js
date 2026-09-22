import React, { useEffect, useState } from 'react';
import { Box, Alert, Button } from '@mui/material';
import VariantA from './phraseVariants/VariantA';
import Loader from './Loader';
import PhrasePicker from './PhrasePicker';
import { logPhraseOnboardingShown } from '../utils/analytics';
import usePhraseResource from '../hooks/usePhraseResource';
import { usePhraseEditor, usePhraseLogging } from '../hooks/usePhraseActions';

const DailyPhrase = ({ onViewHistory, isEditing, onEditingChange, onActivePhraseChange, onShare }) => {
  const resource = usePhraseResource();
  const [entryMode, setEntryMode] = useState('browse');
  const [pickedText, setPickedText] = useState(null);
  const source = pickedText === null
    ? 'written'
    : (editorText => editorText.trim() === pickedText.trim() ? 'picked' : 'picked_edited');
  const editor = usePhraseEditor(resource, { isEditing, onEditingChange, source });
  const logging = usePhraseLogging(resource);
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
        cameFromPicker={pickedText !== null}
        onBackToPicker={() => {
          setPickedText(null);
          editor.setInputValue('');
          setEntryMode('browse');
        }}
      />
    </Box>
  );
};

export default DailyPhrase;
