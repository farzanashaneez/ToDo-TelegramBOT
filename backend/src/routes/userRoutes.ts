import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { AuthMiddleware } from '../middleware/auth.middleware';

export const createUserRoutes = (userController: UserController, authMiddleware: AuthMiddleware): Router => {
  const router = Router();

  // Public routes
  router.get('/telegram/:telegramId', userController.getUserByTelegramId);

  // Protected routes
  router.use(authMiddleware.authenticate);
  
  // Admin only routes
  router.get('/', authMiddleware.authorizeAdmin, userController.getAllUsers);
  router.delete('/:userId', authMiddleware.authorizeAdmin, userController.deleteUser);

  return router;
};