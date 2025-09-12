import mongoose from 'mongoose';
import { config } from './config';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Database connected successfully');
  } catch (error) {
    console.error(' Database connection failed:', error);
    process.exit(1);
  }
};