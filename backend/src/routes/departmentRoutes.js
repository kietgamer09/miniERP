import express from 'express';
import { listDepartments } from '../controllers/departmentController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/departments - Lấy danh sách phòng ban
router.get('/department-list', verifyToken, listDepartments);

export default router;