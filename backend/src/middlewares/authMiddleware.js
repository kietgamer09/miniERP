import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { JWT_SECRET } from '../config/env.js';

function passwordChangeAllowed(req) {
  const pathname = (req.originalUrl || `${req.baseUrl || ''}${req.path || ''}`).split('?')[0];
  return (req.method === 'PUT' && pathname.endsWith('/api/users/change-password'))
    || (req.method === 'GET' && pathname.endsWith('/api/users/me'));
}

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không tìm thấy Token xác thực, vui lòng đăng nhập lại!' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn!' });
  }

  const userId = Number(decoded.user_id);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực' });
  }

  try {
    const currentUser = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        role: true,
        must_change_password: true,
        temp_password_expires_at: true,
        employees: { select: { status: true } },
      },
    });
    if (!currentUser || currentUser.employees?.status === 'da_nghi_viec') {
      return res.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực' });
    }

    const mustChangePassword = Boolean(currentUser.must_change_password);
    const temporaryPasswordExpired = mustChangePassword
      && (!currentUser.temp_password_expires_at || currentUser.temp_password_expires_at <= new Date());
    if (temporaryPasswordExpired) {
      return res.status(401).json({
        code: 'TEMP_PASSWORD_EXPIRED',
        error: 'Mật khẩu tạm đã hết hạn. Vui lòng liên hệ quản trị viên để cấp lại.',
      });
    }

    req.user = {
      ...decoded,
      user_id: currentUser.user_id,
      role: String(currentUser.role || '').trim().toLowerCase(),
      must_change_password: mustChangePassword,
    };

    if (mustChangePassword && !passwordChangeAllowed(req)) {
      return res.status(403).json({
        code: 'PASSWORD_CHANGE_REQUIRED',
        error: 'Hãy đổi mật khẩu tạm trước khi tiếp tục sử dụng hệ thống.',
      });
    }

    return next();
  } catch (error) {
    console.error('Không kiểm tra được tài khoản phiên đăng nhập:', error.code || error.name);
    return res.status(500).json({ error: 'Không kiểm tra được phiên đăng nhập' });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Chưa xác thực danh tính người dùng!' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Bạn không có quyền thực hiện hành động này! Yêu cầu vai trò: [${allowedRoles.join(', ')}]`
      });
    }

    next();
  };
};
