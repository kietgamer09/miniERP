/** Các lời gọi API quản lý phòng ban. */
import { request } from './http';

function listDepartments() {
  return request('/api/departments/department-list');
}

function createDepartment(data) {
  return request('/api/departments/department-create', { method: 'POST', body: data });
}

function updateDepartment(id, data) {
  return request(`/api/departments/department-update/${id}`, { method: 'PUT', body: data });
}

function deleteDepartment(id) {
  return request(`/api/departments/department-delete/${id}`, { method: 'DELETE' });
}

export { listDepartments, createDepartment, updateDepartment, deleteDepartment };