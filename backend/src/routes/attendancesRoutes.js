import express from 'express';
import { checkIn, checkOut, getTodayAttendance } from '../controllers/attendanceController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/today', verifyToken, getTodayAttendance);
router.post('/check-in', verifyToken, checkIn);
router.post('/check-out', verifyToken, checkOut);

export default router;