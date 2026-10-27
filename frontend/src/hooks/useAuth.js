import { useContext } from 'react';
import { AuthContext } from '../context/appContexts';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải nằm trong AuthProvider');
  return context;
}

export function useRole() {
  const { user } = useAuth();
  return { role: user?.role ?? null };
}
