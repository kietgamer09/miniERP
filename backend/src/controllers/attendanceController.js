import prisma from '../config/prisma.js';
import { parseId, isValidDate } from '../utils/validators.js';
import { classifyDay, dateOnly, vietnamClock, weekend } from '../utils/attendanceRules.js';

class AttendanceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new AttendanceError(status, message); };
const asDate = value => new Date(`${value}T00:00:00Z`);

const formatTimeVN = (dateObj) => {
  if (!dateObj) return null;
  const d = new Date(dateObj);
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const recordData = row => row ? {
  attendances_id: row.attendances_id || row.id,
  employee_id: row.employee_id,
  date: dateOnly(row.date),
  check_in: formatTimeVN(row.check_in),
  check_out: formatTimeVN(row.check_out)
} : null;

function handler(action) {
  return async (req, res) => {
    try { await action(req, res); }
    catch (error) {
      if (error instanceof AttendanceError) return res.status(error.status).json({ error: error.message });
      if (error.code === 'P2002') return res.status(409).json({ error: 'Dữ liệu bị trùng lặp.' });
      if (error.code === 'P2034') return res.status(409).json({ error: 'Dữ liệu vừa thay đổi, vui lòng tải lại và thử lại.' });
      console.error('Lỗi API chấm công:', error);
      res.status(500).json({ error: 'Lỗi máy chủ khi xử lý chấm công.' });
    }
  };
}

async function employeeFor(req) {
  const userId = parseId(req.user?.user_id);
  if (!userId) fail(403, 'Tài khoản chưa có hồ sơ nhân viên.');

  const employee = await prisma.employees?.findUnique({ where: { user_id: userId } })
                || await prisma.employee?.findUnique({ where: { user_id: userId } })
                || await prisma.Employee?.findUnique({ where: { user_id: userId } });

  if (!employee) fail(404, 'Không tìm thấy hồ sơ nhân viên của tài khoản này.');
  if (employee.status !== 'dang_lam_viec') fail(403, 'Nhân viên đã nghỉ việc.');
  return employee;
}

async function requireCurrentAdmin(req) {
  const userId = parseId(req.user?.user_id);
  const user = userId && await prisma.users?.findUnique({
    where: { user_id: userId },
    select: { role: true, employees: { select: { status: true } } }
  });
  if (user?.role !== 'admin' || user.employees?.status !== 'dang_lam_viec') {
    fail(403, 'Chỉ Admin đang làm việc được phép thực hiện.');
  }
}

async function lockDay(tx, employeeId, date) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${employeeId}::int, ${Number(date.replaceAll('-', ''))}::int)`;
}

async function rangeData(employee, start, end, db = prisma) {
  const where = { employee_id: employee.employee_id, date: { gte: asDate(start), lte: asDate(end) } };

  const attendanceModel = db.attendances || db.attendance || db.Attendance;
  const leaveModel = db.Day_off_requests || db.day_off_requests || db.dayOffRequest || db.DayOffRequest;

  const [records, leaves] = await Promise.all([
    attendanceModel.findMany({ where, orderBy: { attendances_id: 'asc' } }),
    leaveModel?.findMany ? leaveModel.findMany({
      where: {
        employee_send_id: employee.employee_id,
        status: 'da_duoc_duyet',
        start_date: { lte: asDate(end) }
      }
    }) : Promise.reject(new Error('Không tìm thấy model nghỉ phép.')),
  ]);

  return { records, leaves, explanations: [] };
}

function dayData(date, employee, data, clock, req) {
  const records = data.records.filter(row => dateOnly(row.date) === date);
  const onLeave = data.leaves.some(leave => dateOnly(leave.start_date) <= date && dateOnly(leave.end_date || leave.start_date) >= date);
  return {
    ...classifyDay({ date, records, onLeave, startDate: dateOnly(employee.start_date), clock }),
    explanation: null
  };
}

export const getToday = handler(async (req, res) => {
  const employee = await employeeFor(req);
  const now = new Date();
  const clock = vietnamClock(now);
  const data = await rangeData(employee, clock.date, clock.date);
  res.json({
    server_now: now.toISOString(),
    day: dayData(clock.date, employee, data, clock, req),
    record: data.records.length === 1 ? recordData(data.records[0]) : null
  });
});

export const getTodayAttendance = getToday;

export const getMyAttendances = handler(async (req, res) => {
  const employee = await employeeFor(req);
  const month = req.query.month ?? vietnamClock().date.slice(0, 7);
  if (typeof month !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)) fail(400, 'Tháng cần có dạng YYYY-MM (1900–2199).');
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const start = `${month}-01`, end = `${month}-${lastDay}`;
  const data = await rangeData(employee, start, end);
  const now = new Date(), clock = vietnamClock(now);

  // Tạo danh sách các ngày cơ bản
  let days = Array.from({ length: lastDay }, (_, index) => dayData(`${month}-${String(index + 1).padStart(2, '0')}`, employee, data, clock, req));

  // --- TRUY VẤN VÀ NHÚNG THÔNG TIN GIẢI TRÌNH CHẤM CÔNG VÀO CÁC NGÀY TRONG THÁNG ---
  const explanations = await prisma.attendance_explanations.findMany({
    where: {
      employee_id: employee.employee_id,
      date: {
        gte: new Date(`${start}T00:00:00.000Z`),
        lte: new Date(`${end}T23:59:59.999Z`)
      }
    }
  });

  const explanationMap = new Map();
  explanations.forEach(exp => {
    const dateKey = exp.date.toISOString().slice(0, 10);
    explanationMap.set(dateKey, exp);
  });

  days = days.map(day => ({ ...day, explanation: explanationMap.get(day.date) || null }));

  res.json({ month, server_now: now.toISOString(), start_date: dateOnly(employee.start_date), days });
});
function punch(action) {
  return handler(async (req, res) => {
    const employee = await employeeFor(req);
    const clock = vietnamClock();
    if (weekend(clock.date)) fail(400, 'Hôm nay là cuối tuần (Thứ 7 hoặc Chủ Nhật), không cần chấm công!');
    if (employee.start_date && clock.date < dateOnly(employee.start_date)) fail(400, 'Chưa đến ngày bắt đầu làm việc.');

    const { confirmedEarly } = req.body ?? {};

    const result = await prisma.$transaction(async tx => {
      await lockDay(tx, employee.employee_id, clock.date);
      const actual = vietnamClock();
      if (actual.date !== clock.date) fail(409, 'Ngày chấm công vừa thay đổi, vui lòng tải lại.');

      const attendanceModel = tx.attendances || tx.attendance || tx.Attendance;
      if (!attendanceModel) fail(500, 'Không tìm thấy model bảng chấm công trong Prisma.');

      const data = await rangeData(employee, clock.date, clock.date, tx);
      if (data.leaves.some(leave => dateOnly(leave.start_date) <= clock.date && dateOnly(leave.end_date || leave.start_date) >= clock.date)) {
        fail(409, 'Hôm nay bạn nghỉ phép đã được duyệt, không thể vào hoặc ra ca.');
      }

      const rows = data.records;
      if (rows.length > 1) fail(409, 'Ngày này có nhiều bản ghi công, cần quản trị viên kiểm tra.');

      const row = rows[0];
      if (action === 'in' && row?.check_in) fail(400, 'Bạn đã thực hiện vào ca vào ngày hôm nay rồi!');
      if (action === 'out' && !row?.check_in) fail(400, 'Bạn chưa thực hiện vào ca ngày hôm nay, không thể ra ca!');
      if (action === 'out' && row.check_out) fail(400, 'Bạn đã thực hiện ra ca ngày hôm nay rồi!');

      const checkInStr = row?.check_in ? formatTimeVN(row.check_in) : '00:00:00';
      if (action === 'out' && actual.time < checkInStr) fail(409, 'Giờ ra ca không được trước giờ vào ca.');

      if (action === 'out' && actual.time < '17:00:00' && confirmedEarly !== true) {
        return { requireConfirmation: true, message: 'Hiện tại chưa đến 17:00 (chưa hết giờ làm). Bạn có chắc chắn muốn ra ca sớm không?' };
      }

      const field = action === 'in' ? 'check_in' : 'check_out';
      const value = new Date(`1970-01-01T${actual.time}Z`);

      return row ? attendanceModel.update({ where: { attendances_id: row.attendances_id || row.id }, data: { [field]: value } })
        : attendanceModel.create({ data: { employee_id: employee.employee_id, date: asDate(clock.date), check_in: value, created_at: new Date() } });
    });

    if (result && result.requireConfirmation) {
      return res.json({
        success: false,
        requireConfirmation: true,
        message: result.message
      });
    }

    const checkInTimeStr = result.check_in ? formatTimeVN(result.check_in) : '';
    const checkOutTimeStr = result.check_out ? formatTimeVN(result.check_out) : '';

    const late = checkInTimeStr > '08:00:00';
    const early = checkOutTimeStr && checkOutTimeStr < '17:00:00';

    res.json({
      message: action === 'in'
        ? (late ? 'Vào ca thành công (Tính là đi muộn).' : 'Vào ca thành công đúng giờ!')
        : (early ? 'Ra ca thành công (Tính là về sớm).' : 'Ra ca thành công đúng giờ!'),
      data: recordData(result)
    });
  });
}

export const checkIn = punch('in');
export const checkOut = punch('out');

// Vô hiệu hóa các hàm giải trình để không gọi bảng không tồn tại
export const createExplanation = handler(async (req, res) => {
  fail(400, 'Tính năng giải trình chấm công đã bị vô hiệu hóa.');
});

export const listExplanations = handler(async (req, res) => {
  await requireCurrentAdmin(req);
  res.json([]);
});

export const reviewExplanation = handler(async (req, res) => {
  await requireCurrentAdmin(req);
  fail(400, 'Tính năng giải trình chấm công đã bị vô hiệu hóa.');
});

export const getCompanyAttendanceSummary = handler(async (req, res) => {
  await requireCurrentAdmin(req);

  const month = req.query.month ?? vietnamClock().date.slice(0, 7);
  if (typeof month !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
    fail(400, 'Tháng cần có dạng YYYY-MM (ví dụ: 2026-10).');
  }

  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const start = `${month}-01`;
  const end = `${month}-${lastDay}`;

  const employeeModel = prisma.employees || prisma.employee || prisma.Employee;
  if (!employeeModel) fail(500, 'Không tìm thấy model nhân viên trong Prisma.');

  const employees = await employeeModel.findMany({
    where: { status: 'dang_lam_viec' },
    select: { employee_id: true, fullname: true, email: true, start_date: true }
  });

  const attendanceModel = prisma.attendances || prisma.attendance || prisma.Attendance;
  const leaveModel = prisma.Day_off_requests || prisma.day_off_requests || prisma.dayOffRequest || prisma.DayOffRequest;

  if (!attendanceModel) fail(500, 'Không tìm thấy model chấm công trong Prisma.');

  const [allRecords] = await Promise.all([
    attendanceModel.findMany({
      where: { date: { gte: asDate(start), lte: asDate(end) } }
    }).catch(() => [])
  ]);

  let totalFullAttendance = 0;
  let totalMissingAttendance = 0;
  let totalLateOrEarly = 0;

  const employeeDetails = employees.map(emp => {
    const empRecords = allRecords.filter(r => r.employee_id === emp.employee_id);

    let daysWorked = empRecords.length;
    let lateCount = 0;
    let earlyCount = 0;

    empRecords.forEach(r => {
      const checkInStr = r.check_in ? formatTimeVN(r.check_in) : '';
      const checkOutStr = r.check_out ? formatTimeVN(r.check_out) : '';
      if (checkInStr > '08:00:00') lateCount++;
      if (checkOutStr && checkOutStr < '17:00:00') earlyCount++;
    });

    const isLateOrEarly = lateCount > 0 || earlyCount > 0;
    if (isLateOrEarly) {
      totalLateOrEarly += (lateCount + earlyCount);
    }

    const isFull = daysWorked >= 20 && !isLateOrEarly;
    const isMissing = daysWorked < 15;

    if (isFull) totalFullAttendance++;
    else if (isMissing) totalMissingAttendance++;

    return {
      employee_id: emp.employee_id,
      fullname: emp.fullname,
      email: emp.email,
      days_worked: daysWorked,
      late_count: lateCount,
      early_count: earlyCount,
      status_summary: isFull ? 'Đủ công' : (isMissing ? 'Thiếu công' : 'Bình thường')
    };
  });

  res.json({
    month,
    overview: {
      total_employees: employees.length,
      full_attendance_count: totalFullAttendance,
      missing_attendance_count: totalMissingAttendance,
      late_or_early_count: totalLateOrEarly,
      on_leave_count: 0
    },
    employees: employeeDetails
  });
});

export const getEmployeeAttendanceByAdmin = handler(async (req, res) => {
  await requireCurrentAdmin(req);
  const employeeId = parseId(req.params.id);
  if (!employeeId) fail(400, 'Mã nhân viên không hợp lệ.');

  const employeeModel = prisma.employees || prisma.employee || prisma.Employee;
  const employee = await employeeModel.findUnique({ where: { employee_id: employeeId } });
  if (!employee) fail(404, 'Không tìm thấy hồ sơ nhân viên.');

  const month = req.query.month ?? vietnamClock().date.slice(0, 7);
  if (typeof month !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
    fail(400, 'Tháng cần có dạng YYYY-MM.');
  }

  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const start = `${month}-01`, end = `${month}-${lastDay}`;

  const data = await rangeData(employee, start, end);
  const now = new Date(), clock = vietnamClock(now);
  const days = Array.from({ length: lastDay }, (_, index) =>
    dayData(`${month}-${String(index + 1).padStart(2, '0')}`, employee, data, clock, req)
  );

  res.json({
    month,
    server_now: now.toISOString(),
    start_date: dateOnly(employee.start_date),
    employee,
    days
  });
});
