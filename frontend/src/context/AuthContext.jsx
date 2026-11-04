import { useEffect, useState } from 'react';
import { AuthContext } from './appContexts';
import { login as loginRequest, normalizeRole } from '../services/authApi';
import { setAuthToken } from '../services/http';
import { stopBrowserPush } from '../services/pushApi';
import { clearChatSession } from '../services/chatApi';

const STORAGE_KEY = 'miniErpAuth';

function readSession() {
  try {
    const savedSession = window.localStorage.getItem(STORAGE_KEY);
    if (!savedSession) return { user: null, token: null };

    const session = JSON.parse(savedSession);
    if (!session?.user || typeof session.token !== 'string' || session.token.startsWith('mock-token-')) {
      window.localStorage.removeItem(STORAGE_KEY);
      return { user: null, token: null };
    }
    return {
      user: { ...session.user, role: normalizeRole(session.user.role) },
      token: session.token,
    };
  } catch {
    return { user: null, token: null };
  }
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const saved = readSession();
    setAuthToken(saved.token);
    return saved;
  });

  async function login(username, password) {
    const nextSession = await loginRequest(username, password);
    setAuthToken(nextSession.token);
    setSession({ user: nextSession.user, token: nextSession.token });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    } catch {
      // Vẫn dùng phiên trong bộ nhớ nếu trình duyệt chặn hoặc đầy localStorage.
    }
    return nextSession;
  }

  function updatePasswordState(mustChangePassword) {
    setSession(current => current.user ? {
      ...current,
      user: {
        ...current.user,
        must_change_password: mustChangePassword,
        temp_password_expires_at: mustChangePassword ? current.user.temp_password_expires_at : null,
      },
    } : current);
  }

  function logout() {
    clearChatSession();
    stopBrowserPush().catch(() => {});
    setAuthToken(null);
    setSession({ user: null, token: null });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Giao diện vẫn đăng xuất dù không truy cập được localStorage.
    }
  }

  useEffect(() => {
    function handleUnauthorized() {
      logout();
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    const handlePasswordChangeRequired = () => updatePasswordState(true);
    window.addEventListener('auth:password-change-required', handlePasswordChangeRequired);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:password-change-required', handlePasswordChangeRequired);
    };
  }, []);

  useEffect(() => {
    try {
      if (session.user && session.token) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Phiên vẫn hoạt động trong bộ nhớ nếu localStorage không truy cập được.
    }
  }, [session]);

  return (
    <AuthContext.Provider value={{ ...session, login, logout, markPasswordChanged: () => updatePasswordState(false) }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthProvider };
