import { Group } from '../entities/Group';

export interface IGroupRepository {
  create(group: Omit<Group, 'id'>): Promise<Group>;
  findById(id: string): Promise<Group | null>;
  findByName(name: string): Promise<Group | null>;
  findAll(): Promise<Group[]>;
  findByUserId(userId: string|undefined): Promise<Group[]>;
  update(id: string, group: Partial<Group>): Promise<Group | null>;
  delete(id: string): Promise<boolean>;
  addMember(groupId: string, userId: string): Promise<boolean>;
  removeMember(groupId: string, userId: string): Promise<boolean>;
}