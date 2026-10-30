import { explanationTimes } from '../utils/explanationTimes.js';
import { dateOnly, vietnamClock } from '../utils/attendanceRules.js';

export async function applyAttendanceCorrection(tx, explanation) {
  const date = dateOnly(explanation.date);
  const clock = vietnamClock();
  const { data: times, error } = explanationTimes(explanation);
  if (error) return { status: 400, error };
  if (date > clock.date || (date === clock.date && Object.values(times).some(time => time && `${time}:00` > clock.time))) {
    return { status: 400, error: 'Chỉ được ghi nhận giờ công thực tế đã xảy ra.' };
  }
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(${explanation.employee_id}::int, ${Number(date.replaceAll('-', ''))}::int)`;
  const leave = await tx.Day_off_requests.findFirst({ where: {
    employee_send_id: explanation.employee_id, status: 'da_duoc_duyet', start_date: { lte: explanation.date },
    OR: [{ end_date: { gte: explanation.date } }, { end_date: null, start_date: explanation.date }],
  } });
  if (leave) return { status: 409, error: 'Ngày này đã có nghỉ phép được duyệt, không thể điều chỉnh giờ công.' };
  const rows = await tx.attendances.findMany({ where: { employee_id: explanation.employee_id, date: explanation.date } });
  if (rows.length > 1) return { status: 409, error: 'Trùng bản ghi công, cần kiểm tra trước khi duyệt.' };
  const row = rows[0];
  const asTime = time => new Date(`1970-01-01T${time}:00Z`);
  const checkIn = times.requested_check_in ? asTime(times.requested_check_in) : row?.check_in ?? null;
  const checkOut = times.requested_check_out ? asTime(times.requested_check_out) : row?.check_out ?? null;
  if ((!checkIn && checkOut) || (checkIn && checkOut && checkOut <= checkIn)) {
    return { status: 400, error: 'Cần có giờ vào trước giờ ra; hãy kiểm tra cả giờ công hiện có.' };
  }
  const original = { attendances_id: row?.attendances_id ?? null,
    check_in: row?.check_in?.toISOString() ?? null, check_out: row?.check_out?.toISOString() ?? null };
  const data = { check_in: checkIn, check_out: checkOut };
  if (row) await tx.attendances.update({ where: { attendances_id: row.attendances_id }, data });
  else await tx.attendances.create({ data: { ...data, employee_id: explanation.employee_id, date: explanation.date, created_at: new Date() } });
  return { original };
}
