import express from 'express';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';
import { createProject, listProjects, updateProject } from '../controllers/projectController.js';

const router = express.Router();
router.use(verifyToken, attachEmployee);
router.post('/', authorizeRoles('manager', 'admin'), createProject);
router.get('/', listProjects);
router.put('/:id', updateProject);

export default router;
