import prisma from '../config/prisma.js';
import { parseId, isValidDate } from '../utils/validators.js';
import { classifyDay, dateOnly, vietnamClock, weekend } from '../utils/attendanceRules.js';

class AttendanceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new AttendanceError(status, message); };
const asDate = value => new Date(`${value}T00:00:00Z`);
const recordData = row => row ? { attendances_id: row.attendances_id, employee_id: row.employee_id,
  date: dateOnly(row.date), check_in: row.check_in, check_out: row.check_out } : null;
const explanationData = (row, req) => row ? { id: row.id, employee_id: row.employee_id, date: dateOnly(row.date),
  reason: row.reason, makeup_date: dateOnly(row.makeup_date), status: row.status, review_note: row.review_note,
  created_at: row.created_at, reviewed_at: row.reviewed_at, reviewed_by: row.reviewed_by,
  employee_name: row.employees?.fullname, reviewer_name: row.reviewer?.username,
  can_review: req.user.role === 'admin' && row.status === 'pending' && row.employees?.user_id !== Number(req.user.user_id),
} : null;

function handler(action) {
  return async (req, res) => {
    try { await action(req, res); }
    catch (error) {
      if (error instanceof AttendanceError) return res.status(error.status).json({ error: error.message });
      if (error.code === 'P2002') return res.status(409).json({ error: 'Bạn đã gửi giải trình cho ngày này.' });
      if (error.code === 'P2034') return res.status(409).json({ error: 'Dữ liệu vừa thay đổi, vui lòng tải lại và thử lại.' });
      console.error('Lỗi API chấm công:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi xử lý chấm công.' });
    }
  };
}

async function employeeFor(req) {
  const userId = parseId(req.user?.user_id);
  if (!userId) fail(403, 'Tài khoản chưa có hồ sơ nhân viên.');
  const employee = await prisma.employees.findUnique({ where: { user_id: userId } });
  if (!employee) fail(404, 'Không tìm thấy hồ sơ nhân viên của tài khoản này.');
  if (employee.status !== 'dang_lam_viec') fail(403, 'Nhân viên đã nghỉ việc.');
  return employee;
}

async function requireCurrentAdmin(req) {
  const userId = parseId(req.user?.user_id);
  const user = userId && await prisma.users.findUnique({ where: { user_id: userId },
    select: { role: true, employees: { select: { status: true } } } });
  if (user?.role !== 'admin' || user.employees?.status !== 'dang_lam_viec') {
    fail(403, 'Chỉ Admin đang làm việc được duyệt giải trình.');
  }
}

