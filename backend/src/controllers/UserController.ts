import { Request, Response } from 'express';
import { UserUseCase } from '../domain/usecases/UserUseCase';

export class UserController {
  constructor(private userUseCase: UserUseCase) {}

  getAllUsers = async (req: Request, res: Response) => {
    try {
      const users = await this.userUseCase.getAllUsers();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getUserByTelegramId = async (req: Request, res: Response) => {
    try {
      const { telegramId } = req.params;
      const user = await this.userUseCase.getUserByTelegramId(telegramId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const success = await this.userUseCase.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}