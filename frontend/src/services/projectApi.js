import { request } from './http';

export const getProject = (id) => request(`/api/projects/${id}`);
export const completeProject = (id) => request(`/api/projects/${id}/complete`, { method: 'POST' });
export const reopenProject = (id) => request(`/api/projects/${id}/reopen`, { method: 'POST' });
export const listProjectTasks = (id) => request(`/api/projects/${id}/tasks`);
export const createTask = (id, data) => request(`/api/projects/${id}/tasks`, { method: 'POST', body: data });
export const listAvailableEmployees = (id) => request(`/api/projects/${id}/available-employees`);
export const addMembers = (id, employeeIds) => request(`/api/projects/${id}/members`, { method: 'POST', body: { employee_ids: employeeIds } });
export const removeMember = (id, employeeId) => request(`/api/projects/${id}/members/${employeeId}`, { method: 'DELETE' });

export function listProjects() {
  return request('/api/projects');
}

export function createProject(data) {
  return request('/api/projects', { method: 'POST', body: data });
}

export function updateProject(id, data) {
  return request(`/api/projects/${id}`, { method: 'PUT', body: data });
}

export function deleteProject(id) {
  return request(`/api/projects/${id}`, { method: 'DELETE' });
}
