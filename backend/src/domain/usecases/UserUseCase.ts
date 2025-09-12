import { User } from '../entities/User';
import { IUserRepository } from '../interfaces/IUserRepository';

export class UserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async registerUser(telegramId: string, userName?: string, firstName?: string, lastName?: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByTelegramId(telegramId);
    if (existingUser) {
      throw new Error('User already registered');
    }

    // Create new user with default role 'user'
    const userData = {
      telegramId,
      userName,
      firstName,
      lastName,
      role: 'user' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.userRepository.create(userData);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    return await this.userRepository.findByTelegramId(telegramId);
  }

  async deleteUser(userId: string): Promise<boolean> {
    return await this.userRepository.delete(userId);
  }

  async promoteToAdmin(userId: string): Promise<User | null> {
    return await this.userRepository.update(userId, { role: 'admin', updatedAt: new Date() });
  }
}