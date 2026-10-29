import express from 'express';
import { listDepartments, createDepartment ,updateDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/department-list', verifyToken, listDepartments);
router.post('/department-create', verifyToken, createDepartment);
router.put('/department-update/:id', verifyToken, updateDepartment);
router.delete('/department-delete/:id', verifyToken, deleteDepartment);

export default router;