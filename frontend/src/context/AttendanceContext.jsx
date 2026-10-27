import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { AttendanceContext } from './appContexts';
import { checkIn, checkOut, getTodayAttendance } from '../services/attendanceApi';
import { attendanceDay, isAttendanceWeekend, normalizeAttendance } from '../utils/attendance';

function AttendanceSession({ children, identity }) {
  const [state, setState] = useState({ day: attendanceDay(), record: null, dayInfo: null, loading: true, error: '', revision: 0 });
  const [busy, setBusy] = useState('');
  const pending = useRef(false);
  const alive = useRef(false);
  const sequence = useRef(0);
  const signature = useRef('');
  const channel = useRef(null);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await getTodayAttendance();
      const record = result?.record == null ? null : normalizeAttendance(result.record);
      if (!result?.day?.date || (result.record != null && !record)) throw new Error('Dữ liệu chấm công từ máy chủ không hợp lệ.');
      if (!alive.current || request !== sequence.current) return;
      const nextSignature = JSON.stringify({ day: result.day, record });
      const changed = signature.current !== nextSignature;
      signature.current = nextSignature;
      setState(previous => ({ day: result.day.date, record, dayInfo: result.day, loading: false, error: '',
        revision: previous.revision + Number(changed) }));
    } catch (error) {
      if (alive.current && request === sequence.current) setState(previous => ({ ...previous, loading: false,
        error: `${error.message || 'Không tải được chấm công'} Dữ liệu cũ (nếu có) chưa được xác minh lại.` }));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh();
    const visibleRefresh = () => { if (!document.hidden && !pending.current) refresh(); };
    const timer = setInterval(visibleRefresh, 15000);
    document.addEventListener('visibilitychange', visibleRefresh);
    window.addEventListener('focus', visibleRefresh);
    try {
      channel.current = new BroadcastChannel('miniErpAttendance');
      channel.current.onmessage = event => { if (event.data?.identity === identity) refresh(); };
    } catch { /* Trình duyệt không hỗ trợ: vẫn đồng bộ qua API khi mở tab và mỗi 15 giây. */ }
    const activeChannel = channel.current;
    return () => {
      alive.current = false;
      clearInterval(timer); document.removeEventListener('visibilitychange', visibleRefresh);
      window.removeEventListener('focus', visibleRefresh); activeChannel?.close();
    };
  }, [refresh, identity]);

  async function submitAttendance(action) {
    if (pending.current || !['in', 'out'].includes(action)) return null;
    pending.current = true;
    sequence.current++;
    setBusy(action);
    setState(previous => ({ ...previous, error: '' }));
    try {
      const result = await (action === 'in' ? checkIn() : checkOut());
      await refresh();
      channel.current?.postMessage({ identity });
      return result;
    } catch (error) {
      await refresh();
      if (alive.current) setState(previous => ({ ...previous, error: error.message || 'Không gửi được chấm công' }));
      throw error;
    } finally { pending.current = false; if (alive.current) setBusy(''); }
  }
  return <AttendanceContext.Provider value={{ ...state, busy, notice: '', weekend: isAttendanceWeekend(state.day),
    refresh, submitAttendance }}>{children}</AttendanceContext.Provider>;
}

export function AttendanceProvider({ children }) {
  const { user } = useAuth();
  const identity = user?.id ?? user?.username;
  return user ? <AttendanceSession key={identity} identity={identity}>{children}</AttendanceSession> : children;
}
