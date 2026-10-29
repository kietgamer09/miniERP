import express from 'express';
import { createLeaveRequest,getMyLeaveSummary,getLeaveRequests,cancelLeaveRequest,reviewLeaveRequest } from '../controllers/leaveController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';

const router = express.Router();
router.use(verifyToken, attachEmployee);

router.get('/summary', getMyLeaveSummary);
router.post('/create-leave-request', createLeaveRequest);
router.get('/request-leave', getLeaveRequests);
router.delete('/cancel-request/:id', cancelLeaveRequest);
router.put('/review-request/:id/review', reviewLeaveRequest);

export default router;
