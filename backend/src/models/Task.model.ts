import mongoose, { Schema, Document, Types } from 'mongoose';
import { Task } from '../domain/entities/Task';

export interface TaskDocument extends Omit<Task,'id'>, Document {
    _id: Types.ObjectId; 
}

const TaskSchema = new Schema<TaskDocument>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  deadline: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  assignedTo: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedToGroup: {
    type: Schema.Types.ObjectId,
    ref: 'Group'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ deadline: 1, status: 1 });

export const TaskModel = mongoose.model<TaskDocument>('Task', TaskSchema);
