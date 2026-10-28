import express from 'express';
import { listMyTasks } from '../controllers/taskController.js';
import { changeTaskStatus } from '../controllers/taskActionController.js';
import { getTaskDetails, updateTaskDetails } from '../controllers/taskDetailsController.js';
import { createTaskComment, listTaskComments } from '../controllers/commentController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';

const router = express.Router();

router.use(verifyToken, attachEmployee);
router.get('/mine', listMyTasks);
router.get('/:id/comments', listTaskComments);
router.post('/:id/comments', createTaskComment);
router.get('/:id', getTaskDetails);
router.put('/:id', updateTaskDetails);
router.patch('/:id/status', changeTaskStatus);

export default router;
