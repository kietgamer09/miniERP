import prisma from '../config/prisma.js';
import { parseId } from '../utils/validators.js';
import { canAccessTaskProject } from '../utils/taskAccess.js';
import { assertCanWriteProjectComment } from '../utils/commentAccess.js';

const commentFields = {
  id: true,
  task_id: true,
  author_id: true,
  content: true,
  created_at: true,
  employees: { select: { fullname: true } },
};

function formatComment(comment) {
  return {
    id: comment.id,
    task_id: comment.task_id,
    author_id: comment.author_id,
    author_name: comment.employees.fullname,
    content: comment.content,
    created_at: comment.created_at.toISOString(),
  };
}

async function loadAuthorizedTask(req, res, id) {
  const task = await prisma.tasks.findUnique({
    where: { id },
    select: { id: true, project_id: true, projects: { select: { manager_id: true } } },
  });
  if (!task) {
    res.status(404).json({ error: 'Không tìm thấy task' });
    return null;
  }

  const allowed = await canAccessTaskProject(
    prisma, task, req.employee.employee_id, req.user.role, { allowProjectManager: true },
  );
  if (!allowed) {
    res.status(403).json({ error: 'Bạn không thuộc dự án này' });
    return null;
  }
  return task;
}

export const listTaskComments = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID task phải là số nguyên dương hợp lệ' });

  try {
    const task = await loadAuthorizedTask(req, res, id);
    if (!task) return;
    const comments = await prisma.task_comments.findMany({
      where: { task_id: id },
      select: commentFields,
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });
    return res.json(comments.map(formatComment));
  } catch (error) {
    console.error('Không thể lấy bình luận task:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi lấy bình luận task' });
  }
};

export const createTaskComment = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID task phải là số nguyên dương hợp lệ' });

  try {
    const content = req.body?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung bình luận' });
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length > 2000) {
      return res.status(400).json({ error: 'Bình luận tối đa 2000 ký tự' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.tasks.findUnique({
        where: { id },
        select: { id: true, project_id: true, projects: { select: { manager_id: true } } },
      });
      if (!task) return { status: 404, error: 'Không tìm thấy task' };
      await assertCanWriteProjectComment(tx, {
        projectId: task.project_id, employeeId: req.employee.employee_id, role: req.user.role,
      });

      const comment = await tx.task_comments.create({
        data: {
          task_id: id,
          author_id: req.employee.employee_id,
          content: trimmedContent,
        },
        select: commentFields,
      });
      return { comment };
    }, { isolationLevel: 'Serializable' });

    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(formatComment(result.comment));
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: error.message });
    if (error.code === 'P2034') return res.status(409).json({ error: 'Quyền truy cập vừa thay đổi, vui lòng tải lại' });
    console.error('Không thể gửi bình luận task:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi gửi bình luận task' });
  }
};
