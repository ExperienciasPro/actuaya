import { Injectable, signal, computed, effect, untracked, inject, Injector } from '@angular/core';
import { Task, TaskStatus, TaskPriority } from '../models/task.model';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly STORAGE_KEY = 'um_tasks';
  private storage = inject(StorageService);
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

  private tasksSignal = signal<Task[]>([]);

  readonly tasks = computed(() => this.tasksSignal().filter(t => !t.isDeleted));
  
  readonly pendingTasks = computed(() =>
    this.tasks().filter((t) => t.status === 'pending' || t.status === 'in_progress')
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

  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'notes'>): Task {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      notes: [],
    };
    this.tasksSignal.update((tasks) => [...tasks, newTask]);
    this.saveToStorage();
    return newTask;
  }

  update(id: string, changes: Partial<Task>): void {
    this.tasksSignal.update((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, ...changes, updatedAt: new Date() } : t))
    );
    this.saveToStorage();
  }

  complete(id: string): void {
    this.update(id, { status: 'completed', completedAt: new Date() });
  }

  delete(id: string): void {
    this.tasksSignal.update((tasks) => 
      tasks.map((t) => t.id === id ? { ...t, isDeleted: true, updatedAt: new Date() } : t)
    );
    this.saveToStorage();
    this.dataSync.saveToServerImmediate();
  }

  deleteByGoalId(goalId: string): void {
    this.tasksSignal.update((tasks) => 
      tasks.map((t) => t.goalId === goalId ? { ...t, isDeleted: true, updatedAt: new Date() } : t)
    );
    this.saveToStorage();
    this.dataSync.saveToServerImmediate();
  }

  getByGoalId(goalId: string): Task[] {
    return this.tasks()
      .filter((t) => t.goalId === goalId)
      .sort((a, b) => a.order - b.order);
  }

  getNextPendingTask(goalId: string): Task | undefined {
    return this.getByGoalId(goalId).find((t) => t.status === 'pending');
  }

  getTodaysFocusTask(): Task | undefined {
    const pending = this.tasks()
      .filter((t) => t.status === 'pending' || t.status === 'in_progress')
      .sort((a, b) => {
        const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    return pending[0];
  }

  addNote(taskId: string, note: string): void {
    const task = this.tasks().find((t) => t.id === taskId);
    if (task) {
      this.update(taskId, { notes: [...task.notes, note] });
    }
  }

  private mergeIntoLocal(incomingTasks: Task[]): { merged: Task[]; changed: boolean } {
    const local = untracked(() => this.tasksSignal());
    const localMap = new Map(local.map(t => [t.id, t]));
    let changed = false;

    for (const serverTask of incomingTasks) {
      if (!serverTask?.id) continue;
      const t: Task = {
        ...serverTask,
        notes: Array.isArray(serverTask.notes) ? serverTask.notes : [],
      };
      const localT = localMap.get(t.id);

      if (localT) {
        const localTime = new Date(localT.updatedAt || 0).getTime();
        const incomingTime = new Date(t.updatedAt || 0).getTime();
        if (incomingTime > localTime || (incomingTime === localTime && JSON.stringify(localT) !== JSON.stringify(t))) {
          localMap.set(t.id, t);
          changed = true;
        }
      } else {
        localMap.set(t.id, t);
        changed = true;
      }
    }

    return { merged: Array.from(localMap.values()), changed };
  }

  hydrateDirectly(serverTasks: Task[]): void {
    if (!Array.isArray(serverTasks)) return;

    const currentUserId = this.storage.getActiveUserId();
    if (currentUserId !== this.lastLoadedUserId) {
      this.lastLoadedUserId = currentUserId;
    }

    const { merged, changed } = this.mergeIntoLocal(serverTasks);
    if (changed) {
      this.tasksSignal.set(merged);
      this.storage.set(this.STORAGE_KEY, merged);
      this.lastSelfSaveToken = this.storage.updateToken();
    }
  }

  private loadFromStorage(): void {
    const currentUserId = this.storage.getActiveUserId();
    const userChanged = currentUserId !== this.lastLoadedUserId;
    this.lastLoadedUserId = currentUserId;

    const data = this.storage.get<Task[]>(this.STORAGE_KEY);
    if (userChanged) {
      const normalized = Array.isArray(data)
        ? data.filter(t => t?.id).map(t => ({ ...t, notes: Array.isArray(t.notes) ? t.notes : [] }))
        : [];
      this.tasksSignal.set(normalized);
      return;
    }

    if (!Array.isArray(data)) return;

    const { merged, changed } = this.mergeIntoLocal(data);
    if (changed) {
      this.tasksSignal.set(merged);
    }
  }

  private saveToStorage(): void {
    const current = untracked(() => this.tasksSignal());
    this.storage.set(this.STORAGE_KEY, current);
    this.lastSelfSaveToken = this.storage.updateToken();
    this.dataSync.trackLocalModification(this.STORAGE_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
