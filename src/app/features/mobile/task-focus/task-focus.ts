import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../../core/services/task.service';
import { GoalService } from '../../../core/services/goal.service';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring';

@Component({
  selector: 'um-task-focus',
  standalone: true,
  imports: [RouterLink, ProgressRingComponent],
  template: `
    <div class="focus-screen">
      @if (task(); as t) {
        <!-- Timer Mode -->
        <div class="focus-hero animate-fadeInUp">
          <div class="focus-timer-ring">
            <um-progress-ring [value]="timerProgress()" [size]="200" [strokeWidth]="8" color="var(--accent)" />
            <div class="timer-overlay">
              <span class="timer-display">{{ formattedTime() }}</span>
              <span class="timer-mode">{{ isRunning() ? 'Enfocado' : 'Pausado' }}</span>
            </div>
          </div>
        </div>

        <!-- Task Info -->
        <div class="focus-info animate-fadeInUp stagger-1">
          <span class="priority-badge" [class]="t.priority">{{ t.priority }}</span>
          <h1 class="focus-task-title">{{ t.title }}</h1>
          @if (t.description) {
            <p class="focus-task-desc">{{ t.description }}</p>
          }
          @if (goalName()) {
            <span class="goal-tag">🎯 {{ goalName() }}</span>
          }
        </div>

        <!-- Controls -->
        <div class="focus-controls animate-fadeInUp stagger-2">
          @if (!isRunning()) {
            <button class="control-btn start" (click)="startTimer()">
              <span class="ctrl-icon">▶</span>
              <span class="ctrl-label">Iniciar</span>
            </button>
          } @else {
            <button class="control-btn pause" (click)="pauseTimer()">
              <span class="ctrl-icon">⏸</span>
              <span class="ctrl-label">Pausar</span>
            </button>
          }
          <button class="control-btn complete" (click)="completeTask()">
            <span class="ctrl-icon">✓</span>
            <span class="ctrl-label">Hecho</span>
          </button>
          <button class="control-btn skip" (click)="skipTask()">
            <span class="ctrl-icon">⏭</span>
            <span class="ctrl-label">Saltar</span>
          </button>
        </div>

        <!-- Session Stats -->
        <div class="session-stats animate-fadeInUp stagger-3">
          <div class="session-stat">
            <span class="ss-value">{{ sessionsCompleted() }}</span>
            <span class="ss-label">Sesiones</span>
          </div>
          <div class="session-stat">
            <span class="ss-value">{{ totalMinutes() }}m</span>
            <span class="ss-label">Tiempo total</span>
          </div>
          <div class="session-stat">
            <span class="ss-value">{{ completedToday() }}</span>
            <span class="ss-label">Completadas</span>
          </div>
        </div>
      } @else {
        <div class="focus-empty animate-fadeInUp">
          <div class="empty-art">🧘</div>
          <h2>Sin tareas pendientes</h2>
          <p>¡Has completado todo por hoy!</p>
          <a class="go-today-btn" routerLink="/m/today">Ir a Hoy</a>
        </div>
      }
    </div>
  `,
  styleUrl: 'task-focus.scss',
})
export class TaskFocusComponent {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  isRunning = signal(false);
  secondsElapsed = signal(0);
  sessionsCompleted = signal(0);
  totalMinutes = signal(0);
  skippedIds = signal<string[]>([]);

  task = computed(() => {
    const skip = this.skippedIds();
    const tasks = this.taskService.pendingTasks().filter(t => !skip.includes(t.id));
    return tasks[0] || null;
  });

  goalName = computed(() => {
    const t = this.task();
    if (!t?.goalId) return '';
    return this.goalService.getById(t.goalId)?.title || '';
  });

  timerProgress = computed(() => {
    const target = 25 * 60; // 25 min pomodoro
    return Math.min(100, Math.round((this.secondsElapsed() / target) * 100));
  });

  formattedTime = computed(() => {
    const s = this.secondsElapsed();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  completedToday = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.taskService.tasks().filter(t => {
      if (!t.completedAt) return false;
      const d = new Date(t.completedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;
  });

  startTimer(): void {
    this.isRunning.set(true);
    this.timerInterval = setInterval(() => {
      this.secondsElapsed.update(v => v + 1);
    }, 1000);
  }

  pauseTimer(): void {
    this.isRunning.set(false);
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  completeTask(): void {
    const t = this.task();
    if (!t) return;
    this.pauseTimer();
    this.taskService.complete(t.id);
    this.totalMinutes.update(v => v + Math.round(this.secondsElapsed() / 60));
    this.sessionsCompleted.update(v => v + 1);
    this.secondsElapsed.set(0);
  }

  skipTask(): void {
    const t = this.task();
    if (!t) return;
    this.pauseTimer();
    this.skippedIds.update(ids => [...ids, t.id]);
    this.secondsElapsed.set(0);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}
