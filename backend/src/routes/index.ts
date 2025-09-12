import { Router } from 'express';
import { createUserRoutes } from './userRoutes';
import { createGroupRoutes } from './groupRoutes';
import { createTaskRoutes } from './taskRoutes';
import { UserController } from '../controllers/UserController';
import { GroupController } from '../controllers/GroupController';
import { TaskController } from '../controllers/TaskController';
import { AuthMiddleware } from '../middleware/auth.middleware';

export const createRoutes = (
  userController: UserController,
  groupController: GroupController,
  taskController: TaskController,
  authMiddleware: AuthMiddleware
): Router => {
  const router = Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'API is running',
      timestamp: new Date().toISOString()
    });
  });

  // API routes
  router.use('/api/users', createUserRoutes(userController, authMiddleware));
  router.use('/api/groups', createGroupRoutes(groupController, authMiddleware));
  router.use('/api/tasks', createTaskRoutes(taskController, authMiddleware));

  return router;
};