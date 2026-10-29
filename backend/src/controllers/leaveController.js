import prisma from '../config/prisma.js';

const MAX_LEAVE_DAYS = 12;
const ACTIVE_LEAVE_STATUSES = ['cho_xac_thuc', 'da_duoc_duyet'];
const LEAVE_STATUSES = [...ACTIVE_LEAVE_STATUSES, 'bi_tu_choi'];

function dateKey(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isWeekday(value) {
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

function workingDatesBetween(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last) {
    const value = cursor.toISOString().slice(0, 10);
    if (isWeekday(value)) dates.push(value);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function reservedWorkingDates(requests, year) {
  const dates = new Set();
  for (const request of requests) {
    const start = dateKey(request.start_date);
    const end = dateKey(request.end_date);
    if (!start || !end) continue;
    for (const date of workingDatesBetween(start, end)) {
      if (date.slice(0, 4) === String(year)) dates.add(date);
    }
  }
  return dates;
}

function validateRequestedDates(input) {
  if (!Array.isArray(input) || input.length === 0) return { error: 'Vui lòng chọn ít nhất một ngày xin nghỉ.' };
  if (input.some(date => !isValidDateOnly(date))) return { error: 'Ngày nghỉ không hợp lệ.' };
  const dates = [...new Set(input)].sort();
  if (dates.length !== input.length) return { error: 'Danh sách ngày nghỉ bị trùng.' };
  if (dates.some(date => !isWeekday(date))) return { error: 'Ngày phép chỉ tính từ Thứ 2 đến Thứ 6.' };
  if (dates.some(date => date.slice(0, 4) !== dates[0].slice(0, 4))) {
    return { error: 'Mỗi đơn nghỉ phép chỉ áp dụng trong một năm.' };
  }

  // Cơ sở dữ liệu hiện lưu mỗi đơn dưới dạng một khoảng ngày; buộc các ngày
  // đã chọn liền nhau theo ngày làm việc để số phép không bị tính sai.
  const representedDates = workingDatesBetween(dates[0], dates.at(-1));
  if (representedDates.length !== dates.length || representedDates.some((date, index) => date !== dates[index])) {
    return { error: 'Hãy chọn một khoảng ngày làm việc liên tiếp cho mỗi đơn nghỉ phép.' };
  }
  return { dates };
}

function summarizeLeave(requests, year) {
  const dates = reservedWorkingDates(requests, year);
  const usedDays = dates.size;
  return { usedDays, remainingDays: Math.max(0, MAX_LEAVE_DAYS - usedDays) };
}

function currentVietnamYear() {
  return Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(new Date()));
}

export const createLeaveRequest = async (req, res) => {
  const { dates: inputDates, reason } = req.body || {};
  const { dates, error: datesError } = validateRequestedDates(inputDates);
  if (datesError) return res.status(400).json({ error: datesError });
  if (typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập lý do xin nghỉ phép.' });
  }

  const employeeId = req.employee.employee_id;
  const startDate = dates[0];
  const endDate = dates.at(-1);
  const year = Number(startDate.slice(0, 4));

  try {
    const result = await prisma.$transaction(async tx => {
      const existingRequests = await tx.Day_off_requests.findMany({
        where: { employee_send_id: employeeId, status: { in: ACTIVE_LEAVE_STATUSES } },
        select: { start_date: true, end_date: true },
      });
      const reservedDates = reservedWorkingDates(existingRequests, year);
      const overlap = dates.find(date => reservedDates.has(date));
      if (overlap) return { status: 409, error: `Ngày ${overlap} đã có đơn chờ duyệt hoặc đã được duyệt.` };

      const requestedTotal = reservedDates.size + dates.length;
      if (requestedTotal > MAX_LEAVE_DAYS) {
        return { status: 400, error: `Bạn đã dùng/đăng ký ${reservedDates.size} ngày phép trong năm ${year}; chỉ còn ${Math.max(0, MAX_LEAVE_DAYS - reservedDates.size)} ngày.` };
      }

      const adminEmployee = await tx.employees.findFirst({
        where: {
          employee_id: { not: employeeId },
          status: 'dang_lam_viec',
          users: { role: { equals: 'ADMIN', mode: 'insensitive' } },
        },
        select: { employee_id: true },
        orderBy: { employee_id: 'asc' },
      });
      const recipientId = adminEmployee?.employee_id;
      if (!recipientId || recipientId === employeeId) {
        return { status: 409, error: 'Chưa có người duyệt khác người gửi. Hãy liên hệ quản trị viên.' };
      }

      const request = await tx.Day_off_requests.create({
        data: {
          employee_send_id: employeeId,
          employee_receive_id: recipientId,
          start_date: new Date(`${startDate}T00:00:00.000Z`),
          end_date: new Date(`${endDate}T00:00:00.000Z`),
          reason: reason.trim(),
          status: 'cho_xac_thuc',
        },
      });
      return { request, requestedTotal };
    }, { isolationLevel: 'Serializable' });

    if (result.error) return res.status(result.status).json({ error: result.error });
    return res.status(201).json({
      success: true,
      message: `Gửi đơn thành công! Tổng số phép đã dùng/đăng ký: ${result.requestedTotal}/${MAX_LEAVE_DAYS} ngày.`,
      data: result.request,
    });
  } catch (error) {
    console.error('Create Leave Error:', error);
    if (error.code === 'P2034') return res.status(409).json({ error: 'Dữ liệu phép năm vừa thay đổi, vui lòng tải lại và thử lại.' });
    return res.status(500).json({ error: 'Lỗi server khi tạo đơn xin nghỉ phép.' });
  }
};

export const getMyLeaveSummary = async (req, res) => {
  try {
    const year = currentVietnamYear();
    const requests = await prisma.Day_off_requests.findMany({
      where: { employee_send_id: req.employee.employee_id, status: { in: ACTIVE_LEAVE_STATUSES } },
      select: { start_date: true, end_date: true },
    });
    const { usedDays, remainingDays } = summarizeLeave(requests, year);
    return res.json({ success: true, year, max_days: MAX_LEAVE_DAYS, used_days: usedDays, remaining_days: remainingDays });
  } catch (error) {
    console.error('Get Leave Summary Error:', error);
    return res.status(500).json({ error: 'Lỗi khi tải thông tin số ngày phép.' });
  }
};

export const getLeaveRequests = async (req, res) => {
  try {
    const role = String(req.user.role || '').toLowerCase();
    const { status } = req.query;
    if (status && !LEAVE_STATUSES.includes(status)) return res.status(400).json({ error: 'Trạng thái đơn nghỉ không hợp lệ.' });
    const where = status ? { status } : {};
    if (role === 'admin') {
      // Admin được xem toàn bộ đơn.
    } else if (role === 'manager' && status) {
      where.employee_receive_id = req.employee.employee_id;
    } else {
      where.employee_send_id = req.employee.employee_id;
    }
    const requests = await prisma.Day_off_requests.findMany({
      where,
      include: {
        employees_Day_off_requests_employee_send_idToemployees: { select: { fullname: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return res.json({ success: true, requests });
  } catch (error) {
    console.error('Get Leaves Error:', error);
    return res.status(500).json({ error: 'Không thể tải danh sách đơn nghỉ phép.' });
  }
};

export const cancelLeaveRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const leaveReq = await prisma.Day_off_requests.findUnique({ where: { Day_off_id: id } });
    if (!leaveReq) return res.status(404).json({ error: 'Không tìm thấy đơn xin nghỉ.' });
    if (leaveReq.employee_send_id !== req.employee.employee_id) return res.status(403).json({ error: 'Bạn không có quyền hủy đơn này.' });
    if (leaveReq.status !== 'cho_xac_thuc') return res.status(400).json({ error: 'Chỉ có thể hủy các đơn đang chờ duyệt.' });
    await prisma.Day_off_requests.delete({ where: { Day_off_id: id } });
    return res.json({ success: true, message: 'Đã hủy đơn xin nghỉ phép thành công.' });
  } catch (error) {
    console.error('Cancel Leave Error:', error);
    return res.status(500).json({ error: 'Lỗi server khi hủy đơn.' });
  }
};

export const reviewLeaveRequest = async (req, res) => {
  try {
    const role = String(req.user.role || '').toLowerCase();
    if (!['admin', 'manager'].includes(role)) return res.status(403).json({ error: 'Chỉ quản lý hoặc Admin được duyệt đơn nghỉ phép.' });
    const { status } = req.body || {};
    if (!['da_duoc_duyet', 'bi_tu_choi'].includes(status)) return res.status(400).json({ error: 'Trạng thái duyệt không hợp lệ.' });

    const id = Number(req.params.id);
    const leaveReq = await prisma.Day_off_requests.findUnique({ where: { Day_off_id: id } });
    if (!leaveReq) return res.status(404).json({ error: 'Không tìm thấy đơn xin nghỉ.' });
    if (leaveReq.employee_send_id === req.employee.employee_id) return res.status(403).json({ error: 'Bạn không thể duyệt hoặc từ chối đơn nghỉ của chính mình.' });
    if (role !== 'admin' && leaveReq.employee_receive_id !== req.employee.employee_id) {
      return res.status(403).json({ error: 'Đơn này không được gửi đến bạn để duyệt.' });
    }
    if (leaveReq.status !== 'cho_xac_thuc') return res.status(409).json({ error: 'Đơn này đã được xử lý.' });

    const changed = await prisma.Day_off_requests.updateMany({
      where: { Day_off_id: id, status: 'cho_xac_thuc', employee_send_id: { not: req.employee.employee_id } },
      data: { status },
    });
    if (!changed.count) return res.status(409).json({ error: 'Đơn đã được xử lý hoặc không thể tự duyệt.' });
    const updated = await prisma.Day_off_requests.findUnique({ where: { Day_off_id: id } });
    return res.json({
      success: true,
      message: status === 'da_duoc_duyet' ? 'Đã duyệt đơn nghỉ phép.' : 'Đã từ chối đơn nghỉ phép.',
      data: updated,
    });
  } catch (error) {
    console.error('Review Leave Error:', error);
    return res.status(500).json({ error: 'Lỗi khi xử lý duyệt đơn.' });
  }
};
