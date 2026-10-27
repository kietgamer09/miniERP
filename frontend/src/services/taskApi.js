import { request } from './http';

export const listMyTasks = () => request('/api/tasks/mine');
export const getTask = (id) => request(`/api/tasks/${id}`);
export const updateTask = (id, data) => request(`/api/tasks/${id}`, { method: 'PUT', body: data });
export const changeTaskStatus = (id, status) => request(`/api/tasks/${id}/status`, { method: 'PATCH', body: { status } });
