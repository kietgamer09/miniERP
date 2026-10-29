import express from 'express';
import { listDepartments, createDepartment ,updateDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/department-list', verifyToken, listDepartments);
router.post('/department-create', verifyToken, createDepartment);
router.put('/department-update/:id', verifyToken, updateDepartment);     // API Sửa phòng ban
router.delete('/department-delete/:id', verifyToken, deleteDepartment);  // API Xóa phòng ban

export default router;