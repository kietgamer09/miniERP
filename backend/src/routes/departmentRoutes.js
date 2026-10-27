import express from 'express';
import { listDepartments } from '../controllers/departmentController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.get('/', verifyToken, listDepartments);
router.get('/department-list', verifyToken, listDepartments);

export default router;