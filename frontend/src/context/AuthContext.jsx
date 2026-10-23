/** Quản lý tài khoản và phiên đăng nhập trong giao diện. */
import { createContext, useContext, useState } from 'react';
import { login as loginRequest } from '../services/authApi';

const STORAGE_KEY = 'miniErpAuth';
const AuthContext = createContext(null);

function readSession() {
  try {
    const savedSession = window.localStorage.getItem(STORAGE_KEY);
    if (!savedSession) return { user: null, token: null };

    const session = JSON.parse(savedSession);
    if (!session?.user || typeof session.token !== 'string') {
      return { user: null, token: null };
    }
    return { user: session.user, token: session.token };
  } catch {
    return { user: null, token: null };
  }
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  async function login(email, password) {
    const nextSession = await loginRequest(email, password);
    setSession({ user: nextSession.user, token: nextSession.token });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    } catch {
      // Vẫn dùng phiên trong bộ nhớ nếu trình duyệt chặn hoặc đầy localStorage.
    }
    return nextSession;
  }

  function logout() {
    setSession({ user: null, token: null });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Giao diện vẫn đăng xuất dù không truy cập được localStorage.
    }
  }

  return (
    <AuthContext.Provider value={{ ...session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải nằm trong AuthProvider');
  return context;
}

/** Giữ API hook cũ để các component chỉ cần lấy vai trò tiếp tục hoạt động. */
function useRole() {
  const { user } = useAuth();
  return { role: user?.role ?? null };
}

export { AuthProvider, useAuth, useRole };
