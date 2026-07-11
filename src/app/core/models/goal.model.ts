export interface Goal {
  id: string;
  title: string;
  intentionTrigger: string; // Si / Cuando...
  intentionAction: string; // ...entonces haré...
  delegatedTo?: string; // Para descarga cognitiva
  microSteps: { id: string; title: string; completed: boolean }[];
  targetDate: Date;
  createdAt: Date;
  updatedAt: Date;
  status: GoalStatus;
  progress: number; // 0-100
  parentGoalId?: string;
  childGoalIds: string[];
  taskIds: string[];
  mode: GoalMode;
  tags: string[];
}

export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'paused' | 'blocked';
export type GoalMode = 'leader' | 'business';
