import prisma from '../config/prisma.js';
import { formatTask, taskFields, validateTask } from './taskController.js';
import { parseId, toDateOnly } from '../utils/validators.js';

function errorResult(status, error) {
  return { status, error };
}

export const getTaskDetails = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID task phải là số nguyên dương hợp lệ' });

  try {
    const task = await prisma.tasks.findUnique({ where: { id }, select: taskFields });
    if (!task) return res.status(404).json({ error: 'Không tìm thấy task' });

    if (req.user.role !== 'admin') {
      const membership = await prisma.project_members.findUnique({
        where: { project_id_employee_id: { project_id: task.project_id, employee_id: req.employee.employee_id } },
        select: { id: true },
      });
      if (!membership && !(req.user.role === 'manager' && task.projects.manager_id === req.employee.employee_id)) {
        return res.status(403).json({ error: 'Bạn không thuộc dự án này' });
      }
    }

    return res.json(formatTask(task, {
      employeeId: req.employee.employee_id, role: req.user.role,
    }));
  } catch (error) {
    console.error('Không thể lấy chi tiết task:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy chi tiết task' });
  }
};

export const updateTaskDetails = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID task phải là số nguyên dương hợp lệ' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.tasks.findUnique({ where: { id }, select: taskFields });
      if (!task) return errorResult(404, 'Không tìm thấy task');

      const canManage = req.user.role === 'admin'
        || (req.user.role === 'manager' && task.projects.manager_id === req.employee.employee_id);
      if (!canManage) return errorResult(403, 'Chỉ Quản lý dự án hoặc Admin được sửa task');
      if (task.projects.status === 'hoan_thanh') {
        return errorResult(409, 'Dự án đã hoàn thành, hãy mở lại dự án để sửa task');
      }

      const body = req.body;
      const { title, assigneeId, error } = validateTask(body);
      if (error) return errorResult(400, error);

      if (assigneeId !== task.assignee_id) {
        const membership = await tx.project_members.findUnique({
          where: { project_id_employee_id: { project_id: task.project_id, employee_id: assigneeId } },
          select: { employees: { select: { status: true } } },
        });
        if (!membership) return errorResult(400, 'Người làm task phải là thành viên của dự án');
        if (membership.employees.status !== 'dang_lam_viec') {
          return errorResult(400, 'Nhân viên đã nghỉ việc');
        }
      }

      const projectEndDate = toDateOnly(task.projects.end_date);
      if (body.due_date > projectEndDate) {
        return errorResult(400, `Hạn chót không được sau ngày kết thúc dự án (${projectEndDate})`);
      }
      if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
        return errorResult(400, 'Mô tả phải là chuỗi hoặc null');
      }

      const updatedTask = await tx.tasks.update({
        where: { id },
        data: {
          title,
          description: body.description === undefined ? task.description : body.description?.trim() || null,
          assignee_id: assigneeId,
          due_date: new Date(`${body.due_date}T00:00:00.000Z`),
          priority: body.priority,
          updated_at: new Date(),
        },
        select: taskFields,
      });
      return { task: updatedTask };
    }, { isolationLevel: 'Serializable' });

    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.json(formatTask(result.task, {
      employeeId: req.employee.employee_id, role: req.user.role,
    }));
  } catch (error) {
    console.error('Không thể sửa task:', error);
    if (error.code === 'P2034') {
      return res.status(409).json({ error: 'Dữ liệu task vừa thay đổi, vui lòng thử lại' });
    }
    return res.status(500).json({ error: 'Lỗi máy chủ khi sửa task' });
  }
};
