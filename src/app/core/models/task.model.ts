export interface Task {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  order: number;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  notes: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
