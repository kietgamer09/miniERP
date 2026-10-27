import { getMyProfile } from './employeeApi';
import { listMyTasks } from './taskApi';

/** Tải hồ sơ phục vụ header và danh sách việc đã lọc theo nhân viên từ backend. */
export async function loadMyWork() {
  const [profile, tasks] = await Promise.all([getMyProfile(), listMyTasks()]);
  if (!profile?.employee_id || !Array.isArray(tasks)) throw new Error('Dữ liệu công việc không hợp lệ');
  return { tasks, failedProjects: [], profile };
}
