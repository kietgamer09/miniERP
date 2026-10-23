/**
 * Bộ chuyển đổi response để phần còn lại của frontend không phụ thuộc schema backend.
 * Dữ liệu mock có thể bật tạm khi backend/database chưa sẵn sàng.
 */
const USE_MOCK = false;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MOCK_USERS = [
  { username: 'nhanvien@minierp.local', password: 'An@123456', id: 1, fullName: 'Nguyễn Văn An', role: 'employee' },
  { username: 'quanly@minierp.local', password: 'Minh@123456', id: 2, fullName: 'Trần Minh', role: 'manager' },
  { username: 'admin@minierp.local', password: 'Lan@123456', id: 3, fullName: 'Lê Thị Lan', role: 'admin' },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(username, password) {
  if (USE_MOCK) {
    await wait(400);
    const account = MOCK_USERS.find((item) => item.username === username && item.password === password);
    if (!account) {
      const error = new Error('Tài khoản hoặc mật khẩu không đúng');
      error.status = 401;
      throw error;
    }

    const { password: _password, ...user } = account;
    return {
      token: `mock-token-${user.id}`,
      user: { ...user, email: user.username },
    };
  }

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
