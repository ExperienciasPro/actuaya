import { Injectable, computed } from '@angular/core';
import { GoalService } from './goal.service';
import { TaskService } from './task.service';
import { DailyBriefing, WeeklyCelebration } from '../models/briefing.model';

@Injectable({ providedIn: 'root' })
export class BriefingService {
  constructor(
    private goalService: GoalService,
    private taskService: TaskService
  ) {}

  generateDailyBriefing(): DailyBriefing {
    const activeGoals = this.goalService.activeGoals();
    const focusTask = this.taskService.getTodaysFocusTask();
    const primaryGoal = activeGoals[0];

    const hour = new Date().getHours();
    let greeting = 'Buenos días';
    if (hour >= 12 && hour < 18) greeting = 'Buenas tardes';
    if (hour >= 18) greeting = 'Buenas noches';

    return {
      id: crypto.randomUUID(),
      date: new Date(),
      greeting,
      primaryGoal: primaryGoal
        ? { goalId: primaryGoal.id, goalTitle: primaryGoal.title }
        : { goalId: '', goalTitle: 'Sin meta activa' },
      priorityTask: focusTask
        ? { taskId: focusTask.id, taskTitle: focusTask.title, taskDescription: focusTask.description }
        : { taskId: '', taskTitle: 'No hay tareas pendientes' },
      pendingFollowUps: this.taskService.pendingTasks().length,
      completedYesterday: this.getCompletedYesterday(),
      streakDays: this.calculateStreak(),
      motivationalMessage: this.getMotivationalMessage(),
    };
  }

  generateWeeklyCelebration(weekStart: Date, weekEnd: Date): WeeklyCelebration {
    const tasks = this.taskService.tasks();
    const completedThisWeek = tasks.filter((t) => {
      if (!t.completedAt) return false;
      const completed = new Date(t.completedAt);
      return completed >= weekStart && completed <= weekEnd;
    });

    return {
      id: crypto.randomUUID(),
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      tasksCompleted: completedThisWeek.length,
      goalsAdvanced: this.goalService.activeGoals().length,
      dealsProgressed: 0,
      totalMinutesInvested: completedThisWeek.reduce((sum, t) => sum + (t.actualMinutes || 0), 0),
      highlights: this.generateHighlights(completedThisWeek.length),
      streakDays: this.calculateStreak(),
    };
  }

  private getCompletedYesterday(): number {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.taskService.tasks().filter((t) => {
      if (!t.completedAt) return false;
      const completed = new Date(t.completedAt);
      return completed >= yesterday && completed < today;
    }).length;
  }

  private calculateStreak(): number {
    const tasks = this.taskService.tasks()
      .filter(t => t.completedAt)
      .map(t => new Date(t.completedAt!).toDateString());
    
    const uniqueDays = new Set(tasks);
    let streak = 0;
    const d = new Date();

    // If today has completed tasks, count today and go backwards
    if (uniqueDays.has(d.toDateString())) {
      while (uniqueDays.has(d.toDateString())) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
    } else {
      // Today has no completions yet — don't penalize, start from yesterday
      d.setDate(d.getDate() - 1);
      while (uniqueDays.has(d.toDateString())) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
    }
    return streak;
  }

  private generateHighlights(completedCount: number): string[] {
    const highlights: string[] = [];
    if (completedCount > 0) highlights.push(`Completaste ${completedCount} tareas esta semana`);
    if (completedCount >= 5) highlights.push('¡Semana productiva! Superaste las 5 tareas');
    if (completedCount >= 10) highlights.push('🔥 ¡Increíble! Más de 10 tareas completadas');
    return highlights.length > 0 ? highlights : ['Cada paso cuenta. ¡Sigue adelante!'];
  }

  private getMotivationalMessage(): string {
    const messages = [
      'El progreso, no la perfección, es lo que importa.',
      'Un paso a la vez. Tú puedes.',
      'La constancia vence al talento.',
      'Hoy es un gran día para avanzar.',
      'Cada tarea completada te acerca a tu meta.',
      'No te detengas. El esfuerzo siempre vale la pena.',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}
