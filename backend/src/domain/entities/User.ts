export interface User {
   id?: string;
  telegramId: string;
  userName: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
