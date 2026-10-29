import { isValidDate } from './validators.js';

export function overtimeToday(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function overtimeMaxDate(today) {
  const current = new Date(`${today}T00:00:00Z`);
  const day = current.getUTCDate();
  current.setUTCDate(1); current.setUTCMonth(current.getUTCMonth() + 2); current.setUTCDate(0);
  current.setUTCDate(Math.min(day, current.getUTCDate()));
  return current.toISOString().slice(0, 10);
}

export function overtimePriority(request, today = overtimeToday()) {
  if (request.mode !== 'planned' || request.status !== 'pending' || request.date < today) return 0;
  const days = Math.round((Date.parse(`${request.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return Math.max(1, 1000 - days);
}

export function overtimeTime(minute) { return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`; }

export function validateOvertime(body, today = overtimeToday()) {
  if (!body || !['past', 'planned'].includes(body.mode) || !isValidDate(body.date)) return { error: 'Chọn loại đơn và ngày làm thêm hợp lệ.' };
  if (body.mode === 'past' && body.date >= today) return { error: 'Đơn bổ sung chỉ chọn ngày trước hôm nay.' };
  if (body.mode === 'planned' && (body.date < today || body.date > overtimeMaxDate(today))) return { error: `Ngày kế hoạch phải từ ${today} đến ${overtimeMaxDate(today)} (tối đa một tháng).` };
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 2000) return { error: 'Lý do làm thêm cần từ 1 đến 2000 ký tự.' };
  if (body.end_next_day !== undefined && typeof body.end_next_day !== 'boolean') return { error: 'Giá trị qua ngày không hợp lệ.' };
  const minute = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null;
  const start = minute(body.start_time), end = minute(body.end_time);
  if (start == null || end == null) return { error: 'Nhập giờ bắt đầu và kết thúc dạng HH:mm.' };
  const total = end + (body.end_next_day ? 1440 : 0) - start;
  if (total <= 0 || total > 1440) return { error: 'Khoảng làm thêm phải lớn hơn 0 và không vượt 24 giờ. Đánh dấu qua ngày nếu kết thúc vào ngày hôm sau.' };
  return { data: { mode: body.mode, date: body.date, start, end, nextDay: Boolean(body.end_next_day), reason: body.reason.trim() } };
}
