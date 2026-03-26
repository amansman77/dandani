import { parseDatabaseDate } from './challengeDay';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeLocalDate = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const getDateDiff = (fromDateKey, toDateKeyValue) => {
  const from = normalizeLocalDate(new Date(fromDateKey));
  const to = normalizeLocalDate(new Date(toDateKeyValue));
  return Math.floor((to - from) / ONE_DAY_MS);
};

const buildActionDateSet = (records = []) => {
  const dateKeys = new Set();
  records.forEach((record) => {
    const parsed = parseDatabaseDate(record?.created_at);
    if (!parsed) {
      return;
    }
    dateKeys.add(toDateKey(parsed));
  });
  return dateKeys;
};

const calculateChainLength = (endDateKey, actionDateSet) => {
  if (!endDateKey || !actionDateSet.has(endDateKey)) {
    return 0;
  }

  let count = 0;
  let cursor = normalizeLocalDate(new Date(endDateKey));
  while (actionDateSet.has(toDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
};

export const deriveRetentionState = (records = [], referenceDate = new Date()) => {
  const actionDateSet = buildActionDateSet(records);
  const sortedDates = Array.from(actionDateSet).sort();
  const lastActionDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
  const totalActions = records.length;

  if (!lastActionDate) {
    return {
      streakDays: 0,
      totalActions: 0,
      lastActionDate: null
    };
  }

  const daysFromLastAction = getDateDiff(lastActionDate, toDateKey(referenceDate));
  const activeStreak = daysFromLastAction > 1
    ? 0
    : calculateChainLength(lastActionDate, actionDateSet);

  return {
    streakDays: activeStreak,
    totalActions,
    lastActionDate
  };
};

export const generateFeedback = (streakDays) => {
  if (streakDays <= 3) {
    return '시작했다는 것 자체가 이미 단단함입니다';
  }
  if (streakDays <= 7) {
    return '반복 속에서 중심이 만들어지고 있어요';
  }
  return '이건 습관이 아니라 태도가 되고 있어요';
};

export const getStreakMessage = (streakDays) => {
  if (!streakDays || streakDays < 1) {
    return '오늘 다시 중심을 세워볼까요?';
  }
  return `🔥 ${streakDays}일째 중심을 지키고 있어요`;
};
