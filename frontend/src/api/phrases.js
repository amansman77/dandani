import { getUserId } from '../utils/userId';
import { getClientTimeHeaders } from '../utils/clientTime';
import { API_URL } from './config';


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

// 기록 탭. 실패 문구는 화면이 그대로 보여 준다.
export async function fetchPhraseHistory() {
  const response = await fetch(`${API_URL}/api/phrases/history`, {
    headers: { 'X-User-ID': getUserId() },
  });
  if (!response.ok) throw new Error(`Failed to fetch history: ${response.status}`);
  const data = await response.json();
  return data.phrases || [];
}

// 다른 사람들의 아침. 부가 데이터라 실패해도 조용히 빈 목록을 돌려준다.
export async function fetchCommunityPhrases() {
  try {
    const response = await fetch(`${API_URL}/api/phrases/community`, {
      headers: { 'X-User-ID': getUserId() },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (err) {
    return [];
  }
}
