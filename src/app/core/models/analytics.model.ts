export interface PerformanceMetrics {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  startDate: Date;
  endDate: Date;
  tasksCompleted: number;
  tasksCreated: number;
  completionRate: number;
  averageTimePerTask: number;
  totalTimeInvested: number;
}

export interface SalesMetrics {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dealsOpened: number;
  dealsClosed: number;
  dealsLost: number;
  closeRate: number;
  totalRevenue: number;
  averageDealValue: number;
  conversionByStage: { stageName: string; rate: number }[];
}

export interface ProgressSnapshot {
  goalId: string;
  goalTitle: string;
  progressPercent: number;
  tasksTotal: number;
  tasksCompleted: number;
  daysRemaining: number;
  onTrack: boolean;
  trend: 'improving' | 'stable' | 'declining';
}

export interface TimeDistribution {
  category: string;
  minutes: number;
  percentage: number;
}
