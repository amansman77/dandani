export { calculateChallengeDayFromStart, getClientLocalDate, getRequiredUserId, logUserEvent } from './core.js';

export function addStartedAtDateString(startedAt) {
  if (!startedAt || typeof startedAt !== 'string') {
    return '';
  }
  return startedAt.split('T')[0];
}
