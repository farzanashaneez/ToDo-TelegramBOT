import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { validateTaskCreation } from '../middleware/validation.middleware';

export const createTaskRoutes = (taskController: TaskController, authMiddleware: AuthMiddleware): Router => {
  const router = Router();

  // All routes require authentication
  router.use(authMiddleware.authenticate);

  // User routes
  router.get('/my-tasks', taskController.getUserTasks);
  router.patch('/:taskId/complete', taskController.markTaskComplete);

  // Admin routes
  router.post('/', authMiddleware.authorizeAdmin, validateTaskCreation, taskController.createTask);
  router.get('/', authMiddleware.authorizeAdmin, taskController.getAllTasks);
  router.get('/date-range', authMiddleware.authorizeAdmin, taskController.getTasksByDateRange);
  router.delete('/:taskId', authMiddleware.authorizeAdmin, taskController.deleteTask);

  return router;
};