const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

function normalizeRole(role) {
  const normalizedRole = String(role || '').trim().toLocaleLowerCase('vi');
  const roleAliases = {
    member: 'employee',
    employee: 'employee',
    nhan_vien: 'employee',
    'nhân viên': 'employee',
    manager: 'manager',
    quan_ly: 'manager',
    'quản lý': 'manager',
    admin: 'admin',
  };
  return roleAliases[normalizedRole] || normalizedRole;
}

async function login(username, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.error || 'Đăng nhập thất bại');
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
    employee_id: apiUser.employee_id ?? null,
    username: apiUser.username,
    email: apiUser.email ?? apiUser.username,
    fullName: apiUser.fullName ?? apiUser.fullname ?? apiUser.username,
    role: normalizeRole(apiUser.role),
  };

  if (!normalizedUser.role) {
    throw new Error('Phản hồi đăng nhập thiếu vai trò người dùng');
  }

  return { token: payload.token, user: normalizedUser };
}

export { login, normalizeRole };
