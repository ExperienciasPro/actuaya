import { Component, inject, computed, signal } from '@angular/core';
import { TaskService } from '../../../../core/services/task.service';
import { GoalService } from '../../../../core/services/goal.service';

@Component({
  selector: 'um-time-tracking',
  standalone: true,
  imports: [],
  template: `
    <div class="time-page">
      <div class="page-header animate-fadeInUp">
        <h1>Tiempo Invertido</h1>
        <p class="header-subtitle">Análisis de dónde inviertes tu tiempo.</p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-row animate-fadeInUp stagger-1">
        <div class="summary-card highlight">
          <span class="sum-icon">⏱️</span>
          <span class="sum-value">{{ totalHours() }}h</span>
          <span class="sum-label">Horas Totales</span>
        </div>
        <div class="summary-card">
          <span class="sum-icon">📅</span>
          <span class="sum-value">{{ avgDailyHours() }}h</span>
          <span class="sum-label">Promedio Diario</span>
        </div>
        <div class="summary-card">
          <span class="sum-icon">🎯</span>
          <span class="sum-value">{{ activeGoals() }}</span>
          <span class="sum-label">Metas Activas</span>
        </div>
      </div>

      <!-- Category Distribution -->
      @if (categories().length) {
        <div class="distribution-section animate-fadeInUp stagger-2">
          <h2>Distribución por Meta</h2>
          <div class="dist-bars">
            @for (cat of categories(); track cat.name) {
              <div class="dist-item">
                <div class="dist-header">
                  <span class="dist-icon">{{ cat.icon }}</span>
                  <span class="dist-name">{{ cat.name }}</span>
                  <span class="dist-hours">{{ cat.hours }}h</span>
                  <span class="dist-pct">{{ cat.pct }}%</span>
                </div>
                <div class="dist-track">
                  <div class="dist-fill" [style.width.%]="cat.pct" [style.background]="cat.color"></div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Weekly Heatmap -->
      <div class="heatmap-section animate-fadeInUp stagger-3">
        <h2>Actividad Semanal</h2>
        <div class="heatmap-grid">
          @for (day of weekHeatmap(); track day.label) {
            <div class="heatmap-cell">
              <div class="cell-block" [style.opacity]="day.intensity" [class.today]="day.isToday"></div>
              <span class="cell-label">{{ day.label }}</span>
              <span class="cell-value">{{ day.tasks }} tareas</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: 'time-tracking.scss',
})
export class TimeTrackingComponent {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);

  totalHours = computed(() => {
    const mins = this.taskService.tasks().reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
    return Math.round(mins / 60 * 10) / 10;
  });

  avgDailyHours = computed(() => Math.round(this.totalHours() / 7 * 10) / 10);

  activeGoals = computed(() =>
    this.goalService.goals().filter(g => g.status === 'in_progress').length
  );

  categories = computed(() => {
    const goals = this.goalService.goals();
    const total = this.taskService.tasks().reduce((s, t) => s + (t.estimatedMinutes || 0), 0) || 1;

    return goals.map(g => {
      const tasks = this.taskService.getByGoalId(g.id);
      const mins = tasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
      return {
        name: g.title,
        icon: { leader: '🧠', business: '📋' }[g.mode] || '🎯',
        hours: Math.round(mins / 60 * 10) / 10,
        pct: Math.round((mins / total) * 100),
        color: { leader: '#6c5ce7', business: '#feca57' }[g.mode] || '#6c5ce7',
      };
    }).filter(c => c.hours > 0).sort((a, b) => b.hours - a.hours);
  });

  weekHeatmap = computed(() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const today = new Date().getDay();
    const todayIdx = today === 0 ? 6 : today - 1;
    const tasks = this.taskService.tasks();

    return days.map((label, i) => {
      const count = tasks.filter(t => {
        if (!t.completedAt) return false;
        const d = new Date(t.completedAt).getDay();
        return (d === 0 ? 6 : d - 1) === i;
      }).length;
      return {
        label,
        tasks: count,
        intensity: Math.max(0.15, Math.min(1, count / 5)),
        isToday: i === todayIdx,
      };
    });
  });
}
