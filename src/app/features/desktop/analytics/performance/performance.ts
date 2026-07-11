import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { GoalService } from '../../../../core/services/goal.service';
import { TaskService } from '../../../../core/services/task.service';
import { ProjectService } from '../../../../core/services/project.service';
import { SalesService } from '../../../../core/services/sales.service';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring';

@Component({
  selector: 'um-performance',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ProgressRingComponent],
  template: `
    <div class="analytics-page">
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <h1>Rendimiento</h1>
          <p class="header-subtitle">Vista general de tu productividad.</p>
        </div>
        <div class="header-actions">
          <div class="period-toggle">
            @for (p of periods; track p.value) {
              <button
                class="period-btn"
                [class.active]="period() === p.value"
                (click)="period.set(p.value)"
              >{{ p.label }}</button>
            }
          </div>
        </div>
      </div>

      <!-- Big Numbers -->
      <div class="metrics-grid animate-fadeInUp stagger-1">
        <div class="metric-card highlight">
          <div class="metric-top">
            <span class="metric-icon">🎯</span>
            <span class="metric-trend up">↑ {{ goalProgressTrend() }}%</span>
          </div>
          <span class="metric-big-value">{{ overallGoalProgress() }}%</span>
          <span class="metric-label">Progreso General de Metas</span>
          <div class="metric-bar">
            <div class="metric-bar-fill" [style.width.%]="overallGoalProgress()"></div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-top">
            <span class="metric-icon">✅</span>
          </div>
          <span class="metric-big-value">{{ completedTasks() }}</span>
          <span class="metric-label">Tareas Completadas</span>
        </div>

        <div class="metric-card">
          <div class="metric-top">
            <span class="metric-icon">⏱️</span>
          </div>
          <span class="metric-big-value">{{ completionRate() }}%</span>
          <span class="metric-label">Tasa de Completado</span>
        </div>

        <div class="metric-card">
          <div class="metric-top">
            <span class="metric-icon">💰</span>
          </div>
          <span class="metric-big-value">\${{ pipelineValue() | number:'1.0-0' }}</span>
          <span class="metric-label">Pipeline de Ventas</span>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row animate-fadeInUp stagger-2">
        <!-- Goals by Status -->
        <div class="chart-card">
          <h3>Distribución de Metas</h3>
          <div class="donut-chart-area">
            <um-progress-ring [value]="overallGoalProgress()" [size]="140" [strokeWidth]="12" color="#6c5ce7" />
          </div>
          <div class="legend">
            @for (item of goalDistribution(); track item.label) {
              <div class="legend-item">
                <span class="legend-dot" [style.background]="item.color"></span>
                <span class="legend-label">{{ item.label }}</span>
                <span class="legend-value">{{ item.count }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Activity -->
        <div class="chart-card">
          <h3>Actividad por Día</h3>
          <div class="bar-chart">
            @for (day of weekActivity(); track day.label) {
              <div class="bar-col">
                <div class="bar" [style.height.%]="day.pct" [class.today]="day.isToday"></div>
                <span class="bar-label">{{ day.label }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Streaks -->
        <div class="chart-card compact">
          <h3>Rachas</h3>
          <div class="streaks-list">
            <div class="streak-item">
              <span class="streak-emoji">🔥</span>
              <div class="streak-info">
                <span class="streak-value">{{ currentStreak() }}</span>
                <span class="streak-label">Días seguidos</span>
              </div>
            </div>
            <div class="streak-item">
              <span class="streak-emoji">⭐</span>
              <div class="streak-info">
                <span class="streak-value">{{ bestStreak() }}</span>
                <span class="streak-label">Mejor racha</span>
              </div>
            </div>
            <div class="streak-item">
              <span class="streak-emoji">📋</span>
              <div class="streak-info">
                <span class="streak-value">{{ totalTasks() }}</span>
                <span class="streak-label">Total tareas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Goal Progress Cards -->
      @if (goalSnapshots().length) {
        <div class="snapshots-section animate-fadeInUp stagger-3">
          <h2>Progreso por Meta</h2>
          <div class="snapshots-grid">
            @for (snap of goalSnapshots(); track snap.id) {
              <a class="snapshot-card" [routerLink]="['/d/goals', snap.id]">
                <div class="snap-header">
                  <span class="snap-mode">{{ snap.icon }}</span>
                  <span class="snap-trend" [class]="snap.trend">
                    {{ snap.trend === 'improving' ? '↑' : snap.trend === 'declining' ? '↓' : '→' }}
                  </span>
                </div>
                <span class="snap-title">{{ snap.title }}</span>
                <div class="snap-progress">
                  <div class="snap-track">
                    <div class="snap-fill" [style.width.%]="snap.progress" [style.background]="getColor(snap.progress)"></div>
                  </div>
                  <span class="snap-pct">{{ snap.progress }}%</span>
                </div>
                <div class="snap-meta">
                  <span>{{ snap.completedTasks }}/{{ snap.totalTasks }} tareas</span>
                  <span [class.on-track]="snap.onTrack" [class.off-track]="!snap.onTrack">
                    {{ snap.onTrack ? 'En ruta' : 'Retrasado' }}
                  </span>
                </div>
              </a>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'performance.scss',
})
export class PerformanceComponent {
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private salesService = inject(SalesService);

  period = signal<'week' | 'month' | 'quarter'>('week');
  periods = [
    { value: 'week' as const, label: 'Semana' },
    { value: 'month' as const, label: 'Mes' },
    { value: 'quarter' as const, label: 'Trimestre' },
  ];

  totalTasks = computed(() => this.taskService.tasks().length);
  completedTasks = computed(() => this.taskService.tasks().filter(t => t.status === 'completed').length);
  completionRate = computed(() => {
    const total = this.totalTasks();
    return total ? Math.round((this.completedTasks() / total) * 100) : 0;
  });

  overallGoalProgress = computed(() => {
    const goals = this.goalService.goals();
    if (!goals.length) return 0;
    return Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length);
  });

  goalProgressTrend = computed(() => Math.min(15, Math.max(0, this.overallGoalProgress())));
  pipelineValue = this.salesService.totalPipelineValue;

  goalDistribution = computed(() => {
    const goals = this.goalService.goals();
    return [
      { label: 'En progreso', count: goals.filter(g => g.status === 'in_progress').length, color: '#6c5ce7' },
      { label: 'Completadas', count: goals.filter(g => g.status === 'completed').length, color: '#00cec9' },
      { label: 'Sin iniciar', count: goals.filter(g => g.status === 'not_started').length, color: '#8b95a9' },
      { label: 'Pausadas', count: goals.filter(g => g.status === 'paused').length, color: '#feca57' },
    ];
  });

  weekActivity = computed(() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const today = new Date().getDay();
    const todayIdx = today === 0 ? 6 : today - 1;
    const tasks = this.taskService.tasks();

    return days.map((label, i) => {
      const count = tasks.filter(t => {
        if (!t.completedAt) return false;
        const d = new Date(t.completedAt).getDay();
        const idx = d === 0 ? 6 : d - 1;
        return idx === i;
      }).length;
      return { label, count, pct: Math.max(8, Math.min(100, count * 25)), isToday: i === todayIdx };
    });
  });

  currentStreak = computed(() => {
    const tasks = this.taskService.tasks()
      .filter(t => t.completedAt)
      .map(t => new Date(t.completedAt!).toDateString());
    const unique = [...new Set(tasks)];
    let streak = 0;
    const d = new Date();
    while (unique.includes(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  });

  bestStreak = computed(() => Math.max(this.currentStreak(), 1));

  goalSnapshots = computed(() => {
    return this.goalService.goals().map(g => {
      const tasks = this.taskService.getByGoalId(g.id);
      const completed = tasks.filter(t => t.status === 'completed').length;
      const daysLeft = Math.max(0, Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / 86400000));
      const expectedProgress = daysLeft > 0 ? Math.min(100, 100 - (daysLeft / 90 * 100)) : 100;
      return {
        id: g.id,
        title: g.title,
        icon: { leader: '🧠', business: '📋' }[g.mode],
        progress: g.progress,
        totalTasks: tasks.length,
        completedTasks: completed,
        onTrack: g.progress >= expectedProgress * 0.7,
        trend: g.progress >= 50 ? 'improving' as const : g.progress >= 20 ? 'stable' as const : 'declining' as const,
      };
    });
  });

  getColor(progress: number): string {
    if (progress >= 80) return '#00cec9';
    if (progress >= 50) return '#6c5ce7';
    return '#54a0ff';
  }
}
