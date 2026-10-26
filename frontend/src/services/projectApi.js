import { request } from './http';

export const listProjects = () => request('/api/projects');
export const getProject = (id) => request(`/api/projects/${id}`);
export const createProject = (data) => request('/api/projects', { method: 'POST', body: data });
export const updateProject = (id, data) => request(`/api/projects/${id}`, { method: 'PUT', body: data });
export const deleteProject = (id) => request(`/api/projects/${id}`, { method: 'DELETE' });
export const completeProject = (id) => request(`/api/projects/${id}/complete`, { method: 'POST' });
export const reopenProject = (id) => request(`/api/projects/${id}/reopen`, { method: 'POST' });
export const listAvailableEmployees = (id) => request(`/api/projects/${id}/available-employees`);
export const addMembers = (id, employeeIds) => request(`/api/projects/${id}/members`, { method: 'POST', body: { employee_ids: employeeIds } });
export const removeMember = (id, employeeId) => request(`/api/projects/${id}/members/${employeeId}`, { method: 'DELETE' });
export const listProjectTasks = (id) => request(`/api/projects/${id}/tasks`);
export const createTask = (id, data) => request(`/api/projects/${id}/tasks`, { method: 'POST', body: data });
