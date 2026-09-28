import React, { useEffect, useState } from 'react';
import { Box, Alert, Button, Snackbar } from '@mui/material';
import VariantA from './phraseVariants/VariantA';
import Loader from './Loader';
import PhrasePicker from './PhrasePicker';
import PhraseCardSheet from './PhraseCardSheet';
import { logPhraseOnboardingShown } from '../utils/analytics';
import { createPostcard } from '../utils/nuvApi';
import usePhraseResource from '../hooks/usePhraseResource';
import { usePhraseEditor, usePhraseLogging } from '../hooks/usePhraseActions';

const DailyPhrase = ({
  onViewHistory, isEditing, onEditingChange, onActivePhraseChange, onShare,
  onNuvBalanceChange,
}) => {
  const resource = usePhraseResource();
  const [entryMode, setEntryMode] = useState('browse');
  const [pickedText, setPickedText] = useState(null);
  const [notice, setNotice] = useState('');
  // 엽서 만들기는 지금 문장을 엽서로 옮기는 일 하나다(2026-09-28 쓰기 단계를
  // 걷어냈다). 누르면 곧바로 엽서가 나오고, 배경을 고르는 시트가 그 자리에서
  // 열린다.
  const [issued, setIssued] = useState(null);
  const [making, setMaking] = useState(false);
  const source = pickedText === null
    ? 'written'
    : (editorText => editorText.trim() === pickedText.trim() ? 'picked' : 'picked_edited');
  const editor = usePhraseEditor(resource, { isEditing, onEditingChange, source });
  const logging = usePhraseLogging(resource, {
    onNuvBalanceChange,
    // "받았어요"는 보상의 말이다. 누브는 되새긴 하루가 남은 것이고 그 수가 곧
    // 되새긴 날의 수라서, 몇 번째 하루인지를 말한다.
    onNuvAwarded: balance => setNotice(`오늘이 ${balance}번째 누브로 남았어요`),
  });
  const { phrase, loading, error, refresh } = resource;
  const makePostcard = async () => {
    if (!phrase || making) return;
    setMaking(true);
    try {
      const made = await createPostcard(phrase.id);
      setIssued({ id: made.postcard_id, practicedOn: made.issued_on, loggedDays: made.logged_days });
    } catch (err) {
      setNotice(err.message);
    } finally {
      setMaking(false);
    }
  };
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
        onMakePostcard={makePostcard}
        cameFromPicker={pickedText !== null}
        onBackToPicker={() => {
          setPickedText(null);
          editor.setInputValue('');
          setEntryMode('browse');
        }}
      />
      <PhraseCardSheet
        open={Boolean(issued)} onClose={() => setIssued(null)}
        phrase={phrase} postcardId={issued?.id} practicedOn={issued?.practicedOn}
        loggedDays={issued?.loggedDays}
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
