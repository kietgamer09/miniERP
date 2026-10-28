import express from 'express';
import { mkdir, readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import prisma from '../config/prisma.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';
import { parseId } from '../utils/validators.js';
import { canAccessTaskProject } from '../utils/taskAccess.js';

const router = express.Router();
const root = fileURLToPath(new URL('../../uploads/attachments/', import.meta.url));
const maxSize = 10 * 1024 * 1024;
const extensions = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.docx', '.xlsx', '.pptx', '.txt', '.csv']);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const handle = fn => async (req, res, next) => { try { await fn(req, res, next); } catch (error) { next(error); } };

router.use(verifyToken, attachEmployee);
router.use('/:type/:targetId', handle(async (req, res, next) => {
  const id = parseId(req.params.targetId);
  if (!id) fail(400, 'ID không hợp lệ');
  const { type } = req.params;
  const employeeId = req.employee.employee_id;
  let target, allowed, writable;
  if (type === 'tasks' || type === 'projects') {
    target = type === 'tasks'
      ? await prisma.tasks.findUnique({ where: { id }, include: { projects: true } })
      : await prisma.projects.findUnique({ where: { id } });
    if (!target) fail(404, 'Không tìm thấy công việc/dự án');
    const project = type === 'tasks' ? target.projects : target;
    allowed = await canAccessTaskProject(prisma, { project_id: project.id, projects: project }, employeeId, req.user.role, { allowProjectManager: true });
    writable = project.status !== 'hoan_thanh';
  } else if (type === 'leaves') {
    target = await prisma.Day_off_requests.findUnique({ where: { Day_off_id: id } });
    if (!target) fail(404, 'Không tìm thấy đơn nghỉ phép');
    allowed = target.employee_send_id === employeeId || ['admin', 'manager'].includes(req.user.role);
    writable = target.employee_send_id === employeeId && target.status === 'cho_xac_thuc';
  } else fail(404, 'Loại đính kèm không hợp lệ');
  if (!allowed) fail(403, 'Bạn không có quyền truy cập tệp này');
  req.attachments = { directory: path.join(root, type, String(id)), writable };
  // Middleware dùng cùng bộ kiểm tra quyền cho đọc, tải lên, tải xuống và xóa.
  next();
}));

async function entries(directory) {
  let names;
  try { names = await readdir(directory); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return Promise.all(names.filter(name => /^[0-9a-f-]{36}\.json$/.test(name)).map(async name => JSON.parse(await readFile(path.join(directory, name), 'utf8'))));
}

router.get('/:type/:targetId', handle(async (req, res) => {
  const files = await entries(req.attachments.directory);
  res.json({ can_upload: req.attachments.writable, files: files.sort((a, b) => a.created_at.localeCompare(b.created_at)).map(file => ({ ...file,
    can_delete: req.attachments.writable && (file.author_id === req.employee.employee_id || req.user.role === 'admin'),
  })) });
}));

router.post('/:type/:targetId', express.raw({ type: 'application/octet-stream', limit: maxSize }), handle(async (req, res) => {
  if (!req.attachments.writable) fail(403, 'Không thể thêm tệp vào mục đã hoàn thành hoặc đơn đã xử lý');
  let name;
  try { name = decodeURIComponent(req.get('X-File-Name') || '').normalize('NFC'); } catch { fail(400, 'Tên tệp không hợp lệ'); }
  if (!name || name.length > 180 || /[\\/\x00-\x1f\x7f]/.test(name)) fail(400, 'Tên tệp không hợp lệ hoặc quá dài (tối đa 180 ký tự)');
  if (!extensions.has(path.extname(name).toLowerCase())) fail(400, 'Định dạng tệp chưa được hỗ trợ');
  if (!Buffer.isBuffer(req.body) || !req.body.length) fail(400, 'Tệp rỗng hoặc dữ liệu tải lên không hợp lệ');
  const { directory } = req.attachments;
  if ((await entries(directory)).length >= 30) fail(400, 'Mỗi mục tối đa 30 tệp');
  await mkdir(directory, { recursive: true });
  const file = { id: randomUUID(), name, size: req.body.length, author_id: req.employee.employee_id, created_at: new Date().toISOString() };
  const dataPath = path.join(directory, `${file.id}.bin`);
  await writeFile(dataPath, req.body, { flag: 'wx' });
  try { await writeFile(path.join(directory, `${file.id}.json`), JSON.stringify(file), { flag: 'wx' }); }
  catch (error) { await unlink(dataPath); throw error; }
  res.status(201).json(file);
}));

router.use('/:type/:targetId/:fileId', (req, res, next) => {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(req.params.fileId)) return res.status(400).json({ error: 'ID tệp không hợp lệ' });
  next();
});
async function metadata(req) {
  try { return JSON.parse(await readFile(path.join(req.attachments.directory, `${req.params.fileId}.json`), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') fail(404, 'Không tìm thấy tệp'); throw error; }
}
router.get('/:type/:targetId/:fileId', handle(async (req, res) => {
  const file = await metadata(req);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, no-store');
  res.download(path.join(req.attachments.directory, `${file.id}.bin`), file.name);
}));
router.delete('/:type/:targetId/:fileId', handle(async (req, res) => {
  const file = await metadata(req);
  if (!req.attachments.writable || (file.author_id !== req.employee.employee_id && req.user.role !== 'admin')) fail(403, 'Bạn không có quyền xóa tệp này');
  await unlink(path.join(req.attachments.directory, `${file.id}.json`));
  await unlink(path.join(req.attachments.directory, `${file.id}.bin`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  res.sendStatus(204);
}));
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error.status || 500;
  if (status === 500) console.error('Attachment error:', error);
  res.status(status).json({ error: status === 413 ? 'Tệp tối đa 10 MB' : status === 500 ? 'Không xử lý được tệp đính kèm' : error.message });
});
export default router;
