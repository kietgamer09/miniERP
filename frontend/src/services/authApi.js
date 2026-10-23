/**
 * API đăng nhập được cô lập tại một chỗ để dễ thay hợp đồng backend.
 * Tài khoản/mật khẩu ở đây chỉ là dữ liệu giả cho giao diện phát triển.
 * Khi chạy thật, backend phải kiểm tra mật khẩu (bcrypt) và phát hành JWT.
 */
const USE_MOCK = true;

const MOCK_USERS = [
  { email: 'nhanvien@minierp.local', password: 'An@123456', id: 1, fullName: 'Nguyễn Văn An', role: 'employee' },
  { email: 'quanly@minierp.local', password: 'Minh@123456', id: 2, fullName: 'Trần Minh', role: 'manager' },
  { email: 'admin@minierp.local', password: 'Lan@123456', id: 3, fullName: 'Lê Thị Lan', role: 'admin' },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(email, password) {
  if (USE_MOCK) {
    await wait(400);
    const account = MOCK_USERS.find((item) => item.email === email && item.password === password);
    if (!account) {
      const error = new Error('Email hoặc mật khẩu không đúng');
      error.status = 401;
      throw error;
    }

    const { password: _password, ...user } = account;
    return { token: `mock-token-${user.id}`, user };
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = new Error('Đăng nhập thất bại');
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export { login };
