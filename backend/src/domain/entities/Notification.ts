export interface Notification {
    id?: string;
    userId: any;
    taskId: any;
    type: 'task_assigned' | 'deadline_reminder' | 'task_completed';
    message: string;
    sent: boolean;
    sentAt?: Date;
    createdAt: Date;
  }