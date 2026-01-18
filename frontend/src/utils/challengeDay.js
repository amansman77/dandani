// 챌린지 일차 계산 유틸리티
// 모든 일차 계산 로직을 중앙화하여 일관성 보장

import { getSelectedChallenge } from './challengeSelection';

/**
 * 날짜를 정규화하여 시간 부분을 제거 (자정 기준)
 * @param {string|Date} value - 날짜 값
 * @returns {Date|null} 정규화된 날짜 또는 null
 */
export const normalizeDateOnly = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * 챌린지의 현재 일차를 계산 (ADR-0002.01: 실제 경과 일수 반환)
 * 
 * 항상 startedAt 기준 실제 경과 일수를 반환합니다.
 * totalDays 제한이 필요한 경우 호출하는 쪽에서 Math.min(day, totalDays)를 사용하세요.
 * 
 * @param {Object} challenge - 챌린지 객체 (id, total_days 포함)
 * @param {Object} options - 옵션 (현재 사용되지 않음, 호환성을 위해 유지)
 * @returns {number} 실제 경과 일수 (1부터 시작, totalDays 제한 없음)
 */
export const calculateChallengeDay = (challenge, options = {}) => {
  if (!challenge) {
    return 1;
  }
  
  // 선택한 챌린지인지 확인
  const selectedChallengeInfo = getSelectedChallenge();
  const isSelectedChallenge = selectedChallengeInfo && 
    parseInt(selectedChallengeInfo.id) === parseInt(challenge.id);

  const today = normalizeDateOnly(new Date());

  if (isSelectedChallenge && selectedChallengeInfo.startedAt) {
    // startedAt 기준으로 실제 경과 일수 계산
    const startedAt = normalizeDateOnly(selectedChallengeInfo.startedAt);
    
    if (startedAt && today) {
      const diffDays = Math.floor((today.getTime() - startedAt.getTime()) / (24 * 60 * 60 * 1000));
      const calculatedDay = diffDays + 1;
      return Math.max(1, calculatedDay);
    }
  }

  // 선택하지 않은 챌린지의 경우: 기본값 1일차
  return 1;
};

/**
 * 챌린지의 진행률 정보 계산
 * 
 * @param {Object} challenge - 챌린지 객체
 * @param {Object} options - 옵션
 * @returns {Object} { currentDay, progressPercentage }
 */
export const calculateChallengeProgress = (challenge, options = {}) => {
  if (!challenge) {
    return { currentDay: 1, progressPercentage: 0 };
  }

  const totalDays = Math.max(1, challenge.total_days || 1);
  // 항상 실제 경과 일수 사용
  const currentDay = calculateChallengeDay(challenge, options);
  const progressPercentage = Math.round((currentDay / totalDays) * 100);

  return {
    currentDay,
    progressPercentage
  };
};

/**
 * 챌린지의 상태(status) 계산 (ADR-0002.01: Time-based Lifecycle)
 * 
 * 상태는 "시간의 흐름에서의 위치"만을 나타냅니다.
 * 사용자의 실천 성과, 성취감, 완료 여부는 상태가 아닌 지표(metrics) 또는 이벤트(event)로 표현합니다.
 * 
 * @param {Object} challenge - 챌린지 객체
 * @param {Object} options - 옵션
 * @returns {Object} { status, currentDay }
 *   - status: 'current' | 'completed' | 'upcoming'
 *   - currentDay: 현재 일차 (실제 경과 일수, totalDays 제한 없음)
 */
export const calculateChallengeStatus = (challenge, options = {}) => {
  if (!challenge) {
    return { status: 'upcoming', currentDay: 1 };
  }

  const totalDays = Math.max(1, challenge.total_days || 1);
  // ADR-0002.01: 실제 경과 일수 사용 (항상 제한 없음)
  const currentDay = calculateChallengeDay(challenge, options);
  
  // ADR-0002.01 규칙: 시간 기반 상태 판정
  // 이 판정은 실천 여부, 기록 수와 무관합니다.
  if (currentDay < 1) {
    return { status: 'upcoming', currentDay: 1 };
  } else if (currentDay > totalDays) {
    return { status: 'completed', currentDay: currentDay };
  } else {
    // 1 <= currentDay <= totalDays
    return { status: 'current', currentDay };
  }
};

/**
 * 챌린지의 완료·성과 지표 계산 (ADR-0002.01: Experience-based Metrics)
 * 
 * 상태와 완전히 분리된 개념으로 완료 일수와 진행률을 계산합니다.
 * 이 지표들은 UI 피드백, 회고, 통계 용도로만 사용되며 상태를 변경하지 않습니다.
 * 
 * @param {Object} challenge - 챌린지 객체
 * @param {Object} options - 옵션
 * @param {number} options.completedDays - 완료된 일수 (practice_feedback 기록 수)
 * @returns {Object} { completedDays, progressRate, isFullyCompleted }
 *   - completedDays: 완료된 일수
 *   - progressRate: 진행률 (0-100)
 *   - isFullyCompleted: 모든 일수를 완료했는지 여부
 */
