export function attendanceDay(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isAttendanceWeekend(day) {
  return [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());
}

// Prisma dùng ngày 1970 UTC để biểu diễn cột TIME. Giữ nguyên giờ, không cộng 7 giờ lần nữa.
export function attendanceTime(value) {
  if (typeof value !== 'string') return null;
  const match = /^(?:\d{4}-\d{2}-\d{2}T)?([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?Z?$/.exec(value);
  return match ? `${match[1]}:${match[2]}:${match[3]}` : null;
}

export function normalizeAttendance(record) {
  if (!record || !Number.isInteger(record.attendances_id) || record.attendances_id < 1
    || !Number.isInteger(record.employee_id) || record.employee_id < 1 || typeof record.date !== 'string') return null;
  const date = record.date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const checkIn = record.check_in == null ? null : attendanceTime(record.check_in);
  const checkOut = record.check_out == null ? null : attendanceTime(record.check_out);
  if ((record.check_in != null && !checkIn) || (record.check_out != null && !checkOut) || (checkOut && !checkIn)) return null;
  return { attendances_id: record.attendances_id, employee_id: record.employee_id, date,
    check_in: checkIn, check_out: checkOut };
}

export const explanationLabels = { pending: 'Chờ duyệt', approved: 'Đã duyệt đề nghị', rejected: 'Đã từ chối' };
export const explanationTypeLabels = { correction: 'Bổ sung / điều chỉnh giờ công', makeup: 'Đăng ký làm bù', legacy: 'Giải trình cũ' };
