export enum TaskPriorityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriorityEnum, string> = {
  [TaskPriorityEnum.LOW]: 'Baja',
  [TaskPriorityEnum.MEDIUM]: 'Media',
  [TaskPriorityEnum.HIGH]: 'Alta',
  [TaskPriorityEnum.CRITICAL]: 'Crítica',
};

export const TASK_PRIORITY_ORDER: Record<TaskPriorityEnum, number> = {
  [TaskPriorityEnum.CRITICAL]: 0,
  [TaskPriorityEnum.HIGH]: 1,
  [TaskPriorityEnum.MEDIUM]: 2,
  [TaskPriorityEnum.LOW]: 3,
};
