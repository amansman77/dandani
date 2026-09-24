import { getUserId } from './userId';
import { getClientTimeHeaders } from './clientTime';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

async function phraseRequest(path, body) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/phrases${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId(), ...getClientTimeHeaders() },
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
  if (!response.ok) throw new Error(data.error || '문장을 저장하지 못했어요. 다시 시도해 주세요.');
  return data;
}

export const fetchActivePhrase = () => phraseRequest('/active');
export const savePhrase = (text, currentId, source) => phraseRequest(
  currentId ? `/${encodeURIComponent(currentId)}/replace` : '',
  { phrase: text.trim(), ...(source ? { source } : {}) },
);
export const logPhraseToday = id => phraseRequest(`/${encodeURIComponent(id)}/log`, {});
