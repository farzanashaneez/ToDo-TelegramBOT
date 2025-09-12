import { Router } from 'express';
import { GroupController } from '../controllers/GroupController';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { validateGroupCreation } from '../middleware/validation.middleware';

export const createGroupRoutes = (groupController: GroupController, authMiddleware: AuthMiddleware): Router => {
  const router = Router();

  // All routes require authentication
  router.use(authMiddleware.authenticate);

  // User routes
  router.get('/my-groups', groupController.getUserGroups);

  // Admin routes
  router.use(authMiddleware.authorizeAdmin);
  router.post('/', validateGroupCreation, groupController.createGroup);
  router.get('/', groupController.getAllGroups);
  router.post('/add-user', groupController.addUserToGroup);
  router.post('/remove-user', groupController.removeUserFromGroup);
  router.delete('/:groupId', groupController.deleteGroup);

  return router;
};