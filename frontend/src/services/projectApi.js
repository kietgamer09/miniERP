import { request } from './http';

export function listProjects() {
  return request('/api/projects');
}

export function createProject(data) {
  return request('/api/projects', { method: 'POST', body: data });
}

export function updateProject(id, data) {
  return request(`/api/projects/${id}`, { method: 'PUT', body: data });
}
