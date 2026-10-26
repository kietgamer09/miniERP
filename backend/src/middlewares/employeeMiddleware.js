import prisma from '../config/prisma.js';
import { parseId } from '../utils/validators.js';

export const attachEmployee = async (req, res, next) => {
  try {
    const userId = parseId(req.user?.user_id);
    if (!userId) return res.status(403).json({ error: 'Tài khoản chưa có hồ sơ nhân viên' });
    const employee = await prisma.employees.findUnique({
      where: { user_id: userId },
      select: { employee_id: true, status: true },
    });
    if (!employee) return res.status(403).json({ error: 'Tài khoản chưa có hồ sơ nhân viên' });
    if (employee.status !== 'dang_lam_viec') {
      return res.status(403).json({ error: 'Nhân viên đã nghỉ việc' });
    }
    req.employee = employee;
    next();
  } catch (error) {
    console.error('Không thể lấy hồ sơ nhân viên:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
};
