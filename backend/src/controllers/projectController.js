import prisma from '../config/prisma.js';
import { parseId, isValidDate, toDateOnly } from '../utils/validators.js';

const serializeProject = (project) => ({
  ...project,
  start_date: toDateOnly(project.start_date),
  end_date: toDateOnly(project.end_date),
});

const validateProject = (body, creating) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Dữ liệu dự án phải là một đối tượng JSON' };
  }
  const fields = creating ? ['code', 'name', 'start_date', 'end_date'] : ['name', 'start_date', 'end_date'];
  const data = {};
  for (const field of fields) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return { error: creating
        ? 'Vui lòng nhập đủ mã dự án, tên dự án, ngày bắt đầu và ngày kết thúc'
        : 'Vui lòng nhập đủ tên dự án, ngày bắt đầu và ngày kết thúc' };
    }
    data[field] = body[field].trim();
  }
  if (creating && data.code.length > 20) return { error: 'Mã dự án không được quá 20 ký tự' };
  if (data.name.length > 200) return { error: 'Tên dự án không được quá 200 ký tự' };
  if (!isValidDate(data.start_date) || !isValidDate(data.end_date)) {
    return { error: 'Ngày không hợp lệ, cần dạng YYYY-MM-DD' };
  }
  // Chuỗi ngày chuẩn so sánh đúng thứ tự, không phụ thuộc múi giờ máy chủ.
  if (data.end_date < data.start_date) return { error: 'Ngày kết thúc không được trước ngày bắt đầu' };
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      return { error: 'Mô tả phải là chuỗi hoặc null' };
    }
    data.description = body.description?.trim() || null;
  }
  data.start_date = new Date(`${data.start_date}T00:00:00.000Z`);
  data.end_date = new Date(`${data.end_date}T00:00:00.000Z`);
  return { data };
};

export const createProject = async (req, res) => {
  try {
    const { data, error } = validateProject(req.body ?? {}, true);
    if (error) return res.status(400).json({ error });
    const existing = await prisma.projects.findUnique({ where: { code: data.code }, select: { id: true } });
    if (existing) return res.status(409).json({ error: 'Mã dự án đã tồn tại' });
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.projects.create({ data: { ...data, manager_id: req.employee.employee_id } });
      await tx.project_members.create({
        data: { project_id: created.id, employee_id: req.employee.employee_id },
      });
      return created;
    });
    res.status(201).json(serializeProject(project));
  } catch (error) {
    // Kiểm tra trước không chặn được hai yêu cầu cùng mã chạy đồng thời.
    if (error.code === 'P2002') return res.status(409).json({ error: 'Mã dự án đã tồn tại' });
    console.error('Không thể tạo dự án:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

export const listProjects = async (req, res) => {
  try {
    const projects = await prisma.projects.findMany({
      where: req.user.role === 'admin' ? {} : {
        project_members: { some: { employee_id: req.employee.employee_id } },
      },
      include: {
        employees: { select: { fullname: true } },
        _count: { select: { project_members: true } },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    if (!projects.length) return res.json([]);
    const groups = await prisma.tasks.groupBy({
      by: ['project_id', 'status'],
      where: { project_id: { in: projects.map((project) => project.id) } },
      _count: { _all: true },
    });
    const progress = new Map();
    for (const group of groups) {
      const counts = progress.get(group.project_id) ?? { tasks_done: 0, tasks_total: 0 };
      counts.tasks_total += group._count._all;
      if (group.status === 'xong') counts.tasks_done += group._count._all;
      progress.set(group.project_id, counts);
    }
    res.json(projects.map(({ employees, _count, ...project }) => {
      const counts = progress.get(project.id) ?? { tasks_done: 0, tasks_total: 0 };
      return {
        ...serializeProject(project),
        manager_name: employees.fullname,
        members_count: _count.project_members,
        ...counts,
        progress_percent: counts.tasks_total ? Math.round(counts.tasks_done / counts.tasks_total * 100) : 0,
      };
    }));
  } catch (error) {
    console.error('Không thể lấy danh sách dự án:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

const loadManagedProject = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID dự án phải là số nguyên dương hợp lệ' });
    return null;
  }
  const project = await prisma.projects.findUnique({ where: { id } });
  if (!project) {
    res.status(404).json({ error: 'Không tìm thấy dự án' });
    return null;
  }
  if (req.user.role !== 'admin' && project.manager_id !== req.employee.employee_id) {
    res.status(403).json({ error: 'Chỉ Quản lý dự án hoặc Admin được thực hiện thao tác này' });
    return null;
  }
  return project;
};

export const updateProject = async (req, res) => {
  try {
    const project = await loadManagedProject(req, res);
    if (!project) return;
    const body = req.body ?? {};
    if (body.code !== undefined && body.code !== project.code) {
      return res.status(400).json({ error: 'Không được đổi mã dự án' });
    }
    const { data, error } = validateProject(body, false);
    if (error) return res.status(400).json({ error });
    const deadlines = await prisma.tasks.aggregate({
      where: { project_id: project.id }, _max: { due_date: true },
    });
    const latest = toDateOnly(deadlines._max.due_date);
    if (latest && latest > toDateOnly(data.end_date)) {
      return res.status(409).json({ error: `Còn task có hạn chót ${latest}, sau ngày kết thúc mới` });
    }
    const updated = await prisma.projects.update({ where: { id: project.id }, data });
    res.json(serializeProject(updated));
  } catch (error) {
    console.error('Không thể sửa dự án:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};
