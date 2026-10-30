import { Injectable, signal, computed, effect, untracked, inject, Injector } from '@angular/core';
import { Goal, GoalStatus, GoalMode } from '../models/goal.model';
import { StorageService } from './storage.service';
import { TaskService } from './task.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private readonly STORAGE_KEY = 'um_goals';
  private storage = inject(StorageService);
  private taskService = inject(TaskService);
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private lastSelfSaveToken = -1;
  private lastLoadedUserId: string | null = null;
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

  constructor() {
    this.loadFromStorage();
    effect(() => {
      const token = this.storage.updateToken();
      if (token >= 0 && token !== this.lastSelfSaveToken) {
        untracked(() => {
          this.loadFromStorage();
        });
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

  private normalizeGoal(raw: any): Goal {
    return {
      ...raw,
      intentionTrigger: raw?.intentionTrigger || '',
      intentionAction: raw?.intentionAction || raw?.description || '',
      microSteps: raw?.microSteps || [],
    };
  }

  private mergeIntoLocal(incomingGoals: any[]): { merged: Goal[]; changed: boolean } {
    const local = untracked(() => this.goalsSignal());
    const localMap = new Map(local.map(g => [g.id, g]));
    let changed = false;

    for (const raw of incomingGoals) {
      if (!raw?.id) continue;
      const g = this.normalizeGoal(raw);
      const localG = localMap.get(g.id);

      if (localG) {
        const localTime = new Date(localG.updatedAt || 0).getTime();
        const incomingTime = new Date(g.updatedAt || 0).getTime();
        if (incomingTime > localTime || (incomingTime === localTime && JSON.stringify(localG) !== JSON.stringify(g))) {
          localMap.set(g.id, g);
          changed = true;
        }
      } else {
        localMap.set(g.id, g);
        changed = true;
      }
    }

    return { merged: Array.from(localMap.values()), changed };
  }

  hydrateDirectly(serverGoals: any[]): void {
    if (!Array.isArray(serverGoals)) return;

    const currentUserId = this.storage.getActiveUserId();
    if (currentUserId !== this.lastLoadedUserId) {
      this.lastLoadedUserId = currentUserId;
    }

    const { merged, changed } = this.mergeIntoLocal(serverGoals);
    if (changed) {
      this.goalsSignal.set(merged);
      this.storage.set(this.STORAGE_KEY, merged);
      this.lastSelfSaveToken = this.storage.updateToken();
    }
  }

  private loadFromStorage(): void {
    const currentUserId = this.storage.getActiveUserId();
    const userChanged = currentUserId !== this.lastLoadedUserId;
    this.lastLoadedUserId = currentUserId;

    const data = this.storage.get<any[]>(this.STORAGE_KEY);
    if (userChanged) {
      const normalized = Array.isArray(data) ? data.filter(g => g?.id).map(g => this.normalizeGoal(g)) : [];
      this.goalsSignal.set(normalized);
      return;
    }

    if (!Array.isArray(data)) return;

    const { merged, changed } = this.mergeIntoLocal(data);
    if (changed) {
      this.goalsSignal.set(merged);
    }
  }

  private saveToStorage(): void {
    const current = untracked(() => this.goalsSignal());
    this.storage.set(this.STORAGE_KEY, current);
    this.lastSelfSaveToken = this.storage.updateToken();
    this.dataSync.trackLocalModification(this.STORAGE_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
