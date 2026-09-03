import { Injectable, signal, computed, effect, inject, Injector } from '@angular/core';
import { Goal, GoalStatus, GoalMode } from '../models/goal.model';
import { StorageService } from './storage.service';
import { TaskService } from './task.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly STORAGE_KEY = 'um_goals';
  private taskService = inject(TaskService);
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private goalsSignal = signal<Goal[]>([]);

  readonly goals = computed(() => this.goalsSignal().filter(g => !g.isDeleted));
  
  readonly activeGoals = computed(() =>
    this.goals().filter((g) => g.status === 'in_progress')
  );
  readonly completedGoals = computed(() =>
    this.goals().filter((g) => g.status === 'completed')
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
    // Recursively delete child goals first
    const children = this.getChildren(id);
    for (const child of children) {
      this.delete(child.id); // Recursive cascade
    }
    // Delete tasks belonging to this goal
    this.taskService.deleteByGoalId(id);
    // Soft delete the goal itself
    this.goalsSignal.update((goals) => 
      goals.map((g) => g.id === id ? { ...g, isDeleted: true, updatedAt: new Date() } : g)
    );
    this.saveToStorage();
    this.dataSync.saveToServerImmediate();
  }

  getById(id: string): Goal | undefined {
    return this.goals().find((g) => g.id === id);
  }

  getByMode(mode: GoalMode): Goal[] {
    return this.goals().filter((g) => g.mode === mode);
  }

  getChildren(parentId: string): Goal[] {
    return this.goals().filter((g) => g.parentGoalId === parentId);
  }

  getRootGoals(): Goal[] {
    return this.goals().filter((g) => !g.parentGoalId);
  }

  updateProgress(id: string, progress: number): void {
    this.update(id, {
      progress: Math.min(100, Math.max(0, progress)),
      status: progress >= 100 ? 'completed' : 'in_progress',
    });
  }

  hydrateDirectly(serverGoals: any[]): void {
    if (!Array.isArray(serverGoals)) return;
    
    const local = this.goalsSignal();
    const localMap = new Map(local.map(g => [g.id, g]));
    
    for (const serverGoal of serverGoals) {
      const g: Goal = {
        ...serverGoal,
        intentionTrigger: serverGoal.intentionTrigger || '',
        intentionAction: serverGoal.intentionAction || serverGoal.description || '',
        microSteps: serverGoal.microSteps || [],
      };
      
      const localG = localMap.get(g.id);
      if (localG) {
        const localTime = new Date(localG.updatedAt || 0).getTime();
        const serverTime = new Date(g.updatedAt || 0).getTime();
        if (serverTime >= localTime) {
          localMap.set(g.id, g);
        }
      } else {
        localMap.set(g.id, g);
      }
    }
    
    this.goalsSignal.set(Array.from(localMap.values()));
  }

  private loadFromStorage(): void {
    const data = this.storage.get<any[]>(this.STORAGE_KEY);
    if (data) {
      this.hydrateDirectly(data);
    }
  }

  private saveToStorage(): void {
    this.storage.set(this.STORAGE_KEY, this.goalsSignal());
    this.dataSync.trackLocalModification(this.STORAGE_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
