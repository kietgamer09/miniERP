import { useContext } from 'react';
import { AttendanceContext } from '../context/appContexts';

const emptyAttendance = {
  day: null, record: null, dayInfo: null, loading: false, error: '', revision: 0,
  busy: '', notice: '', weekend: false, refresh: async () => {}, submitAttendance: async () => null,
};

export function useAttendance() { return useContext(AttendanceContext) ?? emptyAttendance; }
