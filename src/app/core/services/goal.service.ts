import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Goal, GoalStatus, GoalMode } from '../models/goal.model';
import { StorageService } from './storage.service';
import { TaskService } from './task.service';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly STORAGE_KEY = 'um_goals';
  private taskService = inject(TaskService);

  private goalsSignal = signal<Goal[]>([]);

  readonly goals = this.goalsSignal.asReadonly();
  readonly activeGoals = computed(() =>
    this.goalsSignal().filter((g) => g.status === 'in_progress')
  );
  readonly completedGoals = computed(() =>
    this.goalsSignal().filter((g) => g.status === 'completed')
  );

  constructor(private storage: StorageService) {
    this.loadFromStorage();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
      }
    });
  }

  create(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'childGoalIds' | 'taskIds' | 'microSteps'>): Goal {
    const newGoal: Goal = {
      ...goal,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: 0,
      childGoalIds: [],
      taskIds: [],
      microSteps: [],
    };
    this.goalsSignal.update((goals) => [...goals, newGoal]);
    this.saveToStorage();
    return newGoal;
  }

  update(id: string, changes: Partial<Goal>): void {
    this.goalsSignal.update((goals) =>
      goals.map((g) => (g.id === id ? { ...g, ...changes, updatedAt: new Date() } : g))
    );
    this.saveToStorage();
  }

  delete(id: string): void {
    this.taskService.deleteByGoalId(id);
    this.goalsSignal.update((goals) => goals.filter((g) => g.id !== id));
    this.saveToStorage();
  }

  getById(id: string): Goal | undefined {
    return this.goalsSignal().find((g) => g.id === id);
  }

  getByMode(mode: GoalMode): Goal[] {
    return this.goalsSignal().filter((g) => g.mode === mode);
  }

  getChildren(parentId: string): Goal[] {
    return this.goalsSignal().filter((g) => g.parentGoalId === parentId);
  }

  getRootGoals(): Goal[] {
    return this.goalsSignal().filter((g) => !g.parentGoalId);
  }

  updateProgress(id: string, progress: number): void {
    this.update(id, {
      progress: Math.min(100, Math.max(0, progress)),
      status: progress >= 100 ? 'completed' : 'in_progress',
    });
  }

  hydrateDirectly(goals: any[]): void {
    if (Array.isArray(goals)) {
      const migratedData: Goal[] = goals.map(g => ({
        ...g,
        intentionTrigger: g.intentionTrigger || '',
        intentionAction: g.intentionAction || g.description || '',
        microSteps: g.microSteps || [],
      }));
      this.goalsSignal.set(migratedData);
    }
  }

  private loadFromStorage(): void {
    const data = this.storage.get<any[]>(this.STORAGE_KEY);
    if (data) {
      this.hydrateDirectly(data);
    }
  }

  private saveToStorage(): void {
    this.storage.set(this.STORAGE_KEY, this.goalsSignal());
  }
}
