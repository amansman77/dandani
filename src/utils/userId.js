// 브라우저별 고유 사용자 ID 생성 및 관리
const USER_ID_KEY = 'dandani_user_id';

export const getUserId = () => {
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    // 고유한 사용자 ID 생성 (타임스탬프 + 랜덤 문자열)
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(USER_ID_KEY, userId);
    console.log('New user ID generated:', userId);
  }
  
  return userId;
};

export const clearUserId = () => {
  localStorage.removeItem(USER_ID_KEY);
  console.log('User ID cleared');
};

export const isUserIdSet = () => {
  return !!localStorage.getItem(USER_ID_KEY);
};

export const getUserIdInfo = () => {
  const userId = getUserId();
  const isInitialized = localStorage.getItem('dandani_user_initialized') === 'true';
  return {
    userId,
    isNew: !isInitialized,
    isInitialized
  };
};

export const markUserInitialized = () => {
  localStorage.setItem('dandani_user_initialized', 'true');
  console.log('User marked as initialized');
};

export const resetUserOnboarding = () => {
  localStorage.removeItem('dandani_user_initialized');
  console.log('User onboarding reset');
};

export const getOnboardingStatus = () => {
  return {
    isInitialized: localStorage.getItem('dandani_user_initialized') === 'true',
    userId: getUserId(),
    timestamp: localStorage.getItem('dandani_user_initialized_timestamp')
  };
};

export const canRestartOnboarding = () => {
  // 온보딩을 재시작할 수 있는 조건들
  return {
    hasUserId: !!localStorage.getItem(USER_ID_KEY),
    isInitialized: localStorage.getItem('dandani_user_initialized') === 'true'
  };
};
