import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mini_erp_super_secret_key_2026';

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ username và password!' });
    }

    const user = await prisma.users.findFirst({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại trong hệ thống!' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
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
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};