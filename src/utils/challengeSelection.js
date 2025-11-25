// 챌린지 선택 상태 관리 유틸리티
const SELECTED_CHALLENGE_INFO_KEY = 'dandani_selected_challenge';
const SELECTED_CHALLENGE_LEGACY_KEY = 'dandani_selected_challenge_id';

const normalizeChallengeSelection = (storedValue) => {
  if (!storedValue) {
    return null;
  }

  if (typeof storedValue === 'string') {
    try {
      const parsed = JSON.parse(storedValue);
      if (parsed && parsed.id) {
        return {
          id: parsed.id.toString(),
          startedAt: parsed.startedAt || null
        };
      }
    } catch (error) {
      return {
        id: storedValue.toString(),
        startedAt: null
      };
    }
  }

  if (typeof storedValue === 'object' && storedValue.id) {
    return {
      id: storedValue.id.toString(),
      startedAt: storedValue.startedAt || null
    };
  }

  return null;
};

const migrateLegacySelection = () => {
  const legacyValue = localStorage.getItem(SELECTED_CHALLENGE_LEGACY_KEY);
  if (!legacyValue) {
    return null;
  }

  const selection = normalizeChallengeSelection(legacyValue);
  if (selection) {
    localStorage.setItem(SELECTED_CHALLENGE_INFO_KEY, JSON.stringify(selection));
    localStorage.removeItem(SELECTED_CHALLENGE_LEGACY_KEY);
    return selection;
  }

  return null;
};

export const getSelectedChallenge = () => {
  const stored = localStorage.getItem(SELECTED_CHALLENGE_INFO_KEY);
  const selection = normalizeChallengeSelection(stored);

  if (selection) {
    return selection;
  }

  return migrateLegacySelection();
};

export const getSelectedChallengeId = () => {
  const selection = getSelectedChallenge();
  return selection ? selection.id : null;
};

export const setSelectedChallenge = (challengeId, startedAt = new Date().toISOString()) => {
  if (!challengeId) {
    clearSelectedChallenge();
    return null;
  }

  const selection = {
    id: challengeId.toString(),
    startedAt
  };

  localStorage.setItem(SELECTED_CHALLENGE_INFO_KEY, JSON.stringify(selection));
  localStorage.removeItem(SELECTED_CHALLENGE_LEGACY_KEY);
  console.log('Selected challenge saved:', selection);
  return selection;
};

export const setSelectedChallengeId = (challengeId, startedAt) => {
  return setSelectedChallenge(challengeId, startedAt);
};

export const clearSelectedChallenge = () => {
  localStorage.removeItem(SELECTED_CHALLENGE_INFO_KEY);
  localStorage.removeItem(SELECTED_CHALLENGE_LEGACY_KEY);
  console.log('Selected challenge cleared');
};

export const hasSelectedChallenge = () => {
  return !!getSelectedChallenge();
};
