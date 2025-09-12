import { Request, Response } from 'express';
import { TaskUseCase } from '../domain/usecases/TaskUseCase';

export class TaskController {
  constructor(private taskUseCase: TaskUseCase) {}

  createTask = async (req: Request, res: Response) => {
    try {
      const { title, description, deadline, priority, assignedTo, assignedToGroup } = req.body;
      const createdBy = (req as any).user.id;
      
      const task = await this.taskUseCase.createTask(
        title,
        description,
        new Date(deadline),
        priority,
        createdBy,
        assignedTo,
        assignedToGroup
      );
      
      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to create task',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getAllTasks = async (req: Request, res: Response) => {
    try {
      const tasks = await this.taskUseCase.getAllTasks();
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tasks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getUserTasks = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const tasks = await this.taskUseCase.getUserTasks(userId);
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user tasks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  markTaskComplete = async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const userId = (req as any).user.id;
      
      const task = await this.taskUseCase.markTaskComplete(taskId, userId);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found or not assigned to user'
        });
      }

      res.json({
        success: true,
        data: task,
        message: 'Task marked as complete'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to mark task as complete',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  deleteTask = async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const success = await this.taskUseCase.deleteTask(taskId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete task',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getTasksByDateRange = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const tasks = await this.taskUseCase.getTasksByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch tasks by date range',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}