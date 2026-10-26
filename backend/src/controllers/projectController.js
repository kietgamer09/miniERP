import prisma from '../config/prisma.js';
import { parseId, isValidDate, toDateOnly } from '../utils/validators.js';

const serializeProject = (project) => ({
  ...project,
  start_date: toDateOnly(project.start_date),
  end_date: toDateOnly(project.end_date),
});

const canManageProject = (req, project) => req.user.role === 'admin'
  || project.manager_id === req.employee.employee_id;

function getTodayDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

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
  if (creating && data.end_date < getTodayDate()) {
    return { error: 'Ngày kết thúc dự án mới không được trước ngày hiện tại' };
  }
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
        can_manage: canManageProject(req, project),
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

export const getProject = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID dự án phải là số nguyên dương hợp lệ' });

    const project = await prisma.projects.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        start_date: true,
        end_date: true,
        status: true,
        manager_id: true,
        created_at: true,
        employees: { select: { fullname: true } },
        project_members: {
          select: {
            employee_id: true,
            employees: { select: { fullname: true, position: true } },
          },
        },
      },
    });
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });

    const isMember = project.project_members.some(
      (member) => member.employee_id === req.employee.employee_id,
    );
    if (req.user.role !== 'admin' && !isMember) {
      return res.status(403).json({ error: 'Bạn không thuộc dự án này' });
    }

    const taskGroups = await prisma.tasks.groupBy({
      by: ['status'],
      where: { project_id: id },
      _count: { _all: true },
    });
    const taskCounts = taskGroups.reduce((counts, group) => ({
      tasks_done: counts.tasks_done + (group.status === 'xong' ? group._count._all : 0),
      tasks_total: counts.tasks_total + group._count._all,
    }), { tasks_done: 0, tasks_total: 0 });

    const { employees, project_members: members, ...projectData } = project;
    res.json({
      ...serializeProject(projectData),
      manager_name: employees.fullname,
      can_manage: canManageProject(req, projectData),
      members: members.map((member) => ({
        employee_id: member.employee_id,
        fullname: member.employees.fullname,
        position: member.employees.position,
        is_manager: member.employee_id === project.manager_id,
      })),
      ...taskCounts,
      progress_percent: taskCounts.tasks_total
        ? Math.round(taskCounts.tasks_done / taskCounts.tasks_total * 100)
        : 0,
    });
  } catch (error) {
    console.error('Không thể lấy chi tiết dự án:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

export const loadManagedProject = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'ID dự án phải là số nguyên dương hợp lệ' });
    return null;
  }
  const project = await db.projects.findUnique({ where: { id } });
  if (!project) {
    res.status(404).json({ error: 'Không tìm thấy dự án' });
    return null;
  }
  if (!canManageProject(req, project)) {
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

export const deleteProject = async (req, res) => {
  try {
    const project = await loadManagedProject(req, res);
    if (!project) return;

    await prisma.$transaction(async (tx) => {
      const tasks = await tx.tasks.findMany({
        where: { project_id: project.id },
        select: { id: true },
      });
      const taskIds = tasks.map((task) => task.id);
      if (taskIds.length) {
        await tx.task_comments.deleteMany({ where: { task_id: { in: taskIds } } });
        await tx.tasks.deleteMany({ where: { id: { in: taskIds } } });
      }
      await tx.project_members.deleteMany({ where: { project_id: project.id } });
      await tx.projects.delete({ where: { id: project.id } });
    });

    res.status(204).end();
  } catch (error) {
    console.error('Không thể xóa dự án:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi xóa dự án' });
  }
};

export const completeProject = async (req, res) => {
  try {
    const project = await loadManagedProject(req, res);
    if (!project) return;
    if (project.status === 'hoan_thanh') {
      return res.status(409).json({ error: 'Dự án đã hoàn thành' });
    }

    const taskCount = await prisma.tasks.count({ where: { project_id: project.id } });
    if (!taskCount) return res.status(409).json({ error: 'Dự án chưa có task nào để hoàn thành' });

    const unfinishedCount = await prisma.tasks.count({
      where: { project_id: project.id, status: { not: 'xong' } },
    });
    if (unfinishedCount) return res.status(409).json({ error: 'Vẫn còn task chưa hoàn thành' });

    const updated = await prisma.projects.update({
      where: { id: project.id },
      data: { status: 'hoan_thanh' },
    });
    res.json(serializeProject(updated));
  } catch (error) {
    console.error('Không thể hoàn thành dự án:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};

export const reopenProject = async (req, res) => {
  try {
    const project = await loadManagedProject(req, res);
    if (!project) return;
    if (project.status === 'dang_thuc_hien') {
      return res.status(409).json({ error: 'Dự án đang thực hiện' });
    }

    const updated = await prisma.projects.update({
      where: { id: project.id },
      data: { status: 'dang_thuc_hien' },
    });
    res.json(serializeProject(updated));
  } catch (error) {
    console.error('Không thể mở lại dự án:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};
