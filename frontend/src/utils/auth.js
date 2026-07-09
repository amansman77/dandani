const SESSION_KEY = 'dandaniSessionToken';

export function getSessionToken() {
  return localStorage.getItem(SESSION_KEY) || null;
}

export function setSessionToken(token) {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return !!getSessionToken();
}

export function getAuthHeaders() {
  const token = getSessionToken();
  return token ? { 'X-Session-Token': token } : {};
}
