 import { Task } from '../entities/Task';

import { ITaskRepository } from '../interfaces/ITaskRepository';
import { IGroupRepository } from '../interfaces/IGroupRepository';
import { INotificationRepository } from '../interfaces/INotificationRepository';
import { TaskDocument } from '@/models/Task.model';

export class TaskUseCase {
  constructor(
    private taskRepository: ITaskRepository,
    private groupRepository: IGroupRepository,
    private notificationRepository: INotificationRepository
  ) {}

  async createTask(
    title: string,
    description: string,
    deadline: Date,
    priority: 'low' | 'medium' | 'high',
    createdBy: string,
    assignedTo?: string[],
    assignedToGroup?: string
  ): Promise<Task> {
    let finalAssignedTo: string[] = assignedTo || [];

    // If assigned to group, get all group members
    if (assignedToGroup) {
      const group = await this.groupRepository.findById(assignedToGroup);
      if (!group) {
        throw new Error('Group not found');
      }
      finalAssignedTo = group.members;
    }

    const taskData = {
      title,
      description,
      deadline,
      priority,
      status: 'pending' as const,
      assignedTo: finalAssignedTo,
      assignedToGroup,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const task = await this.taskRepository.create(taskData);

    // Create notifications for assigned users
    if (task.id) {
      for (const userId of finalAssignedTo) {
        await this.notificationRepository.create({
          userId,
          taskId: task.id,
          type: 'task_assigned',
          message: `New task assigned: ${title}`,
          sent: false,
          createdAt: new Date()
        });
      }
    }

    return task;
  }

  async getUserTasks(userId: string|undefined): Promise<Task[]> {
    return await this.taskRepository.findByUserId(userId);
  }

  async getAllTasks(): Promise<Task[]> {
    return await this.taskRepository.findAll();
  }

  async getTasksByDateRange(startDate: Date, endDate: Date): Promise<Task[]> {
    return await this.taskRepository.findByDateRange(startDate, endDate);
  }

  async markTaskComplete(taskId: string, userId: string|undefined): Promise<Task | null> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (userId && !task.assignedTo.includes(userId)) {
      throw new Error('Task not assigned to this user');
    }

    return await this.taskRepository.update(taskId, {
      status: 'completed',
      completedBy: userId,
      completedAt: new Date(),
      updatedAt: new Date()
    });
  }

  async deleteTask(taskId: string): Promise<boolean> {
    return await this.taskRepository.delete(taskId);
  }

  async getTasksNearDeadline(hours: number = 24): Promise<Task[]> {
    return await this.taskRepository.findTasksNearDeadline(hours);
  }
}