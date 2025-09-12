import { TaskDocument } from "@/models/Task.model";
import { Task } from "../entities/Task";

export interface ITaskRepository {
  create(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findAll(): Promise<Task[]>;
  findByUserId(userId: string): Promise<Task[]>;
  findByGroupId(groupId: string): Promise<Task[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Task[]>;
  findTasksNearDeadline(hours: number): Promise<Task[]>;
  update(id: string, task: Partial<TaskDocument>): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
}