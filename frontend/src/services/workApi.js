import { getMyProfile } from './employeeApi';
import { listProjects, listProjectTasks } from './projectApi';

/** Backend chưa có endpoint việc của tôi: chỉ tổng hợp các dự án tài khoản được phép xem. */
export async function loadMyWork() {
  const [profile, projects] = await Promise.all([getMyProfile(), listProjects()]);
  if (!profile?.employee_id || !Array.isArray(projects)) throw new Error('Dữ liệu công việc không hợp lệ');
  const tasks = [];
  const failedProjects = [];
  // Giới hạn 4 yêu cầu đồng thời, tránh dồn tải khi admin có nhiều dự án.
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, projects.length) }, async () => {
    while (index < projects.length) {
      const project = projects[index++];
      try {
        const items = await listProjectTasks(project.id);
        if (!Array.isArray(items)) throw new Error('Dữ liệu task không hợp lệ');
        tasks.push(...items.filter(task => task.assignee_id === profile.employee_id)
          .map(task => ({ ...task, project_name: project.name, project_status: project.status })));
      } catch (error) {
        if (error.status === 401) throw error;
        failedProjects.push(project.name);
      }
    }
  }));
  return { tasks, failedProjects, profile };
}
