import { Injectable, signal, computed, effect, inject, Injector } from '@angular/core';
import { Task, TaskStatus, TaskPriority } from '../models/task.model';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly STORAGE_KEY = 'um_tasks';
  private storage = inject(StorageService);
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
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
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
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

  hydrateDirectly(serverTasks: Task[]): void {
    if (!Array.isArray(serverTasks)) return;
    
    const local = this.tasksSignal();
    const localMap = new Map(local.map(t => [t.id, t]));
    
    for (const serverTask of serverTasks) {
      const t = { ...serverTask };
      const localT = localMap.get(t.id);
      
      if (localT) {
        const localTime = new Date(localT.updatedAt || 0).getTime();
        const serverTime = new Date(t.updatedAt || 0).getTime();
        if (serverTime >= localTime) {
          localMap.set(t.id, t);
        }
      } else {
        localMap.set(t.id, t);
      }
    }
    
    this.tasksSignal.set(Array.from(localMap.values()));
  }

  private loadFromStorage(): void {
    const data = this.storage.get<Task[]>(this.STORAGE_KEY);
    if (data) {
      this.hydrateDirectly(data);
    }
  }

  private saveToStorage(): void {
    this.storage.set(this.STORAGE_KEY, this.tasksSignal());
    this.dataSync.trackLocalModification(this.STORAGE_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
