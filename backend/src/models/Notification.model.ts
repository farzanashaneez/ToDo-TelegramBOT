import mongoose, { Schema, Document } from 'mongoose';
import { Notification } from '../domain/entities/Notification';

export interface NotificationDocument extends Omit<Notification,'id'>, Document {}

const NotificationSchema = new Schema<NotificationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  type: {
    type: String,
    enum: ['task_assigned', 'deadline_reminder', 'task_completed'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  sent: {
    type: Boolean,
    default: false
  },
  sentAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
NotificationSchema.index({ userId: 1, sent: 1 });
NotificationSchema.index({ sent: 1, createdAt: 1 });

export const NotificationModel = mongoose.model<NotificationDocument>('Notification', NotificationSchema);
