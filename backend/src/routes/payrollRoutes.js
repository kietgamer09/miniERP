import express from 'express';
import {
  getMyPayroll,
  getCompanyPayrolls,
  calculateCompanyPayroll
} from '../controllers/PayrollController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- ROUTE CHO NHÂN VIÊN (Bất kỳ nhân viên nào đã đăng nhập đều xem được) ---
router.get('/self-payroll', verifyToken, getMyPayroll);

// Xem bảng lương toàn công ty (Chỉ admin mới có quyền)
router.get('/company-payrolls', verifyToken, authorizeRoles('admin'), getCompanyPayrolls);

// Tính toán / chốt lương toàn công ty (Chỉ admin mới có quyền)
router.post('/company-payrolls/calculate', verifyToken, authorizeRoles('admin'), calculateCompanyPayroll);

export default router;
