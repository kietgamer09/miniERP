import prisma from '../config/prisma.js';

// --- 1. TẠO ĐƠN XIN NGHỈ PHÉP ---
export const createLeaveRequest = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { dates, reason } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất một ngày xin nghỉ.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do xin nghỉ phép.' });
    }

    const employee = await prisma.employees.findUnique({
      where: { user_id: userId }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin nhân viên.' });
    }

    const employeeId = employee.employee_id;

    const sortedDates = [...dates].sort();
    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);
    const year = startDate.getFullYear();

    // Lấy các đơn đang chờ hoặc đã duyệt trong năm
    const existingRequests = await prisma.Day_off_requests.findMany({
      where: {
        employee_send_id: employeeId,
        status: { in: ['cho_xac_thuc', 'da_duoc_duyet'] }
      }
    });

    let usedDaysCount = 0;
    existingRequests.forEach(reqItem => {
      if (reqItem.start_date && reqItem.end_date) {
        const start = new Date(reqItem.start_date);
        const end = new Date(reqItem.end_date);
        if (start.getFullYear() === year) {
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          usedDaysCount += diffDays;
        }
      }
    });

    const requestedDaysCount = dates.length;
    const MAX_LEAVE_DAYS = 12;

    if (usedDaysCount + requestedDaysCount > MAX_LEAVE_DAYS) {
      return res.status(400).json({
        error: `Bạn đã dùng/đăng ký ${usedDaysCount} ngày phép trong năm ${year}. Hạn mức tối đa là ${MAX_LEAVE_DAYS} ngày/năm!`
      });
    }

    let recipientId = employee.manager_id || null;
    const adminEmployee = await prisma.employees.findFirst({
      where: { users: { role: 'ADMIN' } }
    });
    recipientId = recipientId || (adminEmployee ? adminEmployee.employee_id : employeeId);

    const newLeaveRequest = await prisma.Day_off_requests.create({
      data: {
        employee_send_id: employeeId,
        employee_receive_id: recipientId,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        status: 'cho_xac_thuc'
      }
    });

    res.json({
      success: true,
      message: `Gửi đơn thành công! Tổng số phép đã dùng/đăng ký: ${usedDaysCount + requestedDaysCount}/${MAX_LEAVE_DAYS} ngày.`,
      data: newLeaveRequest
    });
  } catch (error) {
    console.error('Create Leave Error:', error);
    res.status(500).json({ error: 'Lỗi server khi tạo đơn xin nghỉ phép.' });
  }
};

// --- 2. LẤY TỔNG QUAN SỐ PHÉP CÒN LẠI ---
export const getMyLeaveSummary = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const employee = await prisma.employees.findUnique({ where: { user_id: userId } });

    if (!employee) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
    }

    const employeeId = employee.employee_id;
    const year = new Date().getFullYear();

    const existingRequests = await prisma.Day_off_requests.findMany({
      where: {
        employee_send_id: employeeId,
        status: { in: ['cho_xac_thuc', 'da_duoc_duyet'] }
      }
    });

    let usedDays = 0;
    existingRequests.forEach(reqItem => {
      if (reqItem.start_date && reqItem.end_date) {
        const start = new Date(reqItem.start_date);
        const end = new Date(reqItem.end_date);
        if (start.getFullYear() === year) {
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          usedDays += diffDays;
        }
      }
    });

    const maxDays = 12;
    const remainingDays = Math.max(0, maxDays - usedDays);

    res.json({
      success: true,
      year,
      max_days: maxDays,
      used_days: usedDays,
      remaining_days: remainingDays
    });
  } catch (error) {
    console.error('Get Leave Summary Error:', error);
    res.status(500).json({ error: 'Lỗi khi tải thông tin số ngày phép.' });
  }
};

// --- 3. LẤY DANH SÁCH ĐƠN XIN NGHỈ (Đã fix chuẩn role chữ thường) ---
export const getLeaveRequests = async (req, res) => {
  try {
    const { user_id, role } = req.user;
    const { status } = req.query;

    let whereCondition = {};
    if (status) {
      whereCondition.status = status;
    }

    let requests;
    // Chuẩn hóa role về chữ thường để so khớp chính xác với DB ('admin', 'manager', 'member')
    const currentRole = role ? role.toLowerCase() : '';

    if (currentRole === 'admin' || currentRole === 'manager') {
      // Admin hoặc Manager được xem toàn bộ danh sách đơn theo trạng thái lọc
      requests = await prisma.Day_off_requests.findMany({
        where: whereCondition,
        include: {
          employees_Day_off_requests_employee_send_idToemployees: {
            select: { fullname: true, email: true }
          }
        },
        orderBy: { created_at: 'desc' }
      });
    } else {
      // Member (nhân viên thường) chỉ được xem đơn do chính mình gửi đi
      const employee = await prisma.employees.findUnique({ where: { user_id } });
      if (!employee) return res.json({ success: true, requests: [] });

      whereCondition.employee_send_id = employee.employee_id;
      requests = await prisma.Day_off_requests.findMany({
        where: whereCondition,
        orderBy: { created_at: 'desc' }
      });
    }

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Get Leaves Error:', error);
    res.status(500).json({ error: 'Không thể tải danh sách đơn nghỉ phép.' });
  }
};

// --- 4. HỦY ĐƠN XIN NGHỈ (Dành cho nhân viên khi đơn còn chờ xác thực) ---
export const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const employee = await prisma.employees.findUnique({ where: { user_id: userId } });
    if (!employee) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên.' });
    }

    const leaveReq = await prisma.Day_off_requests.findUnique({
      where: { Day_off_id: Number(id) }
    });

    if (!leaveReq) {
      return res.status(404).json({ error: 'Không tìm thấy đơn xin nghỉ.' });
    }

    if (leaveReq.employee_send_id !== employee.employee_id) {
      return res.status(403).json({ error: 'Bạn không có quyền hủy đơn này.' });
    }

    if (leaveReq.status !== 'cho_xac_thuc') {
      return res.status(400).json({ error: 'Chỉ có thể hủy các đơn đang ở trạng thái chờ xác thực.' });
    }

    await prisma.Day_off_requests.delete({
      where: { Day_off_id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Đã hủy đơn xin nghỉ phép thành công.'
    });
  } catch (error) {
    console.error('Cancel Leave Error:', error);
    res.status(500).json({ error: 'Lỗi server khi hủy đơn.' });
  }
};

// --- 5. DUYỆT HOẶC TỪ CHỐI ĐƠN XIN NGHỈ ---
export const reviewLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['da_duoc_duyet', 'bi_tu_choi'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái duyệt không hợp lệ.' });
    }

    const updated = await prisma.Day_off_requests.update({
      where: { Day_off_id: Number(id) },
      data: { status }
    });

    res.json({
      success: true,
      message: status === 'da_duoc_duyet' ? 'Đã duyệt đơn nghỉ phép.' : 'Đã từ chối đơn nghỉ phép.',
      data: updated
    });
  } catch (error) {
    console.error('Review Leave Error:', error);
    res.status(500).json({ error: 'Lỗi khi xử lý duyệt đơn.' });
  }
};