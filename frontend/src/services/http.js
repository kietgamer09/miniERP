/** Hàm gọi API dùng chung cho các dịch vụ frontend. */
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const STORAGE_KEY = 'miniErpAuth';

function readToken() {
  try {
    const session = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return typeof session?.token === 'string' ? session.token : '';
  } catch {
    return '';
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    const error = new Error('Không kết nối được máy chủ');
    error.status = 0;
    throw error;
  }

  if (response.status === 204) return null;

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || 'Có lỗi xảy ra');
    error.status = response.status;
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw error;
  }

  return payload;
}

export { request };
