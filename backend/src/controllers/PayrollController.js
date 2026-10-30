import prisma from '../config/prisma.js';
import { vietnamClock } from '../utils/attendanceRules.js';

// Helper xử lý lỗi try/catch tự động
const handler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// Helper chuẩn hóa ngày về dạng YYYY-MM-DD theo giờ Việt Nam chuẩn (tránh lệch UTC)
function formatToVNYearMonthDay(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

// Helper lấy danh sách các ngày làm việc (Thứ 2 đến Thứ 6) chuẩn múi giờ
function getWorkingDaysBetween(startDate, endDate) {
  const dates = [];
  const startStr = formatToVNYearMonthDay(startDate);
  const endStr = formatToVNYearMonthDay(endDate);

  if (!startStr || !endStr) return dates;

  let cursor = new Date(`${startStr}T00:00:00+07:00`);
  const last = new Date(`${endStr}T00:00:00+07:00`);

  while (cursor <= last) {
    const dateStr = formatToVNYearMonthDay(cursor);
    const dayNum = new Date(`${dateStr}T12:00:00+07:00`).getDay();
    // Từ Thứ 2 (1) đến Thứ 6 (5)
    if (dayNum !== 0 && dayNum !== 6) {
      dates.push(dateStr);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

// Hàm tính toán chi tiết ngày công thực tế cho 1 nhân sự
async function calculateEmployeeWorkingDays(employeeId, userId, month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  const startStr = `${month}-01`;
  const endStr = `${month}-${lastDay}`;
  const startDate = new Date(`${startStr}T00:00:00.000Z`);
  const endDate = new Date(`${endStr}T23:59:59.999Z`);

  const workedDatesSet = new Set();

  // 1. Lấy danh sách chấm công trong tháng
  const attendances = await prisma.attendances.findMany({
    where: {
      employee_id: employeeId,
      date: { gte: startDate, lte: endDate }
    }
  });

  attendances.forEach(att => {
    const dateStr = formatToVNYearMonthDay(att.date);
    const status = String(att.status || '').toLowerCase();

    if (dateStr && status !== 'absent' && status !== 'khong_cong' && status !== 'vang') {
      workedDatesSet.add(dateStr);
    }
  });

  // 2. Lấy giải trình được duyệt (nếu có)
  const approvedExplanations = await prisma.attendance_explanations.findMany({
    where: {
      employee_id: employeeId,
      date: { gte: startDate, lte: endDate }
    }
  });

  approvedExplanations.forEach(exp => {
    const status = String(exp.status || '').toLowerCase();
    if (['approved', 'da_duoc_duyet', 'da_duyet'].includes(status)) {
      const dateStr = formatToVNYearMonthDay(exp.date);
      if (dateStr) workedDatesSet.add(dateStr);
    }
  });

  return workedDatesSet.size;
}

// 1. NHÂN VIÊN XEM BẢNG LƯƠNG CÁ NHÂN THEO THÁNG (/self-payroll)
export const getMyPayroll = handler(async (req, res) => {
  // SỬA Ở ĐÂY: Thêm orderBy: { employee_id: 'desc' } để lấy đúng nhân viên ID 32 mới nhất
  const employee = await prisma.employees.findFirst({
    where: { user_id: req.user?.id },
    orderBy: { employee_id: 'desc' },
    include: { departments: true }
  });

  if (!employee) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin nhân viên.' });
  }

  const month = req.query.month ?? vietnamClock().date.slice(0, 7);

  if (typeof month !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ success: false, message: 'Tháng cần có dạng YYYY-MM (ví dụ: 2026-10).' });
  }

  // Tính toán lại ngày công theo thời gian thực (đã bao gồm đơn nghỉ phép duyệt)
  const workedDays = await calculateEmployeeWorkingDays(employee.employee_id, employee.user_id, month);
  const baseSalary = Math.round(Number(employee.base_salary || 10000000));
  const standardDays = 22;

  let offDays = standardDays - workedDays;
  if (offDays < 0) offDays = 0;

  const deduction = Math.round((offDays * (baseSalary / standardDays)) / 1000) * 1000;

  // Kiểm tra bảng lương trong DB để lấy khoản extra (nếu có)
  const existingPayroll = await prisma.payrolls.findUnique({
    where: {
      employee_id_month: {
        employee_id: employee.employee_id,
        month: month
      }
    }
  });

  const extra = existingPayroll ? Math.round(Number(existingPayroll.extra || 0)) : 0;
  let netSalary = baseSalary - deduction + extra;
  if (netSalary < 0) netSalary = 0;
  netSalary = Math.round(netSalary / 1000) * 1000;

  const payrollData = {
    month,
    base_salary: baseSalary,
    standard_days: standardDays,
    off_days: offDays,
    deduction: deduction,
    extra: extra,
    net_salary: netSalary,
    status: existingPayroll?.status || 'chua_chot'
  };

  // Cập nhật/Đồng bộ lại vào bảng payrolls trong DB ngay lập tức
  await prisma.payrolls.upsert({
    where: { employee_id_month: { employee_id: employee.employee_id, month } },
    update: {
      base_salary: baseSalary,
      standard_days: standardDays,
      off_days: offDays,
      deduction: deduction,
      net_salary: netSalary,
      updated_at: new Date()
    },
    create: {
      employee_id: employee.employee_id,
      month,
      base_salary: baseSalary,
      standard_days: standardDays,
      off_days: offDays,
      deduction: deduction,
      extra: 0,
      net_salary: netSalary,
      status: 'draft'
    }
  });

  // Áp dụng cơ chế trạng thái tự động theo thời gian thực
  const currentMonthStr = vietnamClock().date.slice(0, 7);
  let computedStatus = payrollData.status;

  if (computedStatus !== 'paid') {
    if (month === currentMonthStr) {
      computedStatus = 'chua_chot';
    } else if (month < currentMonthStr) {
      computedStatus = 'chua_thanh_toan';
    } else {
      computedStatus = 'chua_chot';
    }
  }

  res.json({
    success: true,
    data: {
      ...payrollData,
      employee: {
        fullname: employee.fullname,
        department_name: employee.departments?.department_name || 'Chưa phân ban'
      },
      computed_status: computedStatus
    }
  });
});

// 2. ADMIN XEM DANH SÁCH BẢNG LƯƠNG TOÀN CÔNG TY (/company-payrolls)
export const getCompanyPayrolls = handler(async (req, res) => {
  const month = req.query.month || vietnamClock().date.slice(0, 7);

  if (typeof month !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ success: false, message: 'Tháng cần có dạng YYYY-MM (ví dụ: 2026-10).' });
  }

  const payrolls = await prisma.payrolls.findMany({
    where: { month: month },
    include: {
      employee: {
        include: { departments: true }
      }
    },
    orderBy: { employee_id: 'asc' }
  });

  const currentMonthStr = vietnamClock().date.slice(0, 7);

  const processedPayrolls = payrolls.map((item) => {
    let computedStatus = item.status;
    if (computedStatus !== 'paid') {
      if (month === currentMonthStr) {
        computedStatus = 'chua_chot';
      } else if (month < currentMonthStr) {
        computedStatus = 'chua_thanh_toan';
      } else {
        computedStatus = 'chua_chot';
      }
    }

    return {
      ...item,
      computed_status: computedStatus
    };
  });

  res.json({ success: true, month, data: processedPayrolls });
});

