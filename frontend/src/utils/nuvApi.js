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
