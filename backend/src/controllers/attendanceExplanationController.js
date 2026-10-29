import prisma from '../config/prisma.js';

const EXPLANATION_STATUSES = ['pending', 'approved', 'rejected'];

// 1. GỬI ĐƠN GIẢI TRÌNH CHẤM CÔNG (CÓ KIỂM TRA QUÁ HẠN 3 NGÀY)
export const createAttendanceExplanation = async (req, res) => {
  try {
    const { date, reason, makeup_date } = req.body || {};

    let employeeId = req.employee?.employee_id;
    if (!employeeId && req.user?.user_id) {
      const empRecord = await prisma.employees.findUnique({
        where: { user_id: req.user.user_id },
        select: { employee_id: true }
      });
      employeeId = empRecord?.employee_id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'Không tìm thấy thông tin nhân viên tương ứng với tài khoản đăng nhập.' });
    }

    if (!date || !reason || !reason.trim()) {
      return res.status(400).json({ error: 'Vui lòng cung cấp ngày và lý do giải trình.' });
    }

    // --- KIỂM TRA ĐIỀU KIỆN THỜI GIAN (QUÁ 3 NGÀY SO VỚI NGÀY CẦN GIẢI TRÌNH) ---
    const targetDate = new Date(`${date}T00:00:00.000Z`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 3) {
      return res.status(400).json({
        error: `Đã quá thời hạn 3 ngày cho phép để gửi giải trình cho ngày này (quá hạn ${diffDays - 3} ngày).`
      });
    }

    if (diffDays < -30) {
      return res.status(400).json({ error: 'Không thể gửi giải trình cho ngày quá xa trong tương lai.' });
    }
    // --------------------------------------------------------------------------

    const existing = await prisma.attendance_explanations.findUnique({
      where: {
        employee_id_date: {
          employee_id: employeeId,
          date: targetDate
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Bạn đã gửi giải trình cho ngày này rồi.' });
    }

    const sender = await prisma.employees.findUnique({
      where: { employee_id: employeeId },
      select: { department_id: true }
    });

    let reviewerUserId = null;

    const managerInDept = await prisma.employees.findFirst({
      where: {
        department_id: sender?.department_id,
        employee_id: { not: employeeId },
        status: 'dang_lam_viec',
        users: { role: { equals: 'MANAGER', mode: 'insensitive' } }
      },
      select: { user_id: true }
    });

    if (managerInDept) {
      reviewerUserId = managerInDept.user_id;
    } else {
      const adminUser = await prisma.users.findFirst({
        where: { role: { equals: 'ADMIN', mode: 'insensitive' } },
        select: { user_id: true },
        orderBy: { user_id: 'asc' }
      });
      reviewerUserId = adminUser?.user_id;
    }

    const explanation = await prisma.attendance_explanations.create({
      data: {
        employee_id: employeeId,
        date: targetDate,
        reason: reason.trim(),
        makeup_date: makeup_date ? new Date(`${makeup_date}T00:00:00.000Z`) : null,
        status: 'pending',
        reviewed_by: reviewerUserId
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Gửi giải trình chấm công thành công!',
      data: explanation
    });
  } catch (error) {
    console.error('Create Explanation Error:', error);
    return res.status(500).json({ error: 'Lỗi server khi gửi giải trình chấm công.' });
  }
};

// 2. LẤY DANH SÁCH GIẢI TRÌNH (MANAGER CHỈ XEM ĐƠN GỬI ĐẾN CHÍNH MÌNH)
export const getAttendanceExplanations = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const { status } = req.query;

    const where = {};
    if (status && EXPLANATION_STATUSES.includes(status)) {
      where.status = status;
    }

    if (role === 'admin') {
      // Admin xem toàn bộ
    } else if (role === 'manager') {
      // Manager chỉ xem đơn gửi đích danh cho mình (giống hệt employee_receive_id bên nghỉ phép)
      where.reviewed_by = req.user.user_id;
    } else {
      let currentEmployeeId = req.employee?.employee_id;
      if (!currentEmployeeId && req.user?.user_id) {
        const emp = await prisma.employees.findUnique({
          where: { user_id: req.user.user_id },
          select: { employee_id: true }
        });
        currentEmployeeId = emp?.employee_id;
      }

      if (currentEmployeeId) {
        where.employee_id = currentEmployeeId;
      } else {
        return res.json({ success: true, explanations: [] });
      }
    }

    const explanations = await prisma.attendance_explanations.findMany({
      where,
      include: {
        employees: {
          select: {
            fullname: true,
            email: true,
            department_id: true,
            departments: { select: { department_name: true } }
          }
        },
        reviewer: {
          select: { username: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.json({ success: true, explanations });
  } catch (error) {
    console.error('Get Explanations Error:', error);
    return res.status(500).json({ error: 'Không thể tải danh sách giải trình.' });
  }
};

// 3. DUYỆT / TỪ CHỐI GIẢI TRÌNH (TÍCH HỢP TRỪ QUỸ PHÉP KHI DUYỆT)
export const reviewAttendanceExplanation = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'manager'].includes(role)) {
      return res.status(403).json({ error: 'Chỉ quản lý hoặc Admin mới được duyệt giải trình.' });
    }

    const { status, review_note } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái duyệt không hợp lệ.' });
    }

    const id = Number(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      const explanation = await tx.attendance_explanations.findUnique({
        where: { id },
        include: { employees: true }
      });

      if (!explanation) {
        return { status: 404, error: 'Không tìm thấy đơn giải trình.' };
      }

      let currentEmployeeId = req.employee?.employee_id;
      if (!currentEmployeeId && req.user?.user_id) {
        const emp = await tx.employees.findUnique({
          where: { user_id: req.user.user_id },
          select: { employee_id: true }
        });
        currentEmployeeId = emp?.employee_id;
      }

      if (explanation.employee_id === currentEmployeeId) {
        return { status: 403, error: 'Bạn không thể tự duyệt giải trình của chính mình.' };
      }

      if (role !== 'admin' && explanation.reviewed_by !== req.user.user_id) {
        return { status: 403, error: 'Đơn này không được gửi đến bạn để duyệt.' };
      }

      if (explanation.status !== 'pending') {
        return { status: 409, error: 'Đơn này đã được xử lý trước đó.' };
      }

      // NẾU DUYỆT: Kiểm tra hạn mức phép năm và quy đổi thành đơn nghỉ phép để trừ quỹ phép
      if (status === 'approved') {
        const year = new Date(explanation.date).getFullYear();
        const MAX_LEAVE_DAYS = 12;

        const existingRequests = await tx.Day_off_requests.findMany({
          where: {
            employee_send_id: explanation.employee_id,
            status: 'da_duoc_duyet'
          },
          select: { start_date: true },
        });

        const usedDays = existingRequests.length;
        if (usedDays + 1 > MAX_LEAVE_DAYS) {
          return {
            status: 400,
            error: `Không thể duyệt vì nhân viên đã dùng hết hạn mức phép năm (${MAX_LEAVE_DAYS} ngày) trong năm ${year}.`
          };
        }

        // Tạo bản ghi quy đổi sang nghỉ phép để hệ thống tự động trừ quỹ phép năm
        await tx.Day_off_requests.create({
          data: {
            employee_send_id: explanation.employee_id,
            employee_receive_id: explanation.reviewed_by,
            start_date: explanation.date,
            end_date: explanation.date,
            reason: `Quy đổi từ giải trình chấm công: ${explanation.reason}`,
            status: 'da_duoc_duyet'
          }
        });
      }

      const updated = await tx.attendance_explanations.update({
        where: { id },
        data: {
          status,
          review_note: review_note ? review_note.trim() : null,
          reviewed_by: req.user.user_id,
          reviewed_at: new Date()
        }
      });

      return { status: 200, data: updated };
    });

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({
      success: true,
      message: status === 'approved' ? 'Đã duyệt giải trình và quy đổi ngày nghỉ phép thành công.' : 'Đã từ chối giải trình.',
      data: result.data
    });

  } catch (error) {
    console.error('Review Explanation Error:', error);
    return res.status(500).json({ error: 'Lỗi khi xử lý duyệt giải trình.' });
  }
};

