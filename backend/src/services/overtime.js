import prisma from '../config/prisma.js';
import { overtimePriority, overtimeTime, overtimeToday } from '../utils/overtimeRules.js';

export async function overtimeActor(req, db = prisma) {
  const person = await db.employees.findUnique({ where: { employee_id: req.employee.employee_id },
    select: { employee_id: true, department_id: true, start_date: true, users: { select: { role: true } } } });
  return { ...person, role: String(person.users.role || '').trim().toLowerCase() };
}
export const canReviewOvertime = (actor, request) => actor.employee_id !== request.employee_id
  && (actor.role === 'admin' || (actor.role === 'manager' && actor.department_id === request.department_id));
export const canViewOvertime = (actor, request) => actor.employee_id === request.employee_id || canReviewOvertime(actor, request);
export function serializeOvertime(row, actor) {
  return { ...row, start_time: overtimeTime(row.start_minute), end_time: overtimeTime(row.end_minute),
    priority: overtimePriority(row), can_review: row.status === 'pending' && canReviewOvertime(actor, row),
    can_cancel: row.status === 'pending' && actor.employee_id === row.employee_id };
}

export async function overtimeRecord(id, db = prisma) {
  const [row] = await db.$queryRaw`
    SELECT r.*, r.overtime_date::text AS date, e.fullname AS employee_name, d.department_name,
      reviewer.fullname AS reviewer_name FROM work_overtime_requests r
    JOIN employees e ON e.employee_id = r.employee_id JOIN departments d ON d.department_id = r.department_id
    LEFT JOIN employees reviewer ON reviewer.employee_id = r.reviewed_by WHERE r.id = ${id}`;
  return row;
}

export async function overtimeFeed(employeeId, db = prisma) {
  const rows = await db.$queryRaw`
    SELECT n.id AS notification_id, n.event, n.read_at, n.created_at AS notification_time,
      r.id, r.employee_id, r.department_id, r.mode, r.status, r.overtime_date::text AS date,
      e.fullname AS employee_name, reviewer.fullname AS reviewer_name
    FROM work_overtime_notifications n JOIN work_overtime_requests r ON r.id = n.request_id
    JOIN employees e ON e.employee_id = r.employee_id
    JOIN employees me ON me.employee_id = n.employee_id JOIN users u ON u.user_id = me.user_id
    LEFT JOIN employees reviewer ON reviewer.employee_id = r.reviewed_by
    WHERE n.employee_id = ${employeeId} AND (
      (n.event = 'result' AND r.employee_id = ${employeeId}) OR (n.event = 'review' AND r.employee_id <> ${employeeId}
        AND (lower(u.role) = 'admin' OR (lower(u.role) = 'manager' AND me.department_id = r.department_id))))
    ORDER BY n.read_at IS NOT NULL, CASE WHEN r.mode = 'planned' AND r.status = 'pending'
      AND r.overtime_date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN r.overtime_date ELSE NULL END ASC NULLS LAST,
      n.created_at DESC, n.id DESC LIMIT 200`;
  const labels = { pending: 'chờ duyệt', approved: 'đã được duyệt', rejected: 'đã bị từ chối', cancelled: 'đã hủy' };
  const today = overtimeToday();
  return rows.map(row => {
    const days = Math.round((Date.parse(`${row.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
    const priority = row.event === 'review' ? overtimePriority(row, today) : 0;
    return { id: `overtime:${row.notification_id}`, type: 'overtime', read: Boolean(row.read_at), priority,
      priority_label: priority ? days === 0 ? 'Làm thêm hôm nay' : days === 1 ? 'Làm thêm ngày mai' : `Còn ${days} ngày` : null,
      title: row.event === 'result' ? `Đơn làm thêm ${labels[row.status]}` : `${row.employee_name || 'Nhân viên'} · Đơn làm thêm ${labels[row.status]}`,
      description: `${row.mode === 'past' ? 'Đơn bổ sung' : 'Đơn kế hoạch'} · ${row.date.split('-').reverse().join('/')}${row.event === 'result' && row.reviewer_name ? ` · ${row.reviewer_name}` : ''}`,
      time: row.notification_time, path: `/lam-them?view=${row.event === 'review' ? 'review' : 'mine'}&request=${row.id}` };
  });
}

export async function pendingOvertimePush(db = prisma) {
  return db.$queryRaw`
    SELECT s.*, 'overtime'::text AS kind, n.id AS comment_id, r.id AS request_id
    FROM work_overtime_notifications n JOIN work_overtime_requests r ON r.id = n.request_id
    JOIN work_push_subscriptions s ON s.employee_id = n.employee_id
    JOIN employees me ON me.employee_id = n.employee_id JOIN users u ON u.user_id = me.user_id
    LEFT JOIN work_push_deliveries d ON d.subscription_id = s.id AND d.kind = 'overtime' AND d.comment_id = n.id
    WHERE n.event = 'review' AND n.read_at IS NULL AND r.status = 'pending' AND r.mode = 'planned'
      AND me.status = 'dang_lam_viec' AND r.employee_id <> me.employee_id
      AND (lower(u.role) = 'admin' OR (lower(u.role) = 'manager' AND me.department_id = r.department_id))
      AND r.overtime_date BETWEEN (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 3
      AND (d.subscription_id IS NULL OR (d.delivered_at IS NULL AND d.attempts < 5 AND d.next_attempt_at <= now()))
    ORDER BY r.overtime_date, n.created_at DESC, s.id LIMIT 100`;
}

export async function overtimePushPayload(row, db = prisma) {
  const [request] = await db.$queryRaw`
    SELECT r.id, r.overtime_date::text AS date, r.overtime_date - (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS days
    FROM work_overtime_notifications n JOIN work_overtime_requests r ON r.id = n.request_id
    JOIN employees me ON me.employee_id = n.employee_id JOIN users u ON u.user_id = me.user_id
    WHERE n.id = ${row.comment_id} AND n.employee_id = ${row.employee_id} AND n.event = 'review' AND n.read_at IS NULL
      AND r.status = 'pending' AND r.mode = 'planned' AND me.status = 'dang_lam_viec' AND r.employee_id <> me.employee_id
      AND (lower(u.role) = 'admin' OR (lower(u.role) = 'manager' AND me.department_id = r.department_id))
      AND r.overtime_date BETWEEN (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 3`;
  if (!request) return null;
  return { payload: { title: 'miniERP · Đơn tăng ca cần duyệt', body: `Có đơn làm thêm ngày ${request.date.split('-').reverse().join('/')} cần bạn duyệt.`,
    path: `/lam-them?view=review&request=${request.id}`, tag: `overtime:${row.comment_id}` },
    urgency: request.days <= 1 ? 'high' : request.days === 2 ? 'normal' : 'low' };
}