// 3. ADMIN TÍNH TOÁN VÀ CHỐT LƯƠNG TOÀN CÔNG TY (/company-payrolls/calculate)
export const calculateCompanyPayroll = handler(async (req, res) => {
  const month = req.body.month || req.query.month || vietnamClock().date.slice(0, 7);

  if (typeof month !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ success: false, message: 'Tháng cần có dạng YYYY-MM (ví dụ: 2026-10).' });
  }

  const employees = await prisma.employees.findMany({
    where: { status: 'dang_lam_viec' }
  });

  const results = [];
  const standardDays = 22;

  for (const emp of employees) {
    const baseSalary = Math.round(Number(emp.base_salary || 10000000));
    const workedDays = await calculateEmployeeWorkingDays(emp.employee_id, emp.user_id, month);

    let offDays = standardDays - workedDays;
    if (offDays < 0) offDays = 0;

    const deduction = Math.round((offDays * (baseSalary / standardDays)) / 1000) * 1000;

    const existingPayroll = await prisma.payrolls.findUnique({
      where: {
        employee_id_month: {
          employee_id: emp.employee_id,
          month: month
        }
      }
    });

    const extra = existingPayroll ? Math.round(Number(existingPayroll.extra || 0)) : 0;

    let netSalary = baseSalary - deduction + extra;
    if (netSalary < 0) netSalary = 0;
    netSalary = Math.round(netSalary / 1000) * 1000;

    const savedPayroll = await prisma.payrolls.upsert({
      where: {
        employee_id_month: {
          employee_id: emp.employee_id,
          month: month
        }
      },
      update: {
        base_salary: baseSalary,
        standard_days: standardDays,
        off_days: offDays,
        deduction: deduction,
        net_salary: netSalary,
        updated_at: new Date()
      },
      create: {
        employee_id: emp.employee_id,
        month: month,
        base_salary: baseSalary,
        standard_days: standardDays,
        off_days: offDays,
        deduction: deduction,
        extra: 0,
        net_salary: netSalary,
        status: 'draft'
      }
    });

    results.push(savedPayroll);
  }

  res.json({
    success: true,
    message: `Đã tính toán bảng lương tháng ${month} thành công cho ${results.length} nhân sự!`,
    data: results
  });
});