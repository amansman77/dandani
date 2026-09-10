import React, { useEffect } from 'react';
import { Box, Alert, Button } from '@mui/material';
import VariantA from './phraseVariants/VariantA';
import Loader from './Loader';
import { logPhraseOnboardingShown } from '../utils/analytics';
import usePhraseResource from '../hooks/usePhraseResource';
import { usePhraseEditor, usePhraseLogging } from '../hooks/usePhraseActions';

const DailyPhrase = ({ onViewHistory, isEditing, onEditingChange, onActivePhraseChange }) => {
  const resource = usePhraseResource();
  const editor = usePhraseEditor(resource, { isEditing, onEditingChange });
  const logging = usePhraseLogging(resource);
  const { phrase, loading, error, refresh } = resource;
  useEffect(() => {
    if (!loading && !error && !phrase) logPhraseOnboardingShown();
  }, [loading, error, phrase]);
  useEffect(() => {
    if (onActivePhraseChange) onActivePhraseChange(phrase || null);
  }, [phrase, onActivePhraseChange]);

  if (loading && !phrase) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><Loader /></Box>;
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
      />
    </Box>
  );
};

export default DailyPhrase;
