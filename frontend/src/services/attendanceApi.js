import { request } from './http';

export function checkIn() {
  return request('/api/attendances/check-in', { method: 'POST' });
}

export function checkOut(confirmedEarly = false) {
  return request('/api/attendances/check-out', {
    method: 'POST',
    body: { confirmedEarly },
  });
}

export function getTodayAttendance() {
  return request('/api/attendances/today');
}

export function getMyAttendances(month) {
  return request('/api/attendances/me', { params: { month } });
}

export function createAttendanceExplanation(body) {
  return request('/api/attendances/explanations', { method: 'POST', body });
}

export function listAttendanceExplanations(status) {
  return request('/api/attendances/explanations', { params: { status } });
}

export function reviewAttendanceExplanation(id, body) {
  return request(`/api/attendances/explanations/${id}/review`, { method: 'PUT', body });
}

export function getCompanyAttendanceSummary(month) {
  return request('/api/attendances/company-summary', { params: { month } });
}

export function getEmployeeAttendanceByAdmin(employeeId, month) {
  return request(`/api/attendances/employee-attendance/${employeeId}`, { params: { month } });
}