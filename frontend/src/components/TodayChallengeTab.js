import React from 'react';
import ChallengeSelector from './ChallengeSelector';
import TodayPracticeSection from './TodayPracticeSection';
import ChallengeCelebrationCard from './ChallengeCelebrationCard';
import { calculateChallengeStatus, calculateChallengeMetrics } from '../utils/challengeDay';

const TodayChallengeTab = ({
  showChallengeSelector,
  selectedChallengeId,
  currentChallenge,
  userState,
  practice,
  hasDetailedRecord,
  celebrationShown,
  yesterdayRecord,
  practiceCardRef,
  practiceCardInnerRef,
  practiceCardHeight,
  shouldAnimateCard,
  isMeasuringHeight,
  onChallengeSelected,
  onOpenCompletionFlow,
  onOpenRecordModal,
  onViewCurrentChallenge,
  onCreateEnvelope,
  onViewEnvelopeList,
  onChallengeCompletion
}) => {
  const hasCurrentContent = !showChallengeSelector && Boolean(selectedChallengeId) && currentChallenge;
  const isChallengeActive = hasCurrentContent && calculateChallengeStatus(currentChallenge, {}).status !== 'completed';
  const shouldShowCelebration = hasCurrentContent && celebrationShown && (() => {
    const metrics = calculateChallengeMetrics(currentChallenge, {
      completedDays: currentChallenge.completed_days || 0
    });
    return metrics.isFullyCompleted;
  })();

  return (
    <>
      {showChallengeSelector && (
        <ChallengeSelector onChallengeSelected={onChallengeSelected} />
      )}

      {isChallengeActive && (
        <TodayPracticeSection
          currentChallenge={currentChallenge}
          userState={userState}
          practice={practice}
          hasDetailedRecord={hasDetailedRecord}
          yesterdayRecord={yesterdayRecord}
          practiceCardRef={practiceCardRef}
          practiceCardInnerRef={practiceCardInnerRef}
          practiceCardHeight={practiceCardHeight}
          shouldAnimateCard={shouldAnimateCard}
          isMeasuringHeight={isMeasuringHeight}
          onOpenCompletionFlow={onOpenCompletionFlow}
          onOpenRecordModal={onOpenRecordModal}
          onViewCurrentChallenge={onViewCurrentChallenge}
          onCreateEnvelope={onCreateEnvelope}
          onViewEnvelopeList={onViewEnvelopeList}
        />
      )}

      {shouldShowCelebration && (
        <ChallengeCelebrationCard
          currentChallenge={currentChallenge}
          onChallengeCompletion={onChallengeCompletion}
          onViewCurrentChallenge={onViewCurrentChallenge}
        />
      )}
    </>
  );
};

export default TodayChallengeTab;
