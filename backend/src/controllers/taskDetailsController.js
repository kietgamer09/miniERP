import prisma from '../config/prisma.js';
import { formatTask, taskFields, validateTask } from './taskController.js';
import { parseId, toDateOnly } from '../utils/validators.js';
import { dueDateError } from '../utils/taskRules.js';
import { randomUUID } from 'node:crypto';
import { isRecurrenceFrequency, isWeekendDate, recurrenceAnchorDay } from '../utils/taskRecurrence.js';

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
      if (Object.hasOwn(body || {}, 'recurrence_frequency')
        && body.recurrence_frequency !== null && body.recurrence_frequency !== ''
        && !isRecurrenceFrequency(body.recurrence_frequency)) {
        return errorResult(400, 'Chu kỳ lặp phải là daily, weekly hoặc monthly');
      }
      if (task.status === 'xong' && Object.hasOwn(body || {}, 'recurrence_frequency')
        && body.recurrence_frequency !== task.recurrence_frequency) {
        return errorResult(409, 'Không thể thay đổi chu kỳ lặp của task đã hoàn thành');
      }
      const { title, assigneeId, error } = validateTask(body);
      if (error) return errorResult(400, error);
      const effectiveFrequency = body.recurrence_frequency === undefined
        ? task.recurrence_frequency : body.recurrence_frequency;
      if (effectiveFrequency && isWeekendDate(body.due_date)) {
        return errorResult(400, 'Task lặp lại chỉ được đặt hạn từ Thứ 2 đến Thứ 6');
      }

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

      const dateError = dueDateError(body.due_date, task.projects);
      if (dateError) return errorResult(400, dateError);
      if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
        return errorResult(400, 'Mô tả phải là chuỗi hoặc null');
      }

      const recurrenceData = {};
      if (Object.hasOwn(body, 'recurrence_frequency')) {
        const frequency = body.recurrence_frequency || null;
        recurrenceData.recurrence_frequency = frequency;
        recurrenceData.recurrence_series_id = frequency
          ? (task.recurrence_series_id || randomUUID())
          : null;
        recurrenceData.recurrence_anchor_day = frequency
          ? (frequency !== task.recurrence_frequency || toDateOnly(task.due_date) !== body.due_date
            ? recurrenceAnchorDay(body.due_date, frequency)
            : task.recurrence_anchor_day || recurrenceAnchorDay(body.due_date, frequency))
          : null;
      }

      const updatedTask = await tx.tasks.update({
        where: { id },
        data: {
          title,
          description: body.description === undefined ? task.description : body.description?.trim() || null,
          assignee_id: assigneeId,
          due_date: new Date(`${body.due_date}T00:00:00.000Z`),
          due_time: body.due_time === undefined ? task.due_time || '17:00' : body.due_time,
          priority: body.priority,
          ...recurrenceData,
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
