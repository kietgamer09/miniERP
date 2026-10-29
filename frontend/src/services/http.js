/** Hàm gọi API dùng chung cho các dịch vụ frontend. */
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
let currentToken = '';
let sessionVersion = 0;

// AuthProvider đồng bộ token trước khi giao diện gửi yêu cầu API.
function setAuthToken(token) {
  currentToken = typeof token === 'string' ? token : '';
  sessionVersion += 1;
}

async function request(path, { method = 'GET', body, params, file, download = false } = {}) {
  const headers = { 'Content-Type': file ? 'application/octet-stream' : 'application/json' };
  if (file) headers['X-File-Name'] = encodeURIComponent(file.name);
  const token = currentToken;
  const requestSession = sessionVersion;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    }
    const suffix = query.size ? `${path.includes('?') ? '&' : '?'}${query}` : '';
    response = await fetch(`${API_URL}${path}${suffix}`, {
      method,
      headers,
      ...(file ? { body: file } : body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    const error = new Error('Không kết nối được máy chủ');
    error.status = 0;
    throw error;
  }

  if (response.status === 204) return null;
  if (response.ok && download) return response.blob();

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || 'Có lỗi xảy ra');
    error.status = response.status;
    if (response.status === 401 && token && requestSession === sessionVersion) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw error;
  }

  return payload;
}

export { request, setAuthToken };
