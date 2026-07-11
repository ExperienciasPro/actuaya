import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GoalService } from '../../../../core/services/goal.service';
import { TaskService } from '../../../../core/services/task.service';
import { Goal, GoalMode } from '../../../../core/models/goal.model';
import { Task, TaskPriority } from '../../../../core/models/task.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';

@Component({
  selector: 'um-goal-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    StatusBadgeComponent,
    ProgressRingComponent,
    ConfirmDialogComponent,
    TimeAgoPipe,
    UmIconComponent,
  ],
  template: `
    <div class="goal-detail-page">
      @if (goal(); as g) {
        <!-- Breadcrumb -->
        <div class="breadcrumb animate-fadeIn">
          <a routerLink="/d/goals">Metas</a>
          <span class="sep">›</span>
          <span>{{ g.title }}</span>
        </div>

        <!-- Hero Section -->
        <div class="hero-section animate-fadeInUp">
          <div class="hero-left">
            <div class="hero-meta">
              <span class="mode-tag"><um-icon [name]="getModeIcon(g.mode)" [size]="16"></um-icon> {{ getModeName(g.mode) }}</span>
              <um-status-badge [variant]="g.status" />
            </div>
            <h1 class="hero-title">{{ g.title }}</h1>
            <div class="intention-card">
              <div class="intention-row">
                <span class="intention-label">Si/Cuando</span>
                <span class="intention-value">{{ g.intentionTrigger }}</span>
              </div>
              <div class="intention-row">
                <span class="intention-label">entonces</span>
                <span class="intention-value">{{ g.intentionAction }}</span>
              </div>
            </div>

            @if (g.delegatedTo) {
              <div class="delegation-card">
                <um-icon name="user" [size]="14"></um-icon>
                <span><strong>Delegado a / Sistema:</strong> {{ g.delegatedTo }}</span>
              </div>
            }

            <div class="hero-tags">
              @for (tag of g.tags; track tag) {
                <span class="tag-chip">{{ tag }}</span>
              }
              <span class="meta-date"><um-icon name="timer" [size]="14"></um-icon> Creada {{ g.createdAt | timeAgo }}</span>
            </div>
          </div>
          <div class="hero-right">
            <um-progress-ring [value]="g.progress" [size]="120" [strokeWidth]="8" [color]="getProgressColor(g.progress)" />
          </div>
        </div>

        <!-- Action Bar -->
        <div class="action-bar animate-fadeInUp stagger-1">
          <div class="status-controls">
            @for (s of statuses; track s.value) {
              <button
                class="status-btn"
                [class.active]="g.status === s.value"
                (click)="updateStatus(s.value)"
              ><um-icon [name]="s.icon" [size]="16"></um-icon> {{ s.label }}</button>
            }
          </div>
          <div class="action-buttons">
            <button class="btn-ghost small" (click)="showDeleteDialog.set(true)"><um-icon name="trash" [size]="16"></um-icon> Eliminar</button>
          </div>
        </div>


        <!-- Tasks Section -->
        <div class="tasks-section animate-fadeInUp stagger-3">
          <div class="section-header">
            <h2><um-icon name="board" [size]="22"></um-icon> Micro-pasos (Fragmentación)</h2>
            <span class="task-count">{{ completedTaskCount() }}/{{ tasks().length }} completados</span>
          </div>
          <p class="section-desc">Divide tu meta en acciones tan pequeñas que sea ridículo no hacerlas.</p>

          <!-- Add Task -->
          <form class="add-task-form" (ngSubmit)="addTask()">
            <input
              class="form-input"
              type="text"
              [(ngModel)]="newTaskTitle"
              name="newTaskTitle"
              placeholder="+ Agregar nuevo micro-paso..."
            />
            <select class="form-input priority-select" [(ngModel)]="newTaskPriority" name="newTaskPriority">
              <option value="medium">Media</option>
              <option value="low">Baja</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
            <button type="submit" class="btn-primary small" [disabled]="!newTaskTitle().trim()">Agregar</button>
          </form>

          <!-- Task List -->
          @if (tasks().length) {
            <div class="task-list">
              @for (task of tasks(); track task.id; let i = $index) {
                <div class="task-item" [class.completed]="task.status === 'completed'" [style.animation-delay.ms]="i * 30">
                  <button
                    class="task-check"
                    [class.checked]="task.status === 'completed'"
                    (click)="toggleTask(task)"
                  >
                    @if (task.status === 'completed') { ✓ }
                  </button>

                  <div class="task-content">
                    <span class="task-title">{{ task.title }}</span>
                    <div class="task-meta">
                      <span class="priority-dot" [class]="task.priority"></span>
                      <span class="priority-label">{{ task.priority }}</span>
                      @if (task.estimatedMinutes) {
                        <span class="task-time"><um-icon name="timer" [size]="14"></um-icon> {{ task.estimatedMinutes }}m</span>
                      }
                      @if (task.completedAt) {
                        <span class="task-completed-at">✓ {{ task.completedAt | timeAgo }}</span>
                      }
                    </div>
                  </div>

                  <div class="task-actions">
                    @if (task.status !== 'completed') {
                      <button class="task-action-btn" (click)="startEditTime(task)" title="Tiempo estimado"><um-icon name="timer" [size]="16"></um-icon></button>
                    }
                    <button class="task-action-btn danger" (click)="deleteTask(task.id)" title="Eliminar">×</button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Task Progress Bar -->
          @if (tasks().length) {
            <div class="task-progress-bar">
              <div class="task-progress-fill" [style.width.%]="taskProgressPct()"></div>
            </div>
          }
        </div>

        <!-- Child Goals -->
        @if (childGoals().length) {
          <div class="children-section animate-fadeInUp stagger-4">
            <h2><um-icon name="tree" [size]="22"></um-icon> Sub-metas</h2>
            <div class="children-grid">
              @for (child of childGoals(); track child.id) {
                <a class="child-card" [routerLink]="['/d/goals', child.id]">
                  <div class="child-info">
                    <um-icon class="child-mode" [name]="getModeIcon(child.mode)" [size]="16"></um-icon>
                    <span class="child-title">{{ child.title }}</span>
                  </div>
                  <div class="child-progress">
                    <div class="child-bar-track">
                      <div class="child-bar-fill" [style.width.%]="child.progress"></div>
                    </div>
                    <span class="child-pct">{{ child.progress }}%</span>
                  </div>
                </a>
              }
            </div>
          </div>
        }

        <!-- Time Edit Modal (Inline) -->
        @if (editingTime()) {
          <div class="time-modal-backdrop" (click)="editingTime.set(false)">
            <div class="time-modal" (click)="$event.stopPropagation()">
              <h4><um-icon name="timer" [size]="18"></um-icon> Tiempo estimado</h4>
              <input
                class="form-input"
                type="number"
                [(ngModel)]="editTimeMinutes"
                min="1" max="480"
                placeholder="Minutos"
              />
              <div class="time-modal-actions">
                <button class="btn-ghost small" (click)="editingTime.set(false)">Cancelar</button>
                <button class="btn-primary small" (click)="saveTime()">Guardar</button>
              </div>
            </div>
          </div>
        }

        <!-- Delete Dialog -->
        <um-confirm-dialog
          [open]="showDeleteDialog()"
          title="Eliminar meta"
          [message]="deleteMessage()"
          icon="trash"
          confirmLabel="Eliminar"
          variant="danger"
          (confirmed)="executeDelete()"
          (cancelled)="showDeleteDialog.set(false)"
        />
      } @else {
        <div class="not-found animate-fadeInUp">
          <h2>Meta no encontrada</h2>
          <p>La meta que buscas no existe o fue eliminada.</p>
          <a class="btn-primary" routerLink="/d/goals">← Volver a Metas</a>
        </div>
      }
    </div>
  `,
  styleUrl: 'goal-detail.scss',
})
export class GoalDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);

  goalId = signal('');
  goal = computed(() => this.goalService.getById(this.goalId()));
  tasks = computed(() => this.taskService.getByGoalId(this.goalId()));
  childGoals = computed(() => this.goalService.getChildren(this.goalId()));

  completedTaskCount = computed(() => this.tasks().filter((t) => t.status === 'completed').length);
  taskProgressPct = computed(() => {
    const total = this.tasks().length;
    return total ? Math.round((this.completedTaskCount() / total) * 100) : 0;
  });

  showDeleteDialog = signal(false);
  editingTime = signal(false);
  editingTaskId = signal('');
  editTimeMinutes = signal(30);
  newTaskTitle = signal('');
  newTaskPriority = signal<TaskPriority>('medium');

  deleteMessage = computed(() => {
    const g = this.goal();
    return g ? 'Se eliminará la meta y todas sus tareas asociadas.' : '';
  });

  statuses = [
    { value: 'not_started' as const, icon: 'hourglass', label: 'Sin iniciar' },
    { value: 'in_progress' as const, icon: 'fire', label: 'En progreso' },
    { value: 'paused' as const, icon: 'pause', label: 'Pausada' },
    { value: 'completed' as const, icon: 'check', label: 'Completada' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.goalId.set(id);
  }

  getModeIcon(mode: GoalMode): string {
    return { leader: 'user', business: 'board' }[mode];
  }

  getModeName(mode: GoalMode): string {
    return { leader: 'Líder', business: 'Negocio' }[mode];
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return '#00cec9';
    if (progress >= 50) return '#6c5ce7';
    return '#54a0ff';
  }

  updateStatus(status: string): void {
    this.goalService.update(this.goalId(), { status: status as any });
  }

  onProgressChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.goalService.updateProgress(this.goalId(), value);
  }

  addTask(): void {
    const title = this.newTaskTitle().trim();
    if (!title) return;

    const existingTasks = this.tasks();
    this.taskService.create({
      goalId: this.goalId(),
      title,
      priority: this.newTaskPriority(),
      status: 'pending',
      order: existingTasks.length,
    });
    this.newTaskTitle.set('');
    this.recalculateProgress();
  }

  toggleTask(task: Task): void {
    if (task.status === 'completed') {
      this.taskService.update(task.id, { status: 'pending', completedAt: undefined });
    } else {
      this.taskService.complete(task.id);
    }
    this.recalculateProgress();
  }

  deleteTask(taskId: string): void {
    this.taskService.delete(taskId);
    this.recalculateProgress();
  }

  startEditTime(task: Task): void {
    this.editingTaskId.set(task.id);
    this.editTimeMinutes.set(task.estimatedMinutes || 30);
    this.editingTime.set(true);
  }

  saveTime(): void {
    this.taskService.update(this.editingTaskId(), { estimatedMinutes: this.editTimeMinutes() });
    this.editingTime.set(false);
  }

  private recalculateProgress(): void {
    const t = this.tasks();
    if (!t.length) return;
    const completed = t.filter((x) => x.status === 'completed').length;
    const pct = Math.round((completed / t.length) * 100);
    this.goalService.updateProgress(this.goalId(), pct);
  }

  executeDelete(): void {
    // Delete all tasks first
    for (const task of this.tasks()) {
      this.taskService.delete(task.id);
    }
    this.goalService.delete(this.goalId());
    this.showDeleteDialog.set(false);
    this.router.navigate(['/d/goals']);
  }
}
