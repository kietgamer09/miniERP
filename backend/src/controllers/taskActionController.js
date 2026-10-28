import prisma from '../config/prisma.js';
import { formatTask, taskFields } from './taskController.js';
import { parseId } from '../utils/validators.js';
import { getAllowedMoves } from '../utils/taskRules.js';

const statuses = ['can_lam', 'dang_lam', 'xong'];

function sendMoveError(res, result) {
  return res.status(result.status).json({ error: result.error });
}

export const changeTaskStatus = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID task phải là số nguyên dương hợp lệ' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.tasks.findUnique({ where: { id }, select: taskFields });
      if (!task) return { status: 404, error: 'Không tìm thấy task' };

      const employeeId = req.employee.employee_id;
      const isAdmin = req.user.role === 'admin';
      const isMember = isAdmin || Boolean(await tx.project_members.findUnique({
        where: { project_id_employee_id: { project_id: task.project_id, employee_id: employeeId } },
        select: { id: true },
      }));
      if (!isMember && !(req.user.role === 'manager' && task.projects.manager_id === employeeId)) {
        return { status: 403, error: 'Bạn không thuộc dự án này' };
      }

      const targetStatus = req.body?.status;
      if (!statuses.includes(targetStatus)) return { status: 400, error: 'Trạng thái không hợp lệ' };
      if (task.projects.status === 'hoan_thanh') {
        return { status: 409, error: 'Dự án đã hoàn thành, hãy mở lại dự án để đổi trạng thái task' };
      }
      if (targetStatus === task.status) return { status: 409, error: 'Task đã ở trạng thái này' };

      const distance = Math.abs(statuses.indexOf(targetStatus) - statuses.indexOf(task.status));
      if (distance !== 1) return { status: 409, error: 'Chỉ được chuyển task sang cột kề nhau' };

      const canManage = isAdmin
        || (req.user.role === 'manager' && task.projects.manager_id === employeeId);
      const isAssignee = task.assignee_id === employeeId;
      const allowedMoves = getAllowedMoves({
        status: task.status,
        isAssignee,
        canManage,
        projectStatus: task.projects.status,
      });
      if (!allowedMoves.includes(targetStatus)) {
        if (!canManage && !isAssignee) {
          return { status: 403, error: 'Bạn chỉ được đổi trạng thái task do mình phụ trách' };
        }
        if (!canManage && task.status === 'xong') {
          return { status: 403, error: 'Chỉ Quản lý dự án hoặc Admin được kéo lùi task đã Xong' };
        }
        return { status: 403, error: 'Bạn chỉ được đổi trạng thái task do mình phụ trách' };
      }

      const now = new Date();
      const updated = await tx.tasks.updateMany({
        where: { id, status: task.status },
        data: {
          status: targetStatus,
          completed_at: targetStatus === 'xong' ? now : null,
          updated_at: now,
        },
      });
      if (!updated.count) {
        return { status: 409, error: 'Task vừa được người khác thay đổi, hãy tải lại' };
      }

      const savedTask = await tx.tasks.findUnique({ where: { id }, select: taskFields });
      return { task: savedTask };
    });

    if (result.error) return sendMoveError(res, result);
    return res.json(formatTask(result.task, {
      employeeId: req.employee.employee_id, role: req.user.role,
    }));
  } catch (error) {
    console.error('Không thể đổi trạng thái task:', error);
    if (error.code === 'P2034') {
      return res.status(409).json({ error: 'Task vừa được người khác thay đổi, hãy tải lại' });
    }
    return res.status(500).json({ error: 'Lỗi máy chủ khi đổi trạng thái task' });
  }
};
