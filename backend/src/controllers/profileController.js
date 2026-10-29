import prisma from '../config/prisma.js';
import { validateProfileUpdate } from '../utils/profileRules.js';

export async function updateMyProfile(req, res) {
  const { data, error } = validateProfileUpdate(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const profile = await prisma.employees.update({
      where: { employee_id: req.employee.employee_id }, data,
      include: { users: { select: { username: true, role: true } }, departments: { select: { department_name: true } } },
    });
    return res.json(profile);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Tài khoản chưa có hồ sơ nhân viên.' });
    console.error('Update personal profile:', error.code || error.name);
    return res.status(500).json({ error: 'Không cập nhật được thông tin cá nhân. Vui lòng thử lại.' });
  }
}
