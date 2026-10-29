/** Kiểm tra quyền truy cập task theo thành viên dự án; quản lý dự án được tùy chọn. */
export async function canAccessTaskProject(tx, task, employeeId, role, { allowProjectManager = false } = {}) {
  if (role === 'admin') return true;

  const membership = await tx.project_members.findUnique({
    where: { project_id_employee_id: { project_id: task.project_id, employee_id: employeeId } },
    select: { id: true },
  });
  if (membership) return true;

  return allowProjectManager
    && role === 'manager'
    && task.projects?.manager_id === employeeId;
}
