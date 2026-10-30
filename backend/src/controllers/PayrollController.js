import prisma from '../config/prisma.js';
import { vietnamClock } from '../utils/attendanceRules.js';
import { payrollDays, payrollAmounts, paidPayroll, payrollStatus, workingDates } from '../utils/payrollRules.js';

const handler = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    console.error('Payroll request failed:', error);
    res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể xử lý bảng lương.' });
  }
};
function monthOf(value) {
  const month = value ?? vietnamClock().date.slice(0, 7);
  if (typeof month !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
    throw Object.assign(new Error('Tháng cần có dạng YYYY-MM.'), { status: 400 });
  }
  return month;
}
async function preview(db, employee, month, existing) {
  const dates = workingDates(month);
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(`${dates.at(-1)}T23:59:59.999Z`);
  const [records, leaves] = await Promise.all([
    db.attendances.findMany({ where: { employee_id: employee.employee_id, date: { gte: start, lte: end } } }),
    db.Day_off_requests.findMany({ where: { employee_send_id: employee.employee_id, status: 'da_duoc_duyet', start_date: { lte: end } } }),
  ]);
  const days = payrollDays({ month, employee, records, leaves });
  return { month, ...payrollAmounts(days, existing?.base_salary ?? 10000000, existing?.extra ?? 0), status: existing?.status ?? 'draft' };
}
export const getMyPayroll = handler(async (req, res) => {
  const userId = req.user?.user_id;
  if (!Number.isInteger(userId)) return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ.' });
  const employee = await prisma.employees.findUnique({ where: { user_id: userId }, include: { departments: true } });
  if (!employee || employee.status !== 'dang_lam_viec') return res.status(403).json({ success: false, message: 'Không có hồ sơ nhân viên đang làm việc.' });
  const month = monthOf(req.query.month);
  const existing = await prisma.payrolls.findUnique({ where: { employee_id_month: { employee_id: employee.employee_id, month } } });
  const data = existing || await preview(prisma, employee, month, null);
  res.json({ success: true, data: { ...data,
    employee: { fullname: employee.fullname, department_name: employee.departments?.department_name || 'Chưa phân ban' },
    computed_status: payrollStatus(data.status, month),
  } });
});
export const getCompanyPayrolls = handler(async (req, res) => {
  const month = monthOf(req.query.month);
  const data = await prisma.payrolls.findMany({ where: { month }, include: { employee: { include: { departments: true } } }, orderBy: { employee_id: 'asc' } });
  res.json({ success: true, month, data: data.map(item => ({ ...item, computed_status: payrollStatus(item.status, month) })) });
});
export const calculateCompanyPayroll = handler(async (req, res) => {
  const month = monthOf(req.body?.month ?? req.query.month);
  const results = await prisma.$transaction(async db => {
    const employees = await db.employees.findMany({ where: { status: 'dang_lam_viec' } });
    const rows = [];
    for (const employee of employees) {
      const key = { employee_id: employee.employee_id, month };
      const existing = await db.payrolls.findUnique({ where: { employee_id_month: key } });
      if (paidPayroll(existing?.status)) { rows.push(existing); continue; }
      const data = await preview(db, employee, month, existing);
      rows.push(await db.payrolls.upsert({ where: { employee_id_month: key }, update: data, create: { ...key, ...data } }));
    }
    return rows;
  }, { isolationLevel: 'Serializable', timeout: 60000 });
  res.json({ success: true, message: 'Đã tính bảng lương; giữ nguyên các bản đã thanh toán.', data: results });
});
