import express from 'express';
import { login } from '../controllers/authController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);

router.get('/admin-dashboard', verifyToken, authorizeRoles('admin','manager'), (req, res) => {
  res.json({
    message: 'Truy cập thành công!',
    user: req.user
  });
});

router.get('/admin-dashboard', verifyToken, authorizeRoles('admin'), (req, res) => {
  res.json({
    message: 'Chào mừng Admin đến với khu vực tối cao!',
    user: req.user
  });
});

router.get('/reports', verifyToken, authorizeRoles('admin', 'manager'), (req, res) => {
  res.json({
    message: 'Dữ liệu báo cáo doanh nghiệp.',
    user: req.user
  });
});

export default router;