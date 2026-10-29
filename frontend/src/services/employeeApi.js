import { request } from './http';

export function listEmployees(params) {
  return request('/api/users/employee-list', { params }); // Thêm { params } vào đây
}

export function getMyProfile() {
  return request('/api/users/me');
}

export function createEmployee(data) {
  return request('/api/users/employee-create', { method: 'POST', body: data });
}

export function updateEmployee(id, data) {
  return request(`/api/users/employee-update/${id}`, { method: 'PUT', body: data });
}

export function updateEmployeesDepartment(data) {
  return request('/api/users/update-department', { method: 'PUT', body: data });
}
