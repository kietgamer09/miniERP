import express from 'express';
import { changePassword, getMyProfile, getUsers, createUser, updateUser, updateEmployeesDepartment, resetTemporaryPassword } from '../controllers/userController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';
import { updateMyProfile } from '../controllers/profileController.js';

const router = express.Router();

router.put('/change-password', verifyToken, changePassword);
router.get('/me', verifyToken, getMyProfile);
router.patch('/me', verifyToken, attachEmployee, updateMyProfile);

router.get('/employee-list', verifyToken, getUsers);

router.post('/employee-create', verifyToken, authorizeRoles('admin'), createUser);

router.put('/employee-update/:id', verifyToken, authorizeRoles('admin'), updateUser);
router.post('/:id/reset-password', verifyToken, authorizeRoles('admin'), resetTemporaryPassword);

router.put('/update-department', verifyToken, authorizeRoles('admin'), updateEmployeesDepartment);

export default router;
