import { TaskUseCase } from '../domain/usecases/TaskUseCase';
import { NotificationService } from './NotificationService';

export class TaskService {
  constructor(
    private taskUseCase: TaskUseCase,
    private notificationService: NotificationService
  ) {}

  async createTaskWithNotifications(
    title: string,
    description: string,
    deadline: Date,
    priority: 'low' | 'medium' | 'high',
    createdBy: string,
    assignedTo?: string[],
    assignedToGroup?: string
  ) {
    // Create the task
    const task = await this.taskUseCase.createTask(
      title,
      description,
      deadline,
      priority,
      createdBy,
      assignedTo,
      assignedToGroup
    );

    // Send notifications to assigned users
    if (task.assignedTo && task.assignedTo.length > 0) {
      for (const userId of task.assignedTo) {
        await this.notificationService.createTaskAssignedNotification(
          task.id!,
          userId,
          task.title
        );
      }
    }

    return task;
  }

  async completeTaskWithNotifications(taskId: string, userId: string) {
    const task = await this.taskUseCase.markTaskComplete(taskId, userId);
    
    if (task) {
      // Notify other assigned users about task completion
      for (const assignedUserId of task.assignedTo) {
        if (assignedUserId !== userId) {
          await this.notificationService.createTaskCompletedNotification(
            task.id!,
            assignedUserId,
            task.title,
            userId
          );
        }
      }
    }

    return task;
  }

  async getUserTasksByPriority(userId: string) {
    const tasks = await this.taskUseCase.getUserTasks(userId);
    
    // Sort by priority and deadline
    return tasks.sort((a, b) => {
      // Priority order: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      // First sort by priority (higher priority first)
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then sort by deadline (earlier deadline first)
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }

  async getTasksForToday(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await this.taskUseCase.getTasksByDateRange(today, tomorrow);
    return tasks.filter(task => task.assignedTo.includes(userId));
  }

  async getTasksForWeek(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const tasks = await this.taskUseCase.getTasksByDateRange(today, nextWeek);
    return tasks.filter(task => task.assignedTo.includes(userId));
  }

  async getOverdueTasks(userId: string) {
    const allTasks = await this.taskUseCase.getUserTasks(userId);
    const now = new Date();
    
    return allTasks.filter(task => 
      task.status !== 'completed' && 
      new Date(task.deadline) < now
    );
  }
}