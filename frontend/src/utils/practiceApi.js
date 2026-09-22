import { getUserId } from './userId';
import { getClientTimeHeaders } from './clientTime';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

async function practiceRequest(path, body) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/practices${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json', 'X-User-ID': getUserId(), ...getClientTimeHeaders(),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new Error('연결하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.');
  }
  let data;
  try {
    data = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error('서버 응답을 읽지 못했어요. 다시 시도해 주세요.');
  }
  if (!response.ok) throw new Error(data.error || '실천 기록을 남기지 못했어요. 다시 시도해 주세요.');
  return data;
}

export const fetchPracticeRecords = phraseId =>
  practiceRequest(phraseId ? `?phrase_id=${encodeURIComponent(phraseId)}` : '');

export const savePracticeRecord = (phraseId, body, practicedOn) =>
  practiceRequest('', { phrase_id: phraseId, body, practiced_on: practicedOn });
