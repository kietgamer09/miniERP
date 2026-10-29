import express from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';
import { parseId } from '../utils/validators.js';
import { overtimeMaxDate, overtimeToday, validateOvertime } from '../utils/overtimeRules.js';
import { canReviewOvertime, canViewOvertime, overtimeActor, overtimeFeed, overtimeRecord, serializeOvertime } from '../services/overtime.js';

const router = express.Router();
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.use(verifyToken, attachEmployee);
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
router.param('id', (req, res, next, value) => {
  req.overtimeId = parseId(value);
  if (!req.overtimeId) return res.status(400).json({ error: 'ID đơn làm thêm không hợp lệ.' });
  next();
});

router.get('/notifications', handle(async (req, res) => { res.json(await overtimeFeed(req.employee.employee_id)); }));
router.patch('/notifications/read', handle(async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string' || !/^overtime:[1-9]\d*$/.test(id))) fail(400, 'Danh sách thông báo không hợp lệ.');
  const allowed = await overtimeFeed(req.employee.employee_id);
  const selected = allowed.filter(item => ids.includes(item.id)).map(item => Number(item.id.slice('overtime:'.length)));
  if (selected.length) await prisma.$executeRaw(Prisma.sql`UPDATE work_overtime_notifications SET read_at = coalesce(read_at, now())
    WHERE employee_id = ${req.employee.employee_id} AND id IN (${Prisma.join(selected)})`);
  res.sendStatus(204);
}));

