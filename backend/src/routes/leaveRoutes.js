import express from 'express';
import { createLeaveRequest,getMyLeaveSummary,getLeaveRequests,cancelLeaveRequest,reviewLeaveRequest } from '../controllers/leaveController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/summary', verifyToken, getMyLeaveSummary);
router.post('/create-leave-request', verifyToken, createLeaveRequest);
router.get('/request-leave', verifyToken, getLeaveRequests);
router.delete('/cancel-request/:id', verifyToken, cancelLeaveRequest);
router.put('/review-request/:id/review', verifyToken, reviewLeaveRequest);

export default router;