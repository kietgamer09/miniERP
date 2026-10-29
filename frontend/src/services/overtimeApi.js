import { request } from './http';
export const OVERTIME_CHANGED = 'miniERP:overtime-changed';
const base = '/api/overtime';
async function mutate(path, body) {
  const result = await request(`${base}${path}`, { method: 'POST', body });
  window.dispatchEvent(new Event(OVERTIME_CHANGED));
  return result;
}
export const listOvertime = params => request(base, { params });
export const getOvertime = id => request(`${base}/${id}`);
export const createOvertime = body => mutate('', body);
export const reviewOvertime = (id, body) => mutate(`/${id}/review`, body);
export const cancelOvertime = id => mutate(`/${id}/cancel`);
export const overtimeNotifications = () => request(`${base}/notifications`);
export const readOvertimeNotifications = ids => request(`${base}/notifications/read`, { method: 'PATCH', body: { ids } });
