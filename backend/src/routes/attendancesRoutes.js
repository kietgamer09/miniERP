import express from 'express';
import {
  checkIn,
  checkOut,
  getToday,
  getMyAttendances,
  getCompanyAttendanceSummary,
  getEmployeeAttendanceByAdmin
} from '../controllers/attendanceController.js';
import {
  createAttendanceExplanation,
  getAttendanceExplanations,
  reviewAttendanceExplanation,
  cancelAttendanceExplanation
} from '../controllers/attendanceExplanationController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/today', getToday);
router.get('/me', getMyAttendances);

// Các route cho giải trình chấm công
router.post('/create-explanations', createAttendanceExplanation);
router.get('/explanations-lists', authorizeRoles('admin', 'manager'), getAttendanceExplanations);
router.put('/review-explanations/:id/review', authorizeRoles('admin', 'manager'), reviewAttendanceExplanation);
router.delete('/cancel-explanations/:id', cancelAttendanceExplanation);


router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

// Route cho phép HR/Admin lấy bảng công toàn công ty theo tháng
router.get('/company-summary', authorizeRoles('admin'), getCompanyAttendanceSummary);
router.get('/employee-attendance/:id', authorizeRoles('admin'), getEmployeeAttendanceByAdmin);

export default router;