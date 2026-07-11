import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GoalService } from '../../../../core/services/goal.service';
import { TaskService } from '../../../../core/services/task.service';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'um-progress',
  standalone: true,
  imports: [RouterLink, ProgressRingComponent, EmptyStateComponent],
  template: `
    <div class="progress-page">
      <div class="page-header animate-fadeInUp">
        <h1>Progreso de Metas</h1>
        <p class="header-subtitle">Seguimiento detallado de cada meta.</p>
      </div>

      @if (goals().length) {
        <!-- Overall -->
        <div class="overall-section animate-fadeInUp stagger-1">
          <div class="overall-card">
            <um-progress-ring [value]="overallProgress()" [size]="160" [strokeWidth]="14" color="#6c5ce7" />
            <div class="overall-info">
              <span class="overall-value">{{ overallProgress() }}%</span>
              <span class="overall-label">Progreso General</span>
              <span class="overall-meta">{{ goals().length }} metas · {{ totalTasks() }} tareas</span>
            </div>
          </div>
        </div>

        <!-- Goal Cards -->
        <div class="goals-progress-grid animate-fadeInUp stagger-2">
          @for (g of goalDetails(); track g.id) {
            <a class="goal-progress-card" [routerLink]="['/d/goals', g.id]">
              <div class="gp-header">
                <span class="gp-mode">{{ g.icon }}</span>
                <span class="gp-status" [class]="g.status">{{ g.statusLabel }}</span>
              </div>
              <h3 class="gp-title">{{ g.title }}</h3>
              <div class="gp-ring-area">
                <um-progress-ring [value]="g.progress" [size]="80" [strokeWidth]="8" [color]="g.color" />
              </div>
              <div class="gp-stats">
                <div class="gp-stat">
                  <span class="gp-stat-value">{{ g.completedTasks }}</span>
                  <span class="gp-stat-label">Completadas</span>
                </div>
                <div class="gp-stat">
                  <span class="gp-stat-value">{{ g.totalTasks }}</span>
                  <span class="gp-stat-label">Total</span>
                </div>
                <div class="gp-stat">
                  <span class="gp-stat-value">{{ g.daysLeft }}</span>
                  <span class="gp-stat-label">Días rest.</span>
                </div>
              </div>
            </a>
          }
        </div>
      } @else {
        <um-empty-state
          icon="📊"
          title="Sin metas aún"
          subtitle="Crea metas para ver tu progreso detallado."
        >
          <a class="btn-primary" routerLink="/d/goals/new">+ Crear meta</a>
        </um-empty-state>
      }
    </div>
  `,
  styleUrl: 'progress.scss',
})
export class ProgressComponent {
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);

  goals = this.goalService.goals;
  totalTasks = computed(() => this.taskService.tasks().length);

  overallProgress = computed(() => {
    const goals = this.goals();
    if (!goals.length) return 0;
    return Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length);
  });

  goalDetails = computed(() => {
    return this.goals().map(g => {
      const tasks = this.taskService.getByGoalId(g.id);
      const completed = tasks.filter(t => t.status === 'completed').length;
      const daysLeft = Math.max(0, Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86400000));
      return {
        id: g.id,
        title: g.title,
        icon: { leader: '🧠', business: '📋' }[g.mode],
        status: g.status,
        statusLabel: { not_started: 'Sin iniciar', in_progress: 'En progreso', completed: 'Completada', paused: 'Pausada', blocked: 'Bloqueada' }[g.status] || g.status,
        progress: g.progress,
        totalTasks: tasks.length,
        completedTasks: completed,
        daysLeft,
        color: g.progress >= 80 ? '#00cec9' : g.progress >= 50 ? '#6c5ce7' : '#54a0ff',
      };
    });
  });
}