async function lockDay(tx, employeeId, date) {
  // Khóa theo nhân viên/ngày: hai tab hoặc hai trình duyệt không tạo công trùng.
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${employeeId}::int, ${Number(date.replaceAll('-', ''))}::int)`;
}

async function rangeData(employee, start, end, db = prisma) {
  const where = { employee_id: employee.employee_id, date: { gte: asDate(start), lte: asDate(end) } };
  const [records, leaves, explanations] = await Promise.all([
    db.attendances.findMany({ where, orderBy: { attendances_id: 'asc' } }),
    db.day_off_requests.findMany({ where: { employee_send_id: employee.employee_id, status: 'da_duoc_duyet',
      start_date: { lte: asDate(end) }, OR: [{ end_date: { gte: asDate(start) } }, { end_date: null, start_date: { gte: asDate(start) } }] } }),
    db.attendance_explanations.findMany({ where, include: { employees: { select: { fullname: true, user_id: true } },
      reviewer: { select: { username: true } } } }),
  ]);
  return { records, leaves, explanations };
}

function dayData(date, employee, data, clock, req) {
  const records = data.records.filter(row => dateOnly(row.date) === date);
  const onLeave = data.leaves.some(leave => dateOnly(leave.start_date) <= date && dateOnly(leave.end_date || leave.start_date) >= date);
  const explanation = data.explanations.find(row => dateOnly(row.date) === date);
  return { ...classifyDay({ date, records, onLeave, startDate: dateOnly(employee.start_date), clock }),
    explanation: explanationData(explanation, req) };
}

export const getToday = handler(async (req, res) => {
  const employee = await employeeFor(req);
  const now = new Date();
  const clock = vietnamClock(now);
  const data = await rangeData(employee, clock.date, clock.date);
  res.json({ server_now: now.toISOString(), day: dayData(clock.date, employee, data, clock, req),
    record: data.records.length === 1 ? recordData(data.records[0]) : null });
});

export const getMyAttendances = handler(async (req, res) => {
  const employee = await employeeFor(req);
  const month = req.query.month ?? vietnamClock().date.slice(0, 7);
  if (typeof month !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)) fail(400, 'Tháng cần có dạng YYYY-MM (1900–2199).');
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const start = `${month}-01`, end = `${month}-${lastDay}`;
  const data = await rangeData(employee, start, end);
  const now = new Date(), clock = vietnamClock(now);
  const days = Array.from({ length: lastDay }, (_, index) => dayData(`${month}-${String(index + 1).padStart(2, '0')}`, employee, data, clock, req));
  res.json({ month, server_now: now.toISOString(), start_date: dateOnly(employee.start_date), days });
});

function punch(action) {
  return handler(async (req, res) => {
    const employee = await employeeFor(req);
    const clock = vietnamClock();
    if (weekend(clock.date)) fail(400, 'Hôm nay là cuối tuần (Thứ 7 hoặc Chủ Nhật), không cần chấm công!');
    if (employee.start_date && clock.date < dateOnly(employee.start_date)) fail(400, 'Chưa đến ngày bắt đầu làm việc.');
    const result = await prisma.$transaction(async tx => {
      await lockDay(tx, employee.employee_id, clock.date);
      const actual = vietnamClock();
      if (actual.date !== clock.date) fail(409, 'Ngày chấm công vừa thay đổi, vui lòng tải lại.');
      const rows = await tx.attendances.findMany({ where: { employee_id: employee.employee_id, date: asDate(clock.date) } });
      if (rows.length > 1) fail(409, 'Ngày này có nhiều bản ghi công, cần quản trị viên kiểm tra.');
      const row = rows[0];
      if (action === 'in' && row?.check_in) fail(400, 'Bạn đã thực hiện vào ca vào ngày hôm nay rồi!');
      if (action === 'out' && !row?.check_in) fail(400, 'Bạn chưa thực hiện vào ca ngày hôm nay, không thể ra ca!');
      if (action === 'out' && row.check_out) fail(400, 'Bạn đã thực hiện ra ca ngày hôm nay rồi!');
      if (action === 'out' && actual.time < row.check_in.toISOString().slice(11, 19)) fail(409, 'Giờ ra ca không được trước giờ vào ca.');
      const field = action === 'in' ? 'check_in' : 'check_out';
      const value = new Date(`1970-01-01T${actual.time}Z`);
      return row ? tx.attendances.update({ where: { attendances_id: row.attendances_id }, data: { [field]: value } })
        : tx.attendances.create({ data: { employee_id: employee.employee_id, date: asDate(clock.date), check_in: value, created_at: new Date() } });
    });
    const late = result.check_in.toISOString().slice(11, 19) > '08:00:00';
    const early = result.check_out && result.check_out.toISOString().slice(11, 19) < '17:00:00';
    res.json({ message: action === 'in' ? late ? 'Vào ca thành công (Tính là đi muộn).' : 'Vào ca thành công đúng giờ!'
      : early ? 'Ra ca thành công (Tính là về sớm).' : 'Ra ca thành công đúng giờ!', data: recordData(result) });
  });
}
export const checkIn = punch('in');
export const checkOut = punch('out');

export const createExplanation = handler(async (req, res) => {
  const employee = await employeeFor(req);
  const { date, reason, makeup_date: makeupDate } = req.body ?? {};
  if (!isValidDate(date) || typeof reason !== 'string' || !reason.trim() || reason.trim().length > 2000) {
    fail(400, 'Cần ngày hợp lệ và lý do giải trình từ 1–2000 ký tự.');
  }
  const clock = vietnamClock();
  if (makeupDate != null && (!isValidDate(makeupDate) || makeupDate < clock.date || weekend(makeupDate))) {
    fail(400, 'Ngày đề nghị chấm bù phải từ hôm nay trở đi, vào Thứ 2–Thứ 6.');
  }
  const result = await prisma.$transaction(async tx => {
    await lockDay(tx, employee.employee_id, date);
    const data = await rangeData(employee, date, date, tx);
    const day = dayData(date, employee, data, clock, req);
    if (!day.can_explain) fail(400, 'Ngày này không cần giải trình chấm công.');
    if (day.explanation) fail(409, 'Bạn đã gửi giải trình cho ngày này.');
    return tx.attendance_explanations.create({ data: { employee_id: employee.employee_id, date: asDate(date),
      reason: reason.trim(), makeup_date: makeupDate ? asDate(makeupDate) : null }, include: { employees: { select: { fullname: true, user_id: true } } } });
  });
  res.status(201).json(explanationData(result, req));
});

export const listExplanations = handler(async (req, res) => {
  await requireCurrentAdmin(req);
  const status = req.query.status;
  if (status && !['pending', 'approved', 'rejected'].includes(status)) fail(400, 'Trạng thái yêu cầu không hợp lệ.');
  const rows = await prisma.attendance_explanations.findMany({ where: status ? { status } : {},
    include: { employees: { select: { fullname: true, user_id: true } }, reviewer: { select: { username: true } } },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 500 });
  res.json(rows.map(row => explanationData(row, req)));
});

export const reviewExplanation = handler(async (req, res) => {
  await requireCurrentAdmin(req);
  const id = parseId(req.params.id);
  if (!id) fail(400, 'ID yêu cầu không hợp lệ.');
  const { decision, review_note: note } = req.body ?? {};
  if (!['approved', 'rejected'].includes(decision) || (note != null && typeof note !== 'string')
    || (typeof note === 'string' && note.trim().length > 2000) || (decision === 'rejected' && !note?.trim())) {
    fail(400, 'Cần quyết định hợp lệ; khi từ chối phải nhập lý do (tối đa 2000 ký tự).');
  }
  const row = await prisma.attendance_explanations.findUnique({ where: { id }, include: { employees: { select: { user_id: true } } } });
  if (!row) fail(404, 'Không tìm thấy yêu cầu giải trình.');
  if (row.employees.user_id === Number(req.user.user_id)) fail(403, 'Không thể tự duyệt giải trình của chính mình.');
  const result = await prisma.attendance_explanations.updateMany({ where: { id, status: 'pending' },
    data: { status: decision, review_note: note?.trim() || null, reviewed_by: Number(req.user.user_id), reviewed_at: new Date() } });
  if (!result.count) fail(409, 'Yêu cầu đã được xử lý, vui lòng tải lại.');
  // Không sửa giờ công và không đổi màu ngày công sau khi duyệt.
  res.json({ message: decision === 'approved' ? 'Đã duyệt đề nghị chấm bù.' : 'Đã từ chối yêu cầu.' });
});
