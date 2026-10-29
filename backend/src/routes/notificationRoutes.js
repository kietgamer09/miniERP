import express from 'express';
import prisma from '../config/prisma.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';

const router = express.Router();
router.use(verifyToken, attachEmployee);
export async function commentNotificationFeed(employeeId, db = prisma) {
  return db.$queryRaw`
    WITH comments AS (
      SELECT 'task'::text AS kind, c.id AS comment_id, t.project_id, t.id AS task_id,
        t.title, c.content, c.author_id, c.created_at AT TIME ZONE current_setting('TimeZone') AS created_at
      FROM task_comments c JOIN tasks t ON t.id = c.task_id
      UNION ALL
      SELECT 'project', c.id, c.project_id, NULL::integer, p.name, c.content, c.author_id, c.created_at
      FROM work_project_comments c JOIN projects p ON p.id = c.project_id
    )
    SELECT c.*, p.name AS project_name, e.fullname AS author_name, (r.comment_id IS NOT NULL) AS is_read
    FROM comments c JOIN projects p ON p.id = c.project_id
    JOIN employees e ON e.employee_id = c.author_id
    LEFT JOIN work_comment_reads r ON r.employee_id = ${employeeId} AND r.kind = c.kind AND r.comment_id = c.comment_id
    WHERE c.author_id <> ${employeeId} AND (
      p.manager_id = ${employeeId} OR EXISTS (
        SELECT 1 FROM project_members m WHERE m.project_id = p.id AND m.employee_id = ${employeeId}
      )
    ) ORDER BY r.comment_id IS NOT NULL, c.created_at DESC, c.kind, c.comment_id DESC LIMIT 100`;
}
const handle = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    console.error('Comment notification error:', error.code || error.name);
    res.status(500).json({ error: 'Không tải được thông báo bình luận. Kiểm tra đã chạy npm run setup:notifications ở backend.' });
  }
};
router.get('/', handle(async (req, res) => {
  const rows = await commentNotificationFeed(req.employee.employee_id);
  res.set('Cache-Control', 'private, no-store');
  res.json(rows.map(row => ({ id: `comment:${row.kind}:${row.comment_id}`, type: 'comment',
    title: `${row.author_name || 'Thành viên'} đã bình luận ${row.kind === 'task' ? 'công việc' : 'dự án'}: ${row.title}`,
    description: `${row.project_name} · ${row.content.slice(0, 180)}${row.content.length > 180 ? '…' : ''}`,
    time: row.created_at, read: row.is_read,
    path: `/du-an/${row.project_id}${row.task_id ? `?task=${row.task_id}` : '?discussion=1'}`,
  })));
}));
router.patch('/read', handle(async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string')) return res.status(400).json({ error: 'Danh sách thông báo không hợp lệ' });
  const rows = await commentNotificationFeed(req.employee.employee_id);
  const selected = rows.filter(row => ids.includes(`comment:${row.kind}:${row.comment_id}`));
  await prisma.$transaction(selected.map(row => prisma.$executeRaw`
    INSERT INTO work_comment_reads(employee_id, kind, comment_id)
    VALUES (${req.employee.employee_id}, ${row.kind}, ${row.comment_id}) ON CONFLICT DO NOTHING`));
  res.sendStatus(204);
}));
export default router;
