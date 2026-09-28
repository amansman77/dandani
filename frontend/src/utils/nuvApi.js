import { getUserId } from './userId';
import { getClientTimeHeaders } from './clientTime';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

export async function fetchNuvLedger() {
  let response;
  try {
    response = await fetch(`${API_URL}/api/nuv/ledger`, {
      headers: { 'X-User-ID': getUserId(), ...getClientTimeHeaders() },
    });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new Error('연결하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.');
  }
  if (!response.ok) throw new Error('누브 장부를 불러오지 못했어요. 다시 시도해 주세요.');
  return response.json();
}

// 지금 문장을 엽서로. 같은 날 다시 부르면 그날의 엽서를 돌려준다.
export async function createPostcard(phraseId) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/nuv/postcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId(), ...getClientTimeHeaders() },
      body: JSON.stringify({ phrase_id: phraseId }),
    });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new Error('연결하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '엽서를 만들지 못했어요. 다시 시도해 주세요.');
  return data;
}
