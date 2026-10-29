import express from 'express';
import { checkIn, checkOut, getToday, getMyAttendances, createExplanation, listExplanations, reviewExplanation } from '../controllers/attendanceController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { getCompanyAttendanceSummary, getEmployeeAttendanceByAdmin } from '../controllers/attendanceController.js';

const router = express.Router();
router.use(verifyToken);
router.get('/today', getToday);
router.get('/me', getMyAttendances);
router.post('/explanations', createExplanation);
router.get('/explanations', authorizeRoles('admin'), listExplanations);
router.put('/explanations/:id/review', authorizeRoles('admin'), reviewExplanation);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

router.get('/company-summary', authorizeRoles('admin'), getCompanyAttendanceSummary);

router.get('/employee-attendance/:id', authorizeRoles('admin'), getEmployeeAttendanceByAdmin);
export default router;
