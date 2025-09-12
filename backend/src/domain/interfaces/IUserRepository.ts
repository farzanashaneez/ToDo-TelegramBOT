import { User } from '../entities/User';

export interface IUserRepository {
  create(user: Omit<User, 'id'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByTelegramId(telegramId: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  update(id: string, user: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}