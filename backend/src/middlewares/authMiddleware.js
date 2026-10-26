import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mini_erp_super_secret_key_2026';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không tìm thấy Token xác thực, vui lòng đăng nhập lại!' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn!' });
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
