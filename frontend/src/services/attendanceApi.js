import { request } from './http';

// --- Các hàm cũ của bạn ---
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
  return request('/api/attendances/create-explanations', { method: 'POST', body });
}

// Lấy danh sách đơn giải trình (cho Admin / Manager)
export function getAttendanceExplanations(status) {
  const query = status ? `?status=${status}` : '';
  return request(`/api/attendances/explanations-lists${query}`);
}

// Duyệt hoặc từ chối giải trình
export function reviewAttendanceExplanation(id, body) {
  return request(`/api/attendances/review-explanations/${id}/review`, {
    method: 'PUT',
    body
  });
}

export async function cancelAttendanceExplanation(id) {
  return request(`/api/attendances/cancel-explanations/${id}`, {
    method: 'DELETE'
  });
}

// --- BỔ SUNG MỚI CHO BẢNG CÔNG CÔNG TY & XEM CHI TIẾT NHÂN VIÊN ---
export function getCompanyAttendanceSummary(month) {
  return request('/api/attendances/company-summary', { params: { month } });
}

export function getEmployeeAttendanceByAdmin(employeeId, month) {
  return request(`/api/attendances/employee-attendance/${employeeId}`, { params: { month } });
}