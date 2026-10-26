import { request } from './http';

export function listEmployees() {
  return request('/api/users/employee-list');
}

export function createEmployee(data) {
  return request('/api/users/employee-create', { method: 'POST', body: data });
}

export function updateEmployee(id, data) {
  return request(`/api/users/employee-update/${id}`, { method: 'PUT', body: data });
}
