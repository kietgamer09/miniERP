import prisma from '../config/prisma.js';

export const getProjectSummary = async (req, res) => {
  try {
    const where = { status: 'dang_thuc_hien' };
    if (req.user.role === 'manager') where.manager_id = req.employee.employee_id;
    const activeProjects = await prisma.projects.count({ where });
    return res.json({ active_projects: activeProjects });
  } catch (error) {
    console.error('Không thể lấy số liệu tổng quan dự án:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy số liệu dự án' });
  }
};
