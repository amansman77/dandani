import { useCallback, useEffect, useState } from 'react';
import { getUserId } from '../utils/userId';
import { addStartedAtHeader } from '../utils/challengeDay';
import { deriveRetentionState } from '../utils/retention';

const defaultState = {
  streakDays: 0,
  totalActions: 0,
  lastActionDate: null
};

export const useRetentionState = ({ apiUrl, challengeId }) => {
  const [userState, setUserState] = useState(defaultState);
  const [actionLogs, setActionLogs] = useState([]);

  const refreshRetentionState = useCallback(async () => {
    if (!challengeId) {
      setUserState(defaultState);
      setActionLogs([]);
      return;
    }

    try {
      const userId = getUserId();
      const headers = addStartedAtHeader({
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString(),
        'X-User-ID': userId
      }, challengeId);

      const response = await fetch(`${apiUrl}/api/feedback/history?challengeId=${challengeId}`, {
        headers
      });

      if (!response.ok) {
        setUserState(defaultState);
        setActionLogs([]);
        return;
      }

      const history = await response.json();
      const records = Array.isArray(history) ? history : [];
      setUserState(deriveRetentionState(records));
      setActionLogs(records);
    } catch (error) {
      console.warn('Failed to load retention state:', error);
      setUserState(defaultState);
      setActionLogs([]);
    }
  }, [apiUrl, challengeId]);

  useEffect(() => {
    refreshRetentionState();
  }, [refreshRetentionState]);

  return {
    userState,
    actionLogs,
    refreshRetentionState
  };
};
