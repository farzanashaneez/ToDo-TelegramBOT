import { Notification } from "../entities/Notification";

export interface INotificationRepository {
    create(notification: Omit<Notification, 'id'>): Promise<Notification>;
    findById(id: string): Promise<Notification | null>;
    findByUserId(userId: string): Promise<Notification[]>;
    findUnsentNotifications(): Promise<Notification[]>;
    markAsSent(id: string): Promise<boolean>;
    delete(id: string): Promise<boolean>;
  }