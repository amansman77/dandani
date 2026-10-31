import { getUserId } from '../utils/userId';
import { getClientTimeHeaders } from '../utils/clientTime';
import { API_URL } from './config';


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
// kind 'beat_three_days'는 작심삼일을 이겨낸 엽서 — 문장마다 한 장.
export async function createPostcard(phraseId, kind = 'regular') {
  let response;
  try {
    response = await fetch(`${API_URL}/api/nuv/postcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId(), ...getClientTimeHeaders() },
      body: JSON.stringify({ phrase_id: phraseId, kind }),
    });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new Error('연결하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '엽서를 만들지 못했어요. 다시 시도해 주세요.');
  return data;
}

// 헤더의 누브 수. 응답이 실패면 null — 누브가 문장 화면을 막으면 안 돼서 화면은 그냥 비워 둔다.
export async function fetchNuvBalance() {
  const response = await fetch(`${API_URL}/api/nuv`, {
    headers: { 'X-User-ID': getUserId() },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.balance;
}

// 엽서함.
export async function fetchSavedPostcards() {
  const response = await fetch(`${API_URL}/api/nuv/postcards`, {
    headers: { 'X-User-ID': getUserId() },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '엽서함을 불러오지 못했어요');
  return data.postcards;
}

// 엽서 배경 저장. 바꿀 수 있는 건 배경뿐이다(workers/src/nuv-service.js savePostcard).
export async function savePostcardBackground(postcardId, preset) {
  const response = await fetch(`${API_URL}/api/nuv/postcards/${postcardId}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-ID': getUserId() },
    body: JSON.stringify({ preset }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '엽서를 저장하지 못했어요');
  return data;
}
