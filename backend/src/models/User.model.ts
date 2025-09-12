import mongoose, { Schema, Document } from 'mongoose';
import { User } from '../domain/entities/User';

export interface UserDocument extends Omit<User,'id'>, Document {}

const UserSchema = new Schema<UserDocument>({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userName: {
    type: String,
    sparse: true
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);