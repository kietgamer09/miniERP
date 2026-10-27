import { parseDateOnly } from './dates';
import { TASK_PRIORITY_LABELS } from '../config/taskConstants';

const statusMap = { can_lam: 'todo', dang_lam: 'doing', xong: 'done' };

// Giữ trường API snake_case, chỉ bổ sung tên mà component hiện có cần đọc.
export function adaptTask(task) {
  return {
    ...task,
    status_code: task.status,
    status: statusMap[task.status] || task.status,
    priority_code: task.priority,
    priority: TASK_PRIORITY_LABELS[task.priority] || task.priority,
    projectName: task.project_name,
    dueDate: parseDateOnly(task.due_date),
    completedAt: task.completed_at ? new Date(task.completed_at) : null,
  };
}

export function adaptTasks(tasks) {
  return Array.isArray(tasks) ? tasks.map(adaptTask) : [];
}
