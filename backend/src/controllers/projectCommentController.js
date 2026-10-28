import prisma from '../config/prisma.js';
import { parseId } from '../utils/validators.js';
import { canAccessTaskProject } from '../utils/taskAccess.js';

export async function projectComments(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID dự án không hợp lệ' });
    const project = await prisma.projects.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (!await canAccessTaskProject(prisma, { project_id: id, projects: project }, req.employee.employee_id, req.user.role, { allowProjectManager: true })) {
      return res.status(403).json({ error: 'Bạn không thuộc dự án này' });
    }
    if (req.method === 'POST') {
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      if (!content || content.length > 2000) return res.status(400).json({ error: 'Bình luận cần từ 1 đến 2000 ký tự' });
      const [comment] = await prisma.$queryRaw`
        INSERT INTO work_project_comments(project_id, author_id, content)
        VALUES (${id}, ${req.employee.employee_id}, ${content}) RETURNING *`;
      const author = await prisma.employees.findUnique({ where: { employee_id: req.employee.employee_id }, select: { fullname: true } });
      return res.status(201).json({ ...comment, author_name: author.fullname });
    }
    const comments = await prisma.$queryRaw`
      SELECT c.*, e.fullname AS author_name FROM work_project_comments c
      JOIN employees e ON e.employee_id = c.author_id WHERE c.project_id = ${id}
      ORDER BY c.created_at ASC, c.id ASC`;
    res.json(comments);
  } catch (error) {
    console.error('Project comment error:', error.code || error.name);
    res.status(500).json({ error: 'Không xử lý được thảo luận dự án. Kiểm tra đã chạy npm run setup:notifications ở backend.' });
  }
}
