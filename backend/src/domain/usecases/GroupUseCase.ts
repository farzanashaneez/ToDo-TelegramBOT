import { Group } from '../entities/Group';
import { IGroupRepository } from '../interfaces/IGroupRepository';
import { IUserRepository } from '../interfaces/IUserRepository';

export class GroupUseCase {
    constructor(
      private groupRepository: IGroupRepository,
      private userRepository: IUserRepository
    ) {}
  
    async createGroup(name: string, createdBy: string, description?: string): Promise<Group> {
      // Check if group name already exists
      const existingGroup = await this.groupRepository.findByName(name);
      if (existingGroup) {
        throw new Error('Group name already exists');
      }
  
      const groupData = {
        name,
        description,
        members: [createdBy], // Creator is automatically added as member
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };
  
      return await this.groupRepository.create(groupData);
    }
  
    async addUserToGroup(groupId: string, userId: string): Promise<boolean> {
      // Verify user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
  
      return await this.groupRepository.addMember(groupId, userId);
    }
  
    async removeUserFromGroup(groupId: string, userId: string): Promise<boolean> {
      return await this.groupRepository.removeMember(groupId, userId);
    }
  
    async getUserGroups(userId: string|undefined): Promise<Group[]> {
      return await this.groupRepository.findByUserId(userId);
    }
  
    async getAllGroups(): Promise<Group[]> {
      return await this.groupRepository.findAll();
    }
  
    async deleteGroup(groupId: string): Promise<boolean> {
      return await this.groupRepository.delete(groupId);
    }
  }