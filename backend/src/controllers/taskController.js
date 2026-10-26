import prisma from '../config/prisma.js';
import { loadManagedProject } from './projectController.js';
import { parseId, isValidDate, toDateOnly } from '../utils/validators.js';

const taskFields = {
  id: true, project_id: true, title: true, description: true, assignee_id: true,
  created_by: true, due_date: true, priority: true, status: true, created_at: true, updated_at: true,
  employees_tasks_assignee_idToemployees: { select: { fullname: true } },
};

function serializeTask(task) {
  const { employees_tasks_assignee_idToemployees: assignee, ...data } = task;
  return { ...data, assignee_name: assignee.fullname, due_date: toDateOnly(task.due_date) };
}

function validateTask(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || typeof body.title !== 'string' || !body.title.trim()
    || !body.assignee_id || !body.due_date || !body.priority) {
    return { error: 'Vui lòng nhập đủ tiêu đề, người làm, hạn chót và mức ưu tiên' };
  }
  const title = body.title.trim();
  if (title.length > 200) return { error: 'Tiêu đề không được quá 200 ký tự' };
  if (!['thap', 'trung_binh', 'cao'].includes(body.priority)) return { error: 'Mức ưu tiên phải là thap, trung_binh hoặc cao' };
  if (!isValidDate(body.due_date)) return { error: 'Hạn chót không hợp lệ, cần dạng YYYY-MM-DD' };
  const assigneeId = parseId(body.assignee_id);
  if (!assigneeId) return { error: 'ID người làm phải là số nguyên dương hợp lệ' };
  return { title, assigneeId };
}

export const createTask = async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const project = await loadManagedProject(req, res, tx);
      if (!project) return null;
      if (project.status === 'hoan_thanh') return { status: 409, error: 'Dự án đã hoàn thành, hãy mở lại dự án để tạo task mới' };
      const body = req.body;
      const { title, assigneeId, error } = validateTask(body);
      if (error) return { status: 400, error };
      const member = await tx.project_members.findUnique({
        where: { project_id_employee_id: { project_id: project.id, employee_id: assigneeId } },
        select: { employees: { select: { status: true } } },
      });
      if (!member) return { status: 400, error: 'Người làm task phải là thành viên của dự án' };
      if (member.employees.status !== 'dang_lam_viec') return { status: 400, error: 'Nhân viên đã nghỉ việc' };
      const endDate = toDateOnly(project.end_date);
      if (body.due_date > endDate) return { status: 400, error: `Hạn chót không được sau ngày kết thúc dự án (${endDate})` };
      if (body.description != null && typeof body.description !== 'string') return { status: 400, error: 'Mô tả phải là chuỗi hoặc null' };
      const task = await tx.tasks.create({
        data: {
          project_id: project.id, title, description: body.description?.trim() || null,
          assignee_id: assigneeId, created_by: req.employee.employee_id,
          due_date: new Date(`${body.due_date}T00:00:00.000Z`), priority: body.priority, status: 'can_lam',
        },
        select: taskFields,
      });
      return { task };
    }, { isolationLevel: 'Serializable' });
    if (!result) return;
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(201).json(serializeTask(result.task));
  } catch (error) {
    console.error('Không thể tạo task:', error);
    if (res.headersSent) return;
    if (error.code === 'P2034') return res.status(409).json({ error: 'Dữ liệu dự án vừa thay đổi, vui lòng thử lại' });
    res.status(500).json({ error: 'Lỗi máy chủ khi tạo task' });
  }
};

export const listProjectTasks = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID dự án phải là số nguyên dương hợp lệ' });
    const project = await prisma.projects.findUnique({
      where: { id },
      select: { id: true, project_members: { where: { employee_id: req.employee.employee_id }, select: { employee_id: true } } },
    });
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (req.user.role !== 'admin' && !project.project_members.length) return res.status(403).json({ error: 'Bạn không thuộc dự án này' });
    const tasks = await prisma.tasks.findMany({ where: { project_id: id }, select: taskFields, orderBy: [{ due_date: 'asc' }, { id: 'asc' }] });
    res.json(tasks.map(serializeTask));
  } catch (error) {
    console.error('Không thể lấy danh sách task:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách task' });
  }
};
