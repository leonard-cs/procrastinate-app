export type EffortLevel = 'light' | 'medium' | 'heavy';

export interface Task {
  id: string;
  name: string;
  effort: EffortLevel;
  createdAt: Date;
  dueDate?: Date;
  completed?: boolean;
  completedAt?: Date;
  userId: string;
  isPoked: boolean;
}