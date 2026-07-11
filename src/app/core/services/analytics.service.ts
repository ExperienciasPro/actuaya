import { Injectable, computed } from '@angular/core';
import { GoalService } from './goal.service';
import { TaskService } from './task.service';
import { SalesFunnelService } from './sales-funnel.service';
import {
  PerformanceMetrics,
  SalesMetrics,
  ProgressSnapshot,
  TimeDistribution,
} from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  readonly overallProgress = computed(() => {
    const goals = this.goalService.goals();
    if (goals.length === 0) return 0;
    return Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length);
  });

  constructor(
    private goalService: GoalService,
    private taskService: TaskService,
    private salesFunnelService: SalesFunnelService
  ) {}

  getPerformanceMetrics(period: PerformanceMetrics['period'], startDate: Date, endDate: Date): PerformanceMetrics {
    const tasks = this.taskService.tasks();
    const periodTasks = tasks.filter((t) => {
      const created = new Date(t.createdAt);
      return created >= startDate && created <= endDate;
    });
    const completed = periodTasks.filter((t) => t.status === 'completed');

    return {
      period,
      startDate,
      endDate,
      tasksCompleted: completed.length,
      tasksCreated: periodTasks.length,
      completionRate: periodTasks.length > 0 ? (completed.length / periodTasks.length) * 100 : 0,
      averageTimePerTask: completed.length > 0
        ? completed.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) / completed.length
        : 0,
      totalTimeInvested: periodTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0),
    };
  }

  getProgressSnapshots(): ProgressSnapshot[] {
    return this.goalService.goals().map((goal) => {
      const tasks = this.taskService.getByGoalId(goal.id);
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const daysRemaining = goal.targetDate
        ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        goalId: goal.id,
        goalTitle: goal.title,
        progressPercent: goal.progress,
        tasksTotal: tasks.length,
        tasksCompleted: completed,
        daysRemaining,
        onTrack: daysRemaining > 0 || goal.status === 'completed',
        trend: 'stable' as const,
      };
    });
  }

  getTimeDistribution(): TimeDistribution[] {
    const tasks = this.taskService.tasks().filter((t) => t.actualMinutes && t.actualMinutes > 0);
    const totalMinutes = tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
    const goals = this.goalService.goals();

    const distribution = new Map<string, number>();
    tasks.forEach((t) => {
      const goal = goals.find((g) => g.id === t.goalId);
      const category = goal?.title || 'Sin meta';
      distribution.set(category, (distribution.get(category) || 0) + (t.actualMinutes || 0));
    });

    return Array.from(distribution.entries()).map(([category, minutes]) => ({
      category,
      minutes,
      percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
    }));
  }
}
