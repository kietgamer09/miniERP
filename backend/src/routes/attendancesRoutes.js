import express from 'express';
import { checkIn, checkOut, getToday, getMyAttendances, createExplanation, listExplanations, reviewExplanation } from '../controllers/attendanceController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { checkIn, checkOut, getTodayAttendance } from '../controllers/attendanceController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use(verifyToken);
router.get('/today', getToday);
router.get('/me', getMyAttendances);
router.post('/explanations', createExplanation);
router.get('/explanations', authorizeRoles('admin'), listExplanations);
router.put('/explanations/:id/review', authorizeRoles('admin'), reviewExplanation);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', verifyToken, getTodayAttendance);
router.post('/check-in', verifyToken, checkIn);
router.post('/check-out', verifyToken, checkOut);

export default router;
