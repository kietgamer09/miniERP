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