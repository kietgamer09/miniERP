/** Gọi API xác thực của backend miniERP. */
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

async function login(username, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = new Error('Đăng nhập thất bại');
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  if (!payload.token || !payload.user) {
    throw new Error('Phản hồi đăng nhập từ máy chủ không hợp lệ');
  }

  const apiUser = payload.user;
  const normalizedUser = {
    id: apiUser.id ?? apiUser.user_id,
    username: apiUser.username,
    email: apiUser.email ?? apiUser.username,
    fullName: apiUser.fullName ?? apiUser.fullname ?? apiUser.username,
    role: apiUser.role,
  };

  if (!normalizedUser.role) {
    throw new Error('Phản hồi đăng nhập thiếu vai trò người dùng');
  }

  return { token: payload.token, user: normalizedUser };
}

export { login };
