import { IGroupRepository } from '../domain/interfaces/IGroupRepository';
import { Group } from '../domain/entities/Group';
import { GroupModel } from '../models/Group.model';

export class GroupRepository implements IGroupRepository {
  async create(groupData: Omit<Group, 'id'>): Promise<Group> {
    const group = new GroupModel(groupData);
    const savedGroup = await group.save();
    return this.mapToEntity(savedGroup);
  }

  async findById(id: string): Promise<Group | null> {
    const group = await GroupModel.findById(id).populate('members createdBy');
    return group ? this.mapToEntity(group) : null;
  }

  async findByName(name: string): Promise<Group | null> {
    const group = await GroupModel.findOne({ name });
    return group ? this.mapToEntity(group) : null;
  }

  async findAll(): Promise<Group[]> {
    const groups = await GroupModel.find().populate('members createdBy');
    return groups.map(group => this.mapToEntity(group));
  }

  async findByUserId(userId: string): Promise<Group[]> {
    const groups = await GroupModel.find({ members: userId }).populate('members createdBy');
    return groups.map(group => this.mapToEntity(group));
  }

  async update(id: string, groupData: Partial<Group>): Promise<Group | null> {
    const group = await GroupModel.findByIdAndUpdate(
      id,
      { ...groupData, updatedAt: new Date() },
      { new: true }
    ).populate('members createdBy');
    return group ? this.mapToEntity(group) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await GroupModel.findByIdAndDelete(id);
    return !!result;
  }

  async addMember(groupId: string, userId: string): Promise<boolean> {
    const result = await GroupModel.findByIdAndUpdate(
      groupId,
      { 
        $addToSet: { members: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
    return !!result;
  }

  async removeMember(groupId: string, userId: string): Promise<boolean> {
    const result = await GroupModel.findByIdAndUpdate(
      groupId,
      { 
        $pull: { members: userId },
        updatedAt: new Date()
      },
      { new: true }
    );
    return !!result;
  }

  private mapToEntity(groupDoc: any): Group {
    return {
      id: groupDoc._id.toString(),
      name: groupDoc.name,
      description: groupDoc.description,
      members: groupDoc.members.map((member: any) => 
        typeof member === 'string' ? member : member._id.toString()
      ),
      createdBy: typeof groupDoc.createdBy === 'string' 
        ? groupDoc.createdBy 
        : groupDoc.createdBy._id.toString(),
      createdAt: groupDoc.createdAt,
      updatedAt: groupDoc.updatedAt
    };
  }
}