export const calculateChallengeMetrics = (challenge, options = {}) => {
  if (!challenge) {
    return { completedDays: 0, progressRate: 0, isFullyCompleted: false };
  }

  const totalDays = Math.max(1, challenge.total_days || 1);
  const completedDays = options.completedDays || 0;
  const progressRate = Math.round((completedDays / totalDays) * 100);
  const isFullyCompleted = completedDays >= totalDays;

  return {
    completedDays,
    progressRate,
    isFullyCompleted
  };
};

/**
 * 챌린지 종료일 계산
 * 
 * @param {string|Date} startedAt - 챌린지 시작일
 * @param {number} totalDays - 총 일수
 * @returns {string} 종료일 (YYYY-MM-DD 형식)
 */
export const calculateChallengeEndDate = (startedAt, totalDays) => {
  if (!startedAt || !totalDays) {
    return null;
  }
  
  const startDate = normalizeDateOnly(startedAt);
  if (!startDate) {
    return null;
  }
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays - 1);
  
  return `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
};

/**
 * 데이터베이스 날짜 값을 Date 객체로 파싱
 * SQLite DATETIME 형식과 ISO 8601 형식을 모두 지원
 * 
 * @param {string|Date} dateValue - 날짜 값 (SQLite DATETIME, ISO 8601, 또는 Date 객체)
 * @returns {Date|null} 파싱된 Date 객체 또는 null (파싱 실패 시)
 */
export const parseDatabaseDate = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  // Date 객체인 경우 그대로 반환
  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  // 문자열인 경우 형식에 따라 파싱
  if (typeof dateValue === 'string') {
    if (dateValue.includes('T')) {
      // ISO 8601 형식인 경우 (예: "2025-12-05T15:00:00Z")
      const parsed = new Date(dateValue);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } else {
      // SQLite DATETIME 형식인 경우 UTC로 해석
      // "2025-12-04 22:37:43" -> "2025-12-04T22:37:43Z"
      const utcDateStr = dateValue.replace(' ', 'T') + 'Z';
      const parsed = new Date(utcDateStr);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
};

/**
 * 과거 기록인지 확인
 * SQLite DATETIME 형식을 UTC로 해석하여 로컬 시간 기준으로 비교
 * 
 * @param {string|Date} recordDate - 기록 날짜 (SQLite DATETIME 또는 ISO 8601 형식)
 * @returns {boolean} 오늘 자정 이전의 기록이면 true
 */
export const isPastRecord = (recordDate) => {
  const parsedDate = parseDatabaseDate(recordDate);
  if (!parsedDate) {
    return false;
  }
  
  // 로컬 시간 기준으로 기록 날짜 추출 (시간 제거)
  const recordYear = parsedDate.getFullYear();
  const recordMonth = parsedDate.getMonth();
  const recordDay = parsedDate.getDate();
  const recordDateOnly = new Date(recordYear, recordMonth, recordDay).getTime();
  
  // 오늘 날짜 (로컬 시간 기준, 시간 제거)
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();
  const todayDateOnly = new Date(todayYear, todayMonth, todayDay).getTime();
  
  // 기록 날짜가 오늘 날짜보다 이전이면 과거 기록
  return recordDateOnly < todayDateOnly;
};

/**
 * 선택한 챌린지의 startedAt을 헤더에 추가
 * 
 * @param {Object} headers - 기존 헤더 객체
 * @param {string|number} challengeId - 챌린지 ID
 * @returns {Object} startedAt이 추가된 헤더 객체
 */
export const addStartedAtHeader = (headers, challengeId) => {
  const selectedChallengeInfo = getSelectedChallenge();
  const isSelectedChallenge = selectedChallengeInfo && 
    parseInt(selectedChallengeInfo.id) === parseInt(challengeId);
  
  if (isSelectedChallenge && selectedChallengeInfo.startedAt) {
    headers['X-Started-At'] = selectedChallengeInfo.startedAt;
  }
  
  return headers;
};

/**
 * 날짜를 한국어 형식으로 포맷팅 (KST 기준)
 * SQLite DATETIME 형식을 UTC로 해석하여 로컬 시간대로 변환
 * 
 * @param {string|Date} dateValue - 날짜 값 (SQLite DATETIME 또는 ISO 8601 형식)
 * @param {Object} options - 포맷 옵션
 * @param {boolean} options.includeTime - 시간 포함 여부 (기본값: false)
 * @returns {string} 포맷팅된 날짜 문자열 (예: "2025년 12월 5일" 또는 "2025년 12월 5일 오전 7:40")
 */
export const formatDateToKorean = (dateValue, options = {}) => {
  const recordDate = parseDatabaseDate(dateValue);
  if (!recordDate) {
    return '';
  }

  const { includeTime = false } = options;

  // KST로 변환된 날짜 추출
  const localYear = recordDate.getFullYear();
  const localMonth = recordDate.getMonth() + 1;
  const localDay = recordDate.getDate();

  if (includeTime) {
    const localHour = recordDate.getHours();
    const localMinute = recordDate.getMinutes();
    const ampm = localHour < 12 ? '오전' : '오후';
    const hour12 = localHour % 12 || 12;
    const minuteStr = String(localMinute).padStart(2, '0');
    return `${localYear}년 ${localMonth}월 ${localDay}일 ${ampm} ${hour12}:${minuteStr}`;
  }

  return `${localYear}년 ${localMonth}월 ${localDay}일`;
};

