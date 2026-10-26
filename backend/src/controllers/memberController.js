import prisma from '../config/prisma.js';
import { loadManagedProject } from './projectController.js';
import { parseId } from '../utils/validators.js';

const employeeFields = { employee_id: true, fullname: true, position: true };

export const listAvailableEmployees = async (req, res) => {
  try {
    const project = await loadManagedProject(req, res);
    if (!project) return;
    res.json(await prisma.employees.findMany({
      where: { status: 'dang_lam_viec', project_members: { none: { project_id: project.id } } },
      select: employeeFields, orderBy: [{ fullname: 'asc' }, { employee_id: 'asc' }],
    }));
  } catch (error) {
    console.error('Không thể lấy nhân viên có thể thêm:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách nhân viên' });
  }
};

export const addMembers = async (req, res) => {
  try {
    const project = await loadManagedProject(req, res);
    if (!project) return;
    const ids = req.body?.employee_ids;
    if (!Array.isArray(ids) || !ids.length || ids.some((id) => typeof id !== 'number' || !parseId(id))) {
      return res.status(400).json({ error: 'employee_ids phải là mảng không rỗng gồm các số nguyên dương hợp lệ' });
    }
    const uniqueIds = [...new Set(ids)];
    const result = await prisma.$transaction(async (tx) => {
      const employees = await tx.employees.findMany({
        where: { employee_id: { in: uniqueIds }, status: 'dang_lam_viec' }, select: employeeFields,
      });
      if (employees.length !== uniqueIds.length) return { status: 400, error: 'Nhân viên không tồn tại hoặc đã nghỉ việc' };
      const count = await tx.project_members.count({ where: { project_id: project.id, employee_id: { in: uniqueIds } } });
      if (count) return { status: 409, error: 'Nhân viên đã là thành viên của dự án' };
      await tx.project_members.createMany({ data: uniqueIds.map((employeeId) => ({ project_id: project.id, employee_id: employeeId })) });
      return { members: employees.map((employee) => ({ ...employee, is_manager: employee.employee_id === project.manager_id })) };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(201).json(result.members);
  } catch (error) {
    console.error('Không thể thêm thành viên:', error);
    if (error.code === 'P2002') return res.status(409).json({ error: 'Nhân viên đã là thành viên của dự án' });
    res.status(500).json({ error: 'Lỗi máy chủ khi thêm thành viên' });
  }
};

export const removeMember = async (req, res) => {
  try {
    const project = await loadManagedProject(req, res);
    if (!project) return;
    const employeeId = parseId(req.params.employee_id);
    if (!employeeId) return res.status(400).json({ error: 'ID nhân viên phải là số nguyên dương hợp lệ' });
    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.project_members.findUnique({
        where: { project_id_employee_id: { project_id: project.id, employee_id: employeeId } }, select: { id: true },
      });
      if (!member) return { status: 404, error: 'Người này không phải thành viên của dự án' };
      if (employeeId === project.manager_id) return { status: 409, error: 'Không thể bớt Quản lý dự án' };
      const count = await tx.tasks.count({ where: { project_id: project.id, assignee_id: employeeId, status: { not: 'xong' } } });
      if (count) return { status: 409, error: `Còn ${count} task chưa xong, hãy giao lại trước khi bớt thành viên` };
      await tx.project_members.delete({ where: { id: member.id } });
      return {};
    }, { isolationLevel: 'Serializable' });
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(204).end();
  } catch (error) {
    console.error('Không thể bớt thành viên:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Người này không phải thành viên của dự án' });
    if (error.code === 'P2034') return res.status(409).json({ error: 'Dữ liệu thành viên vừa thay đổi, vui lòng thử lại' });
    res.status(500).json({ error: 'Lỗi máy chủ khi bớt thành viên' });
  }
};
