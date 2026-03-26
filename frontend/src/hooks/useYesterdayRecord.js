import { useEffect, useState } from 'react';
import { getUserId } from '../utils/userId';
import { addStartedAtHeader, parseDatabaseDate } from '../utils/challengeDay';
import { logReturnNextDay } from '../utils/analytics';

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isYesterdayRecord = (recordDate) => {
  const parsedDate = parseDatabaseDate(recordDate);
  if (!parsedDate) {
    return false;
  }

  const target = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()).getTime();
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  return target === yesterday.getTime();
};

export const useYesterdayRecord = ({
  apiUrl,
  selectedChallengeId,
  practiceRecorded
}) => {
  const [yesterdayRecord, setYesterdayRecord] = useState(null);

  useEffect(() => {
    const fetchYesterdayRecord = async () => {
      if (!selectedChallengeId) {
        setYesterdayRecord(null);
        return;
      }

      try {
        const userId = getUserId();
        const headers = addStartedAtHeader({
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString(),
          'X-User-ID': userId
        }, selectedChallengeId);

        const response = await fetch(`${apiUrl}/api/feedback/history?challengeId=${selectedChallengeId}`, {
          headers
        });

        if (!response.ok) {
          setYesterdayRecord(null);
          return;
        }

        const history = await response.json();
        const yesterdayRecords = (history || []).filter((record) => {
          return record?.practice_description && isYesterdayRecord(record.created_at);
        });

        if (yesterdayRecords.length === 0) {
          setYesterdayRecord(null);
          return;
        }

        yesterdayRecords.sort((a, b) => {
          const aTime = parseDatabaseDate(a.created_at)?.getTime() || 0;
          const bTime = parseDatabaseDate(b.created_at)?.getTime() || 0;
          return bTime - aTime;
        });
        setYesterdayRecord(yesterdayRecords[0]);
      } catch (error) {
        console.warn('Failed to fetch yesterday record:', error);
        setYesterdayRecord(null);
      }
    };

    fetchYesterdayRecord();
  }, [apiUrl, selectedChallengeId, practiceRecorded]);

  useEffect(() => {
    if (!yesterdayRecord || !selectedChallengeId) {
      return;
    }

    const todayKey = formatDateKey(new Date());
    const dedupeKey = `dandani_return_next_day_logged_${selectedChallengeId}_${todayKey}`;
    if (localStorage.getItem(dedupeKey) === 'true') {
      return;
    }

    logReturnNextDay(selectedChallengeId, yesterdayRecord.practice_day || null);
    localStorage.setItem(dedupeKey, 'true');
  }, [yesterdayRecord, selectedChallengeId]);

  return {
    yesterdayRecord
  };
};
