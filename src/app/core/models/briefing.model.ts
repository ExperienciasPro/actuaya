export interface DailyBriefing {
  id: string;
  date: Date;
  greeting: string;
  primaryGoal: {
    goalId: string;
    goalTitle: string;
  };
  priorityTask: {
    taskId: string;
    taskTitle: string;
    taskDescription?: string;
  };
  pendingFollowUps: number;
  completedYesterday: number;
  streakDays: number;
  motivationalMessage?: string;
}

export interface WeeklyCelebration {
  id: string;
  weekStartDate: Date;
  weekEndDate: Date;
  tasksCompleted: number;
  goalsAdvanced: number;
  dealsProgressed: number;
  totalMinutesInvested: number;
  highlights: string[];
  streakDays: number;
}
