export async function assertCanWriteProjectComment(tx, { projectId, employeeId, role }) {
  if (role === 'admin') return;

  const membership = await tx.$queryRaw`
    SELECT 1 FROM project_members
    WHERE project_id = ${projectId} AND employee_id = ${employeeId}
    FOR SHARE`;
  if (membership.length) return;

  if (role === 'manager') {
    const managedProject = await tx.$queryRaw`
      SELECT 1 FROM projects
      WHERE id = ${projectId} AND manager_id = ${employeeId}
      FOR SHARE`;
    if (managedProject.length) return;
  }

  throw Object.assign(new Error('Bạn không thuộc dự án này'), { status: 403 });
}
