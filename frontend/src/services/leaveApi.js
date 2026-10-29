import { request } from './http';

export function createLeaveRequest(body) {
  return request('/api/leaves/create-leave-request', { method: 'POST', body });
}

export function getLeaveSummary() {
  return request('/api/leaves/summary');
}

export function cancelLeaveRequest(id) {
  return request(`/api/leaves/cancel-request/${id}`, { method: 'DELETE' });
}

export function getLeaveRequests(status) {
  const query = status ? `?status=${status}` : '';
  return request(`/api/leaves/request-leave${query}`);
}

export function reviewLeaveRequest(id, body) {
  return request(`/api/leaves/review-request/${id}/review`, {
    method: 'PUT',
    body
  });
}

/** Hợp đồng tạm: endpoint tổng hợp do backend Nhân sự xác nhận sau. */
export async function getPendingLeaveCount() {
  const data = await request('/api/leave-requests/pending-count');
  if (!Number.isInteger(data?.count) || data.count < 0) {
    throw new Error('Dữ liệu số đơn nghỉ phép không hợp lệ');
  }
  return data.count;
}

