import { INotificationRepository } from '../domain/interfaces/INotificationRepository';
import { Notification } from '../domain/entities/Notification';
import { NotificationModel } from '../models/Notification.model';

export class NotificationRepository implements INotificationRepository {
  async create(notificationData: Omit<Notification, 'id'>): Promise<Notification> {
    const notification = new NotificationModel(notificationData);
    const savedNotification = await notification.save();
    return this.mapToEntity(savedNotification);
  }

  async findById(id: string): Promise<Notification | null> {
    const notification = await NotificationModel.findById(id);
    return notification ? this.mapToEntity(notification) : null;
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    const notifications = await NotificationModel.find({ userId })
      .sort({ createdAt: -1 });
    return notifications.map(notification => this.mapToEntity(notification));
  }

  async findUnsentNotifications(): Promise<Notification[]> {
    const notifications = await NotificationModel.find({ sent: false })
      .populate('userId taskId');
    return notifications.map(notification => this.mapToEntity(notification));
  }

  async markAsSent(id: string): Promise<boolean> {
    const result = await NotificationModel.findByIdAndUpdate(
      id,
      { sent: true, sentAt: new Date() },
      { new: true }
    );
    return !!result;
  }

  async delete(id: string): Promise<boolean> {
    const result = await NotificationModel.findByIdAndDelete(id);
    return !!result;
  }

  private mapToEntity(notificationDoc: any): Notification {
    return {
      id: notificationDoc._id.toString(),
      userId: typeof notificationDoc.userId === 'string' 
        ? notificationDoc.userId 
        : notificationDoc.userId._id.toString(),
      taskId: typeof notificationDoc.taskId === 'string' 
        ? notificationDoc.taskId 
        : notificationDoc.taskId._id.toString(),
      type: notificationDoc.type,
      message: notificationDoc.message,
      sent: notificationDoc.sent,
      sentAt: notificationDoc.sentAt,
      createdAt: notificationDoc.createdAt
    };
  }
}