import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body ?? {};

    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ username và password!' });
    }

    // Không chọn ngẫu nhiên danh tính khi dữ liệu có username trùng.
    const users = await prisma.users.findMany({
      where: { username: username.trim() },
      include: { employees: { select: { employee_id: true, status: true } } },
      take: 2,
    });
    if (users.length > 1) return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
    const user = users[0];

    const isPasswordValid = user && typeof user.password === 'string' && await bcrypt.compare(password, user.password);
    if (!user || !isPasswordValid || user.employees?.status === 'da_nghi_viec') {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
    }

    const mustChangePassword = Boolean(user.must_change_password);
    if (mustChangePassword
      && (!user.temp_password_expires_at || user.temp_password_expires_at <= new Date())) {
      return res.status(403).json({
        code: 'TEMP_PASSWORD_EXPIRED',
        error: 'Mật khẩu tạm đã hết hạn. Vui lòng liên hệ quản trị viên để cấp lại.',
      });
    }

    if (mustChangePassword) {
      const activation = await prisma.users.updateMany({
        where: {
          user_id: user.user_id,
          must_change_password: true,
          temp_password_used_at: null,
          temp_password_expires_at: { gt: new Date() },
        },
        data: { temp_password_used_at: new Date() },
      });
      if (activation.count !== 1) {
        return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
      }
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        user_id: user.user_id,
        employee_id: user.employees?.employee_id ?? null,
        username: user.username,
        role: String(user.role || '').trim().toLowerCase(),
        must_change_password: mustChangePassword,
        temp_password_expires_at: user.temp_password_expires_at,
      }
    });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error.code || error.name);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' });
  }
};
