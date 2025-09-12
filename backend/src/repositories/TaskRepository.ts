import { ITaskRepository } from '../domain/interfaces/ITaskRepository';
import { Task } from '../domain/entities/Task';
import { TaskDocument, TaskModel } from '../models/Task.model';

export class TaskRepository implements ITaskRepository {
  async create(taskData: Omit<Task, 'id'>): Promise<Task> {
    const task = new TaskModel(taskData);
    const savedTask = await task.save() ;
    return this.mapToEntity(savedTask);
  }

  async findById(id: string): Promise<Task | null> {
    const task = await TaskModel.findById(id)
      .populate('assignedTo createdBy completedBy assignedToGroup');
    return task ? this.mapToEntity(task) : null;
  }

  async findAll(): Promise<Task[]> {
    const tasks = await TaskModel.find()
      .populate('assignedTo createdBy completedBy assignedToGroup')
      .sort({ createdAt: -1 });
    return tasks.map(task => this.mapToEntity(task));
  }

  async findByUserId(userId: string): Promise<Task[]> {
    const tasks = await TaskModel.find({ assignedTo: userId })
      .populate('assignedTo createdBy completedBy assignedToGroup')
      .sort({ deadline: 1 });
    return tasks.map(task => this.mapToEntity(task));
  }

  async findByGroupId(groupId: string): Promise<Task[]> {
    const tasks = await TaskModel.find({ assignedToGroup: groupId })
      .populate('assignedTo createdBy completedBy assignedToGroup')
      .sort({ deadline: 1 });
    return tasks.map(task => this.mapToEntity(task));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Task[]> {
    const tasks = await TaskModel.find({
      deadline: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('assignedTo createdBy completedBy assignedToGroup')
      .sort({ deadline: 1 });
    return tasks.map(task => this.mapToEntity(task));
  }

  async findTasksNearDeadline(hours: number): Promise<Task[]> {
    const now = new Date();
    const deadlineThreshold = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    
    const tasks = await TaskModel.find({
      deadline: { $lte: deadlineThreshold, $gte: now },
      status: { $ne: 'completed' }
    }).populate('assignedTo createdBy assignedToGroup');
    
    return tasks.map(task => this.mapToEntity(task));
  }

  async update(id: string, taskData: Partial<Task>): Promise<Task | null> {
    const task = await TaskModel.findByIdAndUpdate(
      id,
      { ...taskData, updatedAt: new Date() },
      { new: true }
    ).populate('assignedTo createdBy completedBy assignedToGroup');
    return task ? this.mapToEntity(task) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await TaskModel.findByIdAndDelete(id);
    return !!result;
  }

  private mapToEntity(taskDoc: any): Task {
    return {
      id: taskDoc._id.toString(),
      title: taskDoc.title,
      description: taskDoc.description,
      deadline: taskDoc.deadline,
      priority: taskDoc.priority,
      status: taskDoc.status,
      assignedTo: taskDoc.assignedTo.map((user: any) => 
        typeof user === 'string' ? user : user._id.toString()
      ),
      assignedToGroup: taskDoc.assignedToGroup ? 
        (typeof taskDoc.assignedToGroup === 'string' 
          ? taskDoc.assignedToGroup 
          : taskDoc.assignedToGroup._id.toString()) : undefined,
      createdBy: typeof taskDoc.createdBy === 'string' 
        ? taskDoc.createdBy 
        : taskDoc.createdBy._id.toString(),
      completedBy: taskDoc.completedBy ? 
        (typeof taskDoc.completedBy === 'string' 
          ? taskDoc.completedBy 
          : taskDoc.completedBy._id.toString()) : undefined,
      completedAt: taskDoc.completedAt,
      createdAt: taskDoc.createdAt,
      updatedAt: taskDoc.updatedAt
    };
  }
}