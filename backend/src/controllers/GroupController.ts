import { Request, Response } from 'express';
import { GroupUseCase } from '../domain/usecases/GroupUseCase';

export class GroupController {
  constructor(private groupUseCase: GroupUseCase) {}

  createGroup = async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      const createdBy = (req as any).user.id; // From auth middleware
      
      const group = await this.groupUseCase.createGroup(name, createdBy, description);
      
      res.status(201).json({
        success: true,
        data: group
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to create group',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getAllGroups = async (req: Request, res: Response) => {
    try {
      const groups = await this.groupUseCase.getAllGroups();
      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch groups',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getUserGroups = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const groups = await this.groupUseCase.getUserGroups(userId);
      res.json({
        success: true,
        data: groups
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user groups',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  addUserToGroup = async (req: Request, res: Response) => {
    try {
      const { groupId, userId } = req.body;
      const success = await this.groupUseCase.addUserToGroup(groupId, userId);
      
      res.json({
        success,
        message: success ? 'User added to group successfully' : 'Failed to add user to group'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to add user to group',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  removeUserFromGroup = async (req: Request, res: Response) => {
    try {
      const { groupId, userId } = req.body;
      const success = await this.groupUseCase.removeUserFromGroup(groupId, userId);
      
      res.json({
        success,
        message: success ? 'User removed from group successfully' : 'Failed to remove user from group'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to remove user from group',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  deleteGroup = async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const success = await this.groupUseCase.deleteGroup(groupId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      res.json({
        success: true,
        message: 'Group deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete group',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}