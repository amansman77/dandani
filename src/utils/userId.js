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
  return {
    userId,
    isNew: !localStorage.getItem('dandani_user_initialized')
  };
};

export const markUserInitialized = () => {
  localStorage.setItem('dandani_user_initialized', 'true');
};
