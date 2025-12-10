// 편지 저장소 유틸리티
const ENVELOPE_STORAGE_KEY = 'dandani_envelopes';

// 편지 데이터 구조
// {
//   id: string,
//   challengeId: string,
//   challengeName: string,
//   // message: string, // 보안을 위해 로컬에 저장하지 않음
//   password: string,
//   createdAt: string,
//   unlockAt: string,
//   shareUrl: string,
//   status: 'locked' | 'unlocked' | 'expired'
// }

export const saveEnvelope = (envelopeData) => {
  try {
    const envelopes = getEnvelopes();
    const newEnvelope = {
      ...envelopeData,
      id: envelopeData.envelopeId,
      createdAt: new Date().toISOString(),
      status: 'locked'
    };
    
    envelopes.push(newEnvelope);
    localStorage.setItem(ENVELOPE_STORAGE_KEY, JSON.stringify(envelopes));
    return newEnvelope;
  } catch (error) {
    console.error('Failed to save envelope:', error);
    return null;
  }
};

export const getEnvelopes = () => {
  try {
    const stored = localStorage.getItem(ENVELOPE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get envelopes:', error);
    return [];
  }
};

export const getEnvelopeById = (id) => {
  const envelopes = getEnvelopes();
  return envelopes.find(envelope => envelope.id === id);
};

export const updateEnvelopeStatus = (id, status) => {
  try {
    const envelopes = getEnvelopes();
    const index = envelopes.findIndex(envelope => envelope.id === id);
    if (index !== -1) {
      envelopes[index].status = status;
      localStorage.setItem(ENVELOPE_STORAGE_KEY, JSON.stringify(envelopes));
      return envelopes[index];
    }
    return null;
  } catch (error) {
    console.error('Failed to update envelope status:', error);
    return null;
  }
};

export const deleteEnvelope = (id) => {
  try {
    const envelopes = getEnvelopes();
    const filteredEnvelopes = envelopes.filter(envelope => envelope.id !== id);
    localStorage.setItem(ENVELOPE_STORAGE_KEY, JSON.stringify(filteredEnvelopes));
    return true;
  } catch (error) {
    console.error('Failed to delete envelope:', error);
    return false;
  }
};

export const getEnvelopesByChallenge = (challengeId) => {
  const envelopes = getEnvelopes();
  return envelopes.filter(envelope => envelope.challengeId === challengeId);
};

export const checkEnvelopeStatus = (envelope) => {
  const now = new Date();
  const unlockDate = new Date(envelope.unlockAt);
  
  if (now >= unlockDate) {
    return 'unlocked';
  } else {
    return 'locked';
  }
};

export const updateAllEnvelopeStatuses = () => {
  const envelopes = getEnvelopes();
  let updated = false;
  
  envelopes.forEach(envelope => {
    const newStatus = checkEnvelopeStatus(envelope);
    if (envelope.status !== newStatus) {
      envelope.status = newStatus;
      updated = true;
    }
  });
  
  if (updated) {
    localStorage.setItem(ENVELOPE_STORAGE_KEY, JSON.stringify(envelopes));
  }
  
  return envelopes;
};
