import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { AttendanceContext } from './appContexts';
import { checkInApi, checkOutApi } from '../services/attendanceApi';
import { attendanceDay, isAttendanceWeekend, normalizeAttendance, readAttendance } from '../utils/attendance';

function AttendanceSession({ children, storageKey }) {
  const [day, setDay] = useState(attendanceDay);
  const [snapshot, setSnapshot] = useState(() => readAttendance(storageKey, attendanceDay()));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const record = snapshot?.date === day ? snapshot : null;
  useEffect(() => {
    const refreshDay = () => setDay(attendanceDay());
    const timer = setInterval(refreshDay, 15000);
    document.addEventListener('visibilitychange', refreshDay);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refreshDay); };
  }, []);

  async function submitAttendance(action) {
    if (pending.current || !['in', 'out'].includes(action)) return null;
    pending.current = true;
    setBusy(action);
    setError('');
    setNotice('');
    try {
      const result = await (action === 'in' ? checkInApi() : checkOutApi());
      const next = normalizeAttendance(result?.data);
      if (!next || (action === 'in' && !next.check_in) || (action === 'out' && !next.check_out)) {
        throw new Error('Máy chủ đã phản hồi nhưng dữ liệu chấm công không hợp lệ. Không gửi lại liên tục; hãy kiểm tra với quản trị viên.');
      }
      setSnapshot(next);
      const today = attendanceDay();
      setDay(today);
      if (next.date !== today) setNotice(`Máy chủ ghi công cho ngày ${next.date}, khác ngày hiện tại ở Việt Nam. Cần kiểm tra múi giờ backend.`);
      try { sessionStorage.setItem(storageKey, JSON.stringify(next)); }
      catch { setNotice('Chấm công đã được ghi trên máy chủ; trình duyệt không lưu được kết quả để hiển thị sau F5.'); }
      return result;
    } catch (err) {
      setError(err.message || 'Không gửi được yêu cầu chấm công');
      throw err;
    } finally { pending.current = false; setBusy(''); }
  }

  return <AttendanceContext.Provider value={{ day, record, busy, error, notice,
    weekend: isAttendanceWeekend(day), submitAttendance }}>{children}</AttendanceContext.Provider>;
}

export function AttendanceProvider({ children }) {
  const { user } = useAuth();
  const identity = user?.id ?? user?.username;
  return user ? <AttendanceSession key={identity} storageKey={`miniErpAttendance:v1:${identity}`}>
    {children}
  </AttendanceSession> : children;
}