// HỦY ĐƠN GIẢI TRÌNH (CHỈ KHI ĐANG CHỜ DUYỆT)
export const cancelAttendanceExplanation = async (req, res) => {
  try {
    const id = Number(req.params.id);

    let employeeId = req.employee?.employee_id;
    if (!employeeId && req.user?.user_id) {
      const emp = await prisma.employees.findUnique({
        where: { user_id: req.user.user_id },
        select: { employee_id: true }
      });
      employeeId = emp?.employee_id;
    }

    const explanation = await prisma.attendance_explanations.findUnique({
      where: { id }
    });

    if (!explanation) {
      return res.status(404).json({ error: 'Không tìm thấy đơn giải trình.' });
    }

    if (explanation.employee_id !== employeeId) {
      return res.status(403).json({ error: 'Bạn không có quyền hủy đơn giải trình này.' });
    }

    if (explanation.status !== 'pending') {
      return res.status(400).json({ error: 'Chỉ có thể hủy đơn giải trình đang chờ duyệt.' });
    }

    await prisma.attendance_explanations.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Đã hủy đơn giải trình thành công.'
    });
  } catch (error) {
    console.error('Cancel Explanation Error:', error);
    return res.status(500).json({ error: 'Lỗi server khi hủy đơn giải trình.' });
  }
};