import cron from 'node-cron';
import { TaskUseCase } from '../domain/usecases/TaskUseCase';
import { UserUseCase } from '../domain/usecases/UserUseCase';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { TelegramBotService } from '../infrastructure/telegram/TelegramBot';

export class NotificationService {
  constructor(
    private taskUseCase: TaskUseCase,
    private userUseCase: UserUseCase,
    private notificationRepository: NotificationRepository,
    private telegramBot: TelegramBotService
  ) {
    this.initializeScheduler();
  }

  private initializeScheduler() {
    // Check for deadline reminders every hour
    cron.schedule('0 * * * *', async () => {
      await this.checkDeadlineReminders();
    });

    // Process unsent notifications every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.processUnsentNotifications();
    });

    console.log('📅 Notification scheduler initialized');
  }

  private async checkDeadlineReminders() {
    try {
      console.log('🔍 Checking for deadline reminders...');
      
      // Get tasks due in the next 24 hours
      const tasksDueSoon = await this.taskUseCase.getTasksNearDeadline(24);
      
      for (const task of tasksDueSoon) {
        // Check if we already sent a reminder for this task
        const existingNotifications = await this.notificationRepository.findByUserId(task.assignedTo[0]);
        const alreadyNotified = existingNotifications.some(
          notification => 
            notification.taskId === task.id && 
            notification.type === 'deadline_reminder' &&
            notification.sent
        );

        if (!alreadyNotified) {
          // Create reminder notifications for all assigned users
          for (const userId of task.assignedTo) {
            const hoursUntilDeadline = this.getHoursUntilDeadline(task.deadline);
            let reminderMessage = '';

            if (hoursUntilDeadline <= 1) {
              reminderMessage = `🚨 *URGENT REMINDER*\n\nTask: *${task.title}* is due in less than 1 hour!\n\nDeadline: ${new Date(task.deadline).toLocaleString()}\n\nPlease complete it ASAP! 🏃‍♂️`;
            } else if (hoursUntilDeadline <= 6) {
              reminderMessage = `⏰ *REMINDER*\n\nTask: *${task.title}* is due in ${Math.floor(hoursUntilDeadline)} hours.\n\nDeadline: ${new Date(task.deadline).toLocaleString()}\n\nDon't forget to complete it! 📋`;
            } else {
              reminderMessage = `📅 *Daily Reminder*\n\nTask: *${task.title}* is due tomorrow.\n\nDeadline: ${new Date(task.deadline).toLocaleString()}\n\nPriority: ${this.getPriorityText(task.priority)}`;
            }

            await this.notificationRepository.create({
              userId,
              taskId: task.id!,
              type: 'deadline_reminder',
              message: reminderMessage,
              sent: false,
              createdAt: new Date()
            });
          }
        }
      }
      
      console.log(`✅ Processed ${tasksDueSoon.length} tasks for deadline reminders`);
    } catch (error) {
      console.error('❌ Error checking deadline reminders:', error);
    }
  }

  private async processUnsentNotifications() {
    try {
      const unsentNotifications = await this.notificationRepository.findUnsentNotifications();
      
      if (unsentNotifications.length === 0) {
        return;
      }

      console.log(`📤 Processing ${unsentNotifications.length} unsent notifications`);

      for (const notification of unsentNotifications) {
        try {
          // Get user's telegram ID
          const user = await this.userUseCase.getUserByTelegramId(notification.userId);
          if (!user) {
            console.error(`User not found for notification ${notification.id}`);
            continue;
          }

          // Send notification via Telegram
          const sent = await this.telegramBot.sendNotification(user.telegramId, notification.message);
          
          if (sent) {
            // Mark notification as sent
            await this.notificationRepository.markAsSent(notification.id!);
            console.log(`✅ Notification sent to user ${user.telegramId}`);
          } else {
            console.error(`❌ Failed to send notification to user ${user.telegramId}`);
          }
        } catch (error) {
          console.error(`❌ Error processing notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error processing unsent notifications:', error);
    }
  }

  async createTaskAssignedNotification(taskId: string, userId: string, taskTitle: string) {
    const message = `📋 *New Task Assigned*\n\nYou have been assigned a new task: *${taskTitle}*\n\nUse /mytasks to view all your tasks.`;
    
    return await this.notificationRepository.create({
      userId,
      taskId,
      type: 'task_assigned',
      message,
      sent: false,
      createdAt: new Date()
    });
  }

  async createTaskCompletedNotification(taskId: string, userId: string, taskTitle: string, completedBy: string) {
    const completedByUser = await this.userUseCase.getUserByTelegramId(completedBy);
    const completedByName = completedByUser?.firstName || 'Someone';
    
    const message = `✅ *Task Completed*\n\nTask: *${taskTitle}* has been marked as complete by ${completedByName}.\n\nGreat work! 🎉`;
    
    return await this.notificationRepository.create({
      userId,
      taskId,
      type: 'task_completed',
      message,
      sent: false,
      createdAt: new Date()
    });
  }

  private getHoursUntilDeadline(deadline: Date): number {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    return timeDiff / (1000 * 60 * 60); // Convert milliseconds to hours
  }

  private getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return '🔴 High';
      case 'medium': return '🟡 Medium';
      case 'low': return '🟢 Low';
      default: return '⚪ Normal';
    }
  }
}