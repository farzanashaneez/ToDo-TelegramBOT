export interface Group {
    id?: string;
    name: string;
    description?: string;
    members: string[]; // User IDs
    createdBy: string | undefined; // User ID
    createdAt: Date;
    updatedAt: Date;
  }