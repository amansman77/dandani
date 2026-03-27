import { useCallback, useRef } from 'react';
import { getUserId } from '../utils/userId';
import { getSelectedChallenge, clearSelectedChallenge, validateAndFixStartedAt } from '../utils/challengeSelection';
import { logChallengeComplete } from '../utils/analytics';
import {
  calculateChallengeProgress,
  addStartedAtHeader,
  calculateChallengeStatus,
  calculateChallengeMetrics,
  getClampedPracticeDay
} from '../utils/challengeDay';

export const useChallengeData = ({
  apiUrl,
  selectedChallengeId,
  selectedChallengeStartedAt,
  previousChallengeStatus,
  currentChallenge,
  celebrationShownRef,
  setLoading,
  setError,
  setShowChallengeSelector,
  setPractice,
  setHasDetailedRecord,
  setSelectedChallengeInfo,
  setCurrentChallenge,
  setPreviousChallengeStatus,
  setCelebrationShown
}) => {
  const fetchingRef = useRef(false);
  const checkDetailedRecord = useCallback(async (practiceData, challenge) => {
    if (!practiceData || !challenge?.id) {
      return;
    }

    try {
      const userId = getUserId();
      const practiceDay = getClampedPracticeDay(practiceData, challenge);

      const headers = addStartedAtHeader({
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString(),
        'X-User-ID': userId
      }, challenge.id);

      const response = await fetch(`${apiUrl}/api/feedback/record?challengeId=${challenge.id}&practiceDay=${practiceDay}`, {
        headers
      });

      if (!response.ok) {
        setHasDetailedRecord(false);
        return;
      }

      const recordData = await response.json();
      const hasRecord = Boolean(recordData && (recordData.mood_change || recordData.was_helpful || recordData.practice_description));
      setHasDetailedRecord(hasRecord);
    } catch (error) {
      console.error('Failed to check detailed record:', error);
      setHasDetailedRecord(false);
    }
  }, [apiUrl, setHasDetailedRecord]);

  const fetchPracticeAndChallenge = useCallback(async (challengeId = null, startedAtOverride = null) => {
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const userId = getUserId();
      const targetChallengeId = challengeId || selectedChallengeId;
      const targetStartedAt = startedAtOverride || selectedChallengeStartedAt;
      if (!targetChallengeId) {
        setLoading(false);
        setShowChallengeSelector(true);
        return;
      }

      const validStartedAt = targetStartedAt || validateAndFixStartedAt(targetChallengeId, null);
      const params = new URLSearchParams();
      params.append('challengeId', targetChallengeId);
      params.append('startedAt', validStartedAt);

      const headers = {
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString(),
        'X-User-ID': userId,
        'X-Started-At': validStartedAt
      };

      const [practiceResponse, challengesResponse] = await Promise.allSettled([
        fetch(`${apiUrl}/api/practice/today?${params.toString()}`, { headers }),
        fetch(`${apiUrl}/api/challenges`, { headers })
      ]);

      let loadedPracticeData = null;
      if (practiceResponse.status === 'fulfilled' && practiceResponse.value.ok) {
        loadedPracticeData = await practiceResponse.value.json();
        setPractice(loadedPracticeData);
        if (!loadedPracticeData?.isRecorded) {
          setHasDetailedRecord(false);
        }
      } else {
        setPractice(null);
      }

      let challengesData = null;
      if (challengesResponse.status === 'fulfilled' && challengesResponse.value.ok) {
        challengesData = await challengesResponse.value.json();
      }

      if (!challengesData) {
        return;
      }

      const allChallenges = challengesData.challenges || [];
      const selectedChallenge = targetChallengeId
        ? allChallenges.find((challenge) => challenge.id === parseInt(targetChallengeId, 10))
        : null;

      const baseChallenge = selectedChallenge || challengesData.current;
      if (!baseChallenge) {
        setCurrentChallenge(null);
        return;
      }

      if (selectedChallenge) {
        const validatedStartedAt = validateAndFixStartedAt(targetChallengeId, targetStartedAt);
        if (validatedStartedAt !== targetStartedAt) {
          setSelectedChallengeInfo(getSelectedChallenge());
        }
      }
      const { currentDay, progressPercentage } = calculateChallengeProgress(baseChallenge, {});
      let completedDays = 0;
      let actualProgressPercentage = progressPercentage;

      try {
        const feedbackHeaders = addStartedAtHeader({
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString(),
          'X-User-ID': userId
        }, baseChallenge.id);

        const feedbackResponse = await fetch(`${apiUrl}/api/feedback/history?challengeId=${baseChallenge.id}`, {
          headers: feedbackHeaders
        });

        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json();
          const completedDaysSet = new Set(feedbackData.map((feedback) => feedback.practice_day));
          const totalDays = Math.max(1, baseChallenge.total_days || 1);
          completedDays = Math.min(completedDaysSet.size, currentDay);
          actualProgressPercentage = Math.round((completedDays / totalDays) * 100);
        }
      } catch (feedbackError) {
        console.warn('Failed to fetch feedback history for progress calculation:', feedbackError);
      }

      const totalDays = Math.max(1, baseChallenge.total_days || 1);
      const isCompleted = completedDays >= totalDays;
      const wasCompleted = currentChallenge?.is_completed || false;
      if (isCompleted && !wasCompleted) {
        logChallengeComplete(baseChallenge.id);
      }

      const updatedChallenge = {
        ...baseChallenge,
        current_day: currentDay,
        progress_percentage: actualProgressPercentage,
        completed_days: completedDays,
        is_completed: isCompleted
      };

      const challengeStatus = calculateChallengeStatus(updatedChallenge, {});
      const statusTransitioned = previousChallengeStatus === 'current' && challengeStatus.status === 'completed';

      updatedChallenge.status = challengeStatus.status;
      setPreviousChallengeStatus(challengeStatus.status);

      if (challengeStatus.status === 'completed') {
        if (statusTransitioned || selectedChallenge) {
          clearSelectedChallenge();
          setSelectedChallengeInfo(null);
          setShowChallengeSelector(true);
          setCurrentChallenge(null);
          setPractice(null);
          return;
        }
      }

      const initialStatus = calculateChallengeStatus(updatedChallenge, { practiceDay: currentDay }).status;
      setPreviousChallengeStatus(initialStatus);
      setCurrentChallenge(updatedChallenge);

      if (loadedPracticeData?.isRecorded) {
        checkDetailedRecord(loadedPracticeData, updatedChallenge);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [
    apiUrl,
    selectedChallengeId,
    selectedChallengeStartedAt,
    previousChallengeStatus,
    currentChallenge?.is_completed,
    checkDetailedRecord,
    setLoading,
    setError,
    setShowChallengeSelector,
    setPractice,
    setHasDetailedRecord,
    setSelectedChallengeInfo,
    setCurrentChallenge,
    setPreviousChallengeStatus
  ]);

  const updateChallengeProgress = useCallback(async (challengeId) => {
    if (!challengeId || !currentChallenge) {
      return;
    }

    try {
      const userId = getUserId();
      const feedbackHeaders = addStartedAtHeader({
        'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-Client-Time': new Date().toISOString(),
        'X-User-ID': userId
      }, challengeId);

      const feedbackResponse = await fetch(`${apiUrl}/api/feedback/history?challengeId=${challengeId}`, {
        headers: feedbackHeaders
      });

      if (!feedbackResponse.ok) {
        return;
      }
      const feedbackData = await feedbackResponse.json();
      const completedDaysSet = new Set(feedbackData.map((feedback) => feedback.practice_day));
      const totalDays = Math.max(1, currentChallenge.total_days || 1);
      const { currentDay } = calculateChallengeProgress(currentChallenge, {});

      const validCompletedDays = Math.min(completedDaysSet.size, currentDay);
      const finalProgressPercentage = Math.round((validCompletedDays / totalDays) * 100);
      const metrics = calculateChallengeMetrics(currentChallenge, { completedDays: validCompletedDays });

      const previousStatus = previousChallengeStatus ||
        (currentChallenge.status ? currentChallenge.status : calculateChallengeStatus(currentChallenge, {}).status);
      const { status: currentStatus } = calculateChallengeStatus({ ...currentChallenge, total_days: totalDays }, {});

      if (previousStatus === 'current' && currentStatus === 'completed') {
        setShowChallengeSelector(true);
      }

      const shouldShowCelebration =
        !celebrationShownRef.current &&
        metrics.isFullyCompleted &&
        !currentChallenge.is_completed;

      if (shouldShowCelebration) {
        setCelebrationShown(true);
        celebrationShownRef.current = true;
        logChallengeComplete(challengeId);
      }
      setCurrentChallenge({
        ...currentChallenge,
        current_day: currentDay,
        progress_percentage: finalProgressPercentage,
        completed_days: validCompletedDays,
        status: currentStatus,
        is_completed: metrics.isFullyCompleted
      });
      setPreviousChallengeStatus(currentStatus);
    } catch (error) {
      console.warn('Failed to update challenge progress:', error);
    }
  }, [
    apiUrl,
    currentChallenge,
    previousChallengeStatus,
    celebrationShownRef,
    setShowChallengeSelector,
    setCelebrationShown,
    setCurrentChallenge,
    setPreviousChallengeStatus
  ]);
  return { fetchPracticeAndChallenge, updateChallengeProgress };
};
