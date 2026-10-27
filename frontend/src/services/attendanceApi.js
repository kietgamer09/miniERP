import { request } from './http';

export const checkIn = () => request('/api/attendances/check-in', { method: 'POST' });
export const checkOut = () => request('/api/attendances/check-out', { method: 'POST' });
