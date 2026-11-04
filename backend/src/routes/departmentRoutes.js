import express from 'express';
import { listDepartments, createDepartment ,updateDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/department-list', verifyToken, listDepartments);
router.post('/department-create', verifyToken, authorizeRoles('admin'),createDepartment);
router.put('/department-update/:id', verifyToken, authorizeRoles('admin'),updateDepartment);
router.delete('/department-delete/:id', verifyToken, authorizeRoles('admin'), deleteDepartment);

export default router;