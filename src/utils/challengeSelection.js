// 챌린지 선택 상태 관리 유틸리티
const SELECTED_CHALLENGE_KEY = 'dandani_selected_challenge_id';

export const getSelectedChallengeId = () => {
  return localStorage.getItem(SELECTED_CHALLENGE_KEY);
};

export const setSelectedChallengeId = (challengeId) => {
  if (challengeId) {
    localStorage.setItem(SELECTED_CHALLENGE_KEY, challengeId.toString());
    console.log('Selected challenge ID saved:', challengeId);
  } else {
    clearSelectedChallenge();
  }
};

export const clearSelectedChallenge = () => {
  localStorage.removeItem(SELECTED_CHALLENGE_KEY);
  console.log('Selected challenge cleared');
};

export const hasSelectedChallenge = () => {
  return !!getSelectedChallengeId();
};

