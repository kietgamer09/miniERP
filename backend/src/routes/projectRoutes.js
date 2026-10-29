import express from 'express';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';
import {
  completeProject, createProject, deleteProject, getProject, listProjects, reopenProject, updateProject,
} from '../controllers/projectController.js';
import { addMembers, listAvailableEmployees, removeMember } from '../controllers/memberController.js';
import { createTask, listProjectTasks } from '../controllers/taskController.js';
import { getProjectSummary } from '../controllers/projectSummaryController.js';
import { projectComments } from '../controllers/projectCommentController.js';

const router = express.Router();
router.use(verifyToken, attachEmployee);
router.post('/', authorizeRoles('manager', 'admin'), createProject);
router.get('/summary', authorizeRoles('manager', 'admin'), getProjectSummary);
router.get('/', listProjects);
router.get('/:id/comments', projectComments);
router.post('/:id/comments', projectComments);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/complete', completeProject);
router.post('/:id/reopen', reopenProject);
router.get('/:id/available-employees', listAvailableEmployees);
router.post('/:id/members', addMembers);
router.delete('/:id/members/:employee_id', removeMember);
router.post('/:id/tasks', createTask);
router.get('/:id/tasks', listProjectTasks);

export default router;
