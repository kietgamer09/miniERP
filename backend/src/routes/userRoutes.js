import express from 'express';
import { changePassword, getUsers, createUser, updateUser } from '../controllers/userController.js';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.put('/change-password', verifyToken, changePassword);

router.get('/employee-list', verifyToken, getUsers);

router.post('/employee-create', verifyToken, authorizeRoles('admin'), createUser);

router.put('/employee-update/:id', verifyToken, authorizeRoles('admin'), updateUser);

export default router;