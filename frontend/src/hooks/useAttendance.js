import { useContext } from 'react';
import { AttendanceContext } from '../context/appContexts';

export function useAttendance() { return useContext(AttendanceContext); }