router.get('/', handle(async (req, res) => {
  const actor = await overtimeActor(req);
  const view = req.query.view || 'mine', status = req.query.status;
  if (!['mine', 'review'].includes(view)) fail(400, 'Chế độ xem không hợp lệ.');
  if (status && !['pending', 'approved', 'rejected', 'cancelled'].includes(status)) fail(400, 'Trạng thái đơn không hợp lệ.');
  if (view === 'review' && !['admin', 'manager'].includes(actor.role)) fail(403, 'Chỉ quản lý cùng phòng hoặc Admin được xem danh sách duyệt.');
  const visibility = view === 'mine' ? Prisma.sql`r.employee_id = ${actor.employee_id}`
    : Prisma.sql`r.employee_id <> ${actor.employee_id} ${actor.role === 'admin' ? Prisma.empty : Prisma.sql`AND r.department_id = ${actor.department_id}`}`;
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT r.*, r.overtime_date::text AS date, e.fullname AS employee_name, d.department_name, reviewer.fullname AS reviewer_name
    FROM work_overtime_requests r JOIN employees e ON e.employee_id = r.employee_id
    JOIN departments d ON d.department_id = r.department_id LEFT JOIN employees reviewer ON reviewer.employee_id = r.reviewed_by
    WHERE ${visibility} ${status ? Prisma.sql`AND r.status = ${status}` : Prisma.empty}
    ORDER BY ${view === 'review' ? Prisma.sql`CASE WHEN r.mode = 'planned' AND r.status = 'pending'
      AND r.overtime_date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN r.overtime_date END ASC NULLS LAST,` : Prisma.empty}
      r.created_at DESC, r.id DESC LIMIT 500`);
  const today = overtimeToday();
  res.json({ requests: rows.map(row => serializeOvertime(row, actor)), today, max_date: overtimeMaxDate(today) });
}));

router.post('/', handle(async (req, res) => {
  const { data, error } = validateOvertime(req.body);
  if (error) fail(400, error);
  const actor = await overtimeActor(req);
  if (actor.start_date && data.date < actor.start_date.toISOString().slice(0, 10)) fail(400, 'Ngày làm thêm không được trước ngày bắt đầu làm việc.');
  const id = await prisma.$transaction(async db => {
    await db.$queryRaw`SELECT employee_id FROM employees WHERE employee_id = ${actor.employee_id} FOR UPDATE`;
    const overlap = await db.$queryRaw`
      SELECT id FROM work_overtime_requests r WHERE r.employee_id = ${actor.employee_id} AND r.status IN ('pending', 'approved')
      AND r.overtime_date + r.start_minute * interval '1 minute' < ${data.date}::date + ${data.end + (data.nextDay ? 1440 : 0)} * interval '1 minute'
      AND r.overtime_date + (r.end_minute + CASE WHEN r.end_next_day THEN 1440 ELSE 0 END) * interval '1 minute'
        > ${data.date}::date + ${data.start} * interval '1 minute' LIMIT 1`;
    if (overlap.length) fail(409, 'Khoảng giờ làm thêm trùng với một đơn đang chờ hoặc đã được duyệt.');
    const reviewers = await db.$queryRaw`
      SELECT e.employee_id FROM employees e JOIN users u ON u.user_id = e.user_id
      WHERE e.status = 'dang_lam_viec' AND e.employee_id <> ${actor.employee_id}
        AND (lower(u.role) = 'admin' OR (lower(u.role) = 'manager' AND e.department_id = ${actor.department_id}))`;
    if (!reviewers.length) fail(409, 'Chưa có quản lý cùng phòng hoặc Admin khác để duyệt đơn.');
    const [created] = await db.$queryRaw`
      INSERT INTO work_overtime_requests(employee_id, department_id, mode, overtime_date, start_minute, end_minute, end_next_day, reason)
      VALUES (${actor.employee_id}, ${actor.department_id}, ${data.mode}, ${data.date}::date, ${data.start}, ${data.end}, ${data.nextDay}, ${data.reason}) RETURNING id`;
    await db.$executeRaw(Prisma.sql`INSERT INTO work_overtime_notifications(request_id, employee_id, event)
      VALUES ${Prisma.join(reviewers.map(person => Prisma.sql`(${created.id}, ${person.employee_id}, 'review')`))}`);
    return created.id;
  });
  res.status(201).json(serializeOvertime(await overtimeRecord(id), actor));
}));

router.get('/:id', handle(async (req, res) => {
  const actor = await overtimeActor(req);
  const row = await overtimeRecord(req.overtimeId);
  if (!row) fail(404, 'Không tìm thấy đơn làm thêm.');
  if (!canViewOvertime(actor, row)) fail(403, 'Bạn không có quyền xem đơn này.');
  res.json(serializeOvertime(row, actor));
}));

router.post('/:id/review', handle(async (req, res) => {
  const { decision, note } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) fail(400, 'Quyết định không hợp lệ.');
  if (note != null && (typeof note !== 'string' || note.trim().length > 1000)) fail(400, 'Ghi chú tối đa 1000 ký tự.');
  if (decision === 'rejected' && !note?.trim()) fail(400, 'Vui lòng nhập lý do từ chối.');
  const actor = await overtimeActor(req);
  await prisma.$transaction(async db => {
    const [row] = await db.$queryRaw`SELECT * FROM work_overtime_requests WHERE id = ${req.overtimeId} FOR UPDATE`;
    if (!row) fail(404, 'Không tìm thấy đơn làm thêm.');
    if (!canReviewOvertime(actor, row)) fail(403, 'Chỉ quản lý cùng phòng hoặc Admin được duyệt; không được tự duyệt đơn của mình.');
    if (row.status !== 'pending') fail(409, 'Đơn đã được xử lý hoặc đã hủy.');
    await db.$executeRaw`UPDATE work_overtime_requests SET status = ${decision}, review_note = ${note?.trim() || null},
      reviewed_by = ${actor.employee_id}, reviewed_at = now(), updated_at = now() WHERE id = ${row.id}`;
    await db.$executeRaw`UPDATE work_overtime_notifications SET read_at = coalesce(read_at, now()) WHERE request_id = ${row.id} AND event = 'review'`;
    await db.$executeRaw`INSERT INTO work_overtime_notifications(request_id, employee_id, event)
      VALUES (${row.id}, ${row.employee_id}, 'result') ON CONFLICT DO NOTHING`;
  });
  res.json(serializeOvertime(await overtimeRecord(req.overtimeId), actor));
}));

router.post('/:id/cancel', handle(async (req, res) => {
  const actor = await overtimeActor(req);
  await prisma.$transaction(async db => {
    const [row] = await db.$queryRaw`SELECT * FROM work_overtime_requests WHERE id = ${req.overtimeId} FOR UPDATE`;
    if (!row) fail(404, 'Không tìm thấy đơn làm thêm.');
    if (row.employee_id !== actor.employee_id) fail(403, 'Chỉ người gửi được hủy đơn.');
    if (row.status !== 'pending') fail(409, 'Chỉ hủy đơn đang chờ duyệt.');
    await db.$executeRaw`UPDATE work_overtime_requests SET status = 'cancelled', updated_at = now() WHERE id = ${row.id}`;
    await db.$executeRaw`UPDATE work_overtime_notifications SET read_at = coalesce(read_at, now()) WHERE request_id = ${row.id}`;
  });
  res.sendStatus(204);
}));

router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error('Overtime error:', error.code || error.name);
  const missing = error.code === 'P2010' && error.meta?.code === '42P01';
  res.status(500).json({ error: missing ? 'Chưa khởi tạo làm thêm. Chạy npm run setup:overtime trong backend.' : 'Không xử lý được đơn làm thêm. Vui lòng thử lại.' });
});
export default router;
