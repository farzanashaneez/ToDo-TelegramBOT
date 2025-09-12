export interface Task {
     id?: string;
    title: string;
    description?: string;
    deadline: Date;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed';
    assignedTo: string[]; // User IDs
    assignedToGroup?: string; // Group ID
    createdBy: string | undefined; // User ID
    completedBy?: string; // User ID
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }