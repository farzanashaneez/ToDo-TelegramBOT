import { IUserRepository } from '../domain/interfaces/IUserRepository';
import { User } from '../domain/entities/User';
import { UserDocument, UserModel } from '../models/User.model';

export class UserRepository implements IUserRepository {
  async create(userData: Omit<User, 'id'>): Promise<User> {
    const user = new UserModel(userData);
    const savedUser = await user.save();
    return this.mapToEntity(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    const user = await UserModel.findById(id);
    return user ? this.mapToEntity(user) : null;
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    const user = await UserModel.findOne({ telegramId });
    return user ? this.mapToEntity(user) : null;
  }

  async findAll(): Promise<User[]> {
    const users = await UserModel.find({ isActive: true });
    return users.map(user => this.mapToEntity(user));
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const user = await UserModel.findByIdAndUpdate(
      id,
      { ...userData, updatedAt: new Date() },
      { new: true }
    );
    return user ? this.mapToEntity(user) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    return !!result;
  }

  private mapToEntity(userDoc: any): User {
    return {
      id: userDoc._id.toString(),
      telegramId: userDoc.telegramId,
      userName: userDoc.username,
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      role: userDoc.role,
      isActive: userDoc.isActive,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt
    };
  }
}