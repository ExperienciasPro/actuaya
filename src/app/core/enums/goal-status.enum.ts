export enum GoalStatusEnum {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  BLOCKED = 'blocked',
}

export const GOAL_STATUS_LABELS: Record<GoalStatusEnum, string> = {
  [GoalStatusEnum.NOT_STARTED]: 'Sin iniciar',
  [GoalStatusEnum.IN_PROGRESS]: 'En progreso',
  [GoalStatusEnum.COMPLETED]: 'Completada',
  [GoalStatusEnum.PAUSED]: 'Pausada',
  [GoalStatusEnum.BLOCKED]: 'Bloqueada',
};
