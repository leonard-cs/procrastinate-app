import { Task, EffortLevel } from '../types/Task';

export const parseTask = (data: any, id: string): Task => {
  return {
    id,
    name: data.name,
    completed: data.completed,
    createdAt: new Date(data.createdAt),
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    effort: data.effort as EffortLevel, // ensure it's a valid EffortLevel
    userId: data.userId || '',
    isPoked: data.isPoked || false, // Default to false if undefined
  };
};