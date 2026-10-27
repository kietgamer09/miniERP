import { request } from './http';

export const checkIn = () => request('/api/attendances/check-in', { method: 'POST' });
export const checkOut = () => request('/api/attendances/check-out', { method: 'POST' });
export const getTodayAttendance = () => request('/api/attendances/today');
export const getMyAttendances = month => request('/api/attendances/me', { params: { month } });
export const createAttendanceExplanation = data => request('/api/attendances/explanations', { method: 'POST', body: data });
export const listAttendanceExplanations = status => request('/api/attendances/explanations', { params: { status } });
export const reviewAttendanceExplanation = (id, data) => request(`/api/attendances/explanations/${id}/review`, { method: 'PUT', body: data });
