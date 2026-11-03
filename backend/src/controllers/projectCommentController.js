import prisma from '../config/prisma.js';
import { parseId } from '../utils/validators.js';
import { canAccessTaskProject } from '../utils/taskAccess.js';

export async function projectComments(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID dự án không hợp lệ' });
    if (req.method === 'POST') {
      const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
      if (!content || content.length > 2000) return res.status(400).json({ error: 'Bình luận cần từ 1 đến 2000 ký tự' });
      const result = await prisma.$transaction(async (tx) => {
        const project = await tx.projects.findUnique({ where: { id } });
        if (!project) return { status: 404, error: 'Không tìm thấy dự án' };
        const allowed = await canAccessTaskProject(
          tx, { project_id: id, projects: project }, req.employee.employee_id, req.user.role,
          { allowProjectManager: true },
        );
        if (!allowed) return { status: 403, error: 'Bạn không thuộc dự án này' };

        const comment = await tx.work_project_comments.create({
          data: { project_id: id, author_id: req.employee.employee_id, content },
          include: { author: { select: { fullname: true } } },
        });
        return { comment };
      }, { isolationLevel: 'Serializable' });

      if (result.error) return res.status(result.status).json({ error: result.error });
      const { author, ...comment } = result.comment;
      return res.status(201).json({ ...comment, author_name: author.fullname });
    }
    const project = await prisma.projects.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    if (!await canAccessTaskProject(prisma, { project_id: id, projects: project }, req.employee.employee_id, req.user.role, { allowProjectManager: true })) {
      return res.status(403).json({ error: 'Bạn không thuộc dự án này' });
    }
    const comments = await prisma.$queryRaw`
      SELECT c.*, e.fullname AS author_name FROM work_project_comments c
      JOIN employees e ON e.employee_id = c.author_id WHERE c.project_id = ${id}
      ORDER BY c.created_at ASC, c.id ASC`;
    res.json(comments);
  } catch (error) {
    console.error('Project comment error:', error.code || error.name);
    if (error.code === 'P2034') return res.status(409).json({ error: 'Quyền truy cập vừa thay đổi, vui lòng tải lại' });
    res.status(500).json({ error: 'Không xử lý được thảo luận dự án. Kiểm tra đã chạy npm run setup:notifications ở backend.' });
  }
}
