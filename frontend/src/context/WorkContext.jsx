import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { loadMyWork } from '../services/workApi';

import { WorkContext } from './appContexts';

function WorkSession({ children }) {
  const [state, setState] = useState({ tasks: [], profile: null, loading: true, error: '', warning: '' });
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    let running = false;
    async function refresh() {
      if (running || document.hidden) return;
      running = true;
      try {
        const { tasks, failedProjects, profile } = await loadMyWork();
        if (active) setState({ tasks, profile, loading: false, error: '', warning: failedProjects.length
          ? `Chưa tải được công việc của ${failedProjects.length} dự án. Danh sách có thể chưa đầy đủ.` : '' });
      } catch (error) {
        if (active) setState(previous => ({ ...previous, loading: false, error: error.message || 'Không tải được công việc' }));
      } finally { running = false; }
    }
    refresh();
    const timer = window.setInterval(refresh, 60000);
    const visible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [reloadKey]);
  return <WorkContext.Provider value={{ ...state, reload: () => {
    setState(previous => ({ ...previous, loading: true, error: '' }));
    setReloadKey(value => value + 1);
  } }}>
    {children}
  </WorkContext.Provider>;
}

export function WorkProvider({ children }) {
  const { user } = useAuth();
  return user ? <WorkSession key={user.id ?? user.username}>{children}</WorkSession> : children;
}

