import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mini_erp_super_secret_key_2026';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body ?? {};

    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ username và password!' });
    }

    // Không chọn ngẫu nhiên danh tính khi dữ liệu có username trùng.
    const users = await prisma.users.findMany({
      where: { username: username.trim() },
      include: { employees: { select: { employee_id: true } } },
      take: 2,
    });
    if (users.length > 1) {
      return res.status(409).json({ error: 'Tên đăng nhập bị trùng trong hệ thống. Vui lòng liên hệ quản trị viên để xử lý.' });
    }
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại trong hệ thống!' });
    }

    const isPasswordValid = typeof user.password === 'string' && await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Mật khẩu không chính xác!' });
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
        role: user.role
      }
    });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' });
  }
};
