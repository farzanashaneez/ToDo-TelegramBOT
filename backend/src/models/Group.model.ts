import mongoose, { Schema, Document } from 'mongoose';
import { Group } from '../domain/entities/Group';

export interface GroupDocument extends Omit<Group,'id'>, Document {}

const GroupSchema = new Schema<GroupDocument>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export const GroupModel = mongoose.model<GroupDocument>('Group', GroupSchema);