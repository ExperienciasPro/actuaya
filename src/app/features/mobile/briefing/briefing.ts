import { Component, inject, computed } from '@angular/core';
import { TaskService } from '../../../core/services/task.service';
import { GoalService } from '../../../core/services/goal.service';
import { SalesService } from '../../../core/services/sales.service';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring';

@Component({
  selector: 'um-briefing',
  standalone: true,
  imports: [ProgressRingComponent],
  template: `
    <div class="briefing-screen">
      <!-- Header -->
      <div class="briefing-header animate-fadeInUp">
        <span class="briefing-emoji">📋</span>
        <h1>Briefing del Día</h1>
        <p class="briefing-date">{{ dateString() }}</p>
      </div>

      <!-- Overview Card -->
      <div class="overview-card animate-fadeInUp stagger-1">
        <div class="overview-ring">
          <um-progress-ring [value]="overallProgress()" [size]="90" [strokeWidth]="8" color="var(--accent)" />
        </div>
        <div class="overview-info">
          <span class="overview-label">Progreso General</span>
          <span class="overview-value">{{ overallProgress() }}%</span>
          <span class="overview-meta">{{ activeGoals() }} metas activas</span>
        </div>
      </div>

      <!-- Today's Focus -->
      <div class="section-card animate-fadeInUp stagger-2">
        <h2 class="section-head">🎯 Foco del Día</h2>
        @if (topTasks().length) {
          @for (t of topTasks(); track t.id) {
            <div class="briefing-item">
              <span class="item-priority" [class]="t.priority"></span>
              <div class="item-content">
                <span class="item-title">{{ t.title }}</span>
                @if (t.estimatedMinutes) {
                  <span class="item-time">~{{ t.estimatedMinutes }}min</span>
                }
              </div>
            </div>
          }
        } @else {
          <p class="empty-text">Sin tareas pendientes 🎉</p>
        }
      </div>

      <!-- Goals Summary -->
      <div class="section-card animate-fadeInUp stagger-3">
        <h2 class="section-head">📊 Estado de Metas</h2>
        @for (g of goalSummaries(); track g.id) {
          <div class="goal-brief">
            <span class="goal-icon">{{ g.icon }}</span>
            <div class="goal-info">
              <span class="goal-name">{{ g.title }}</span>
              <div class="goal-mini-bar">
                <div class="goal-mini-fill" [style.width.%]="g.progress" [style.background]="g.color"></div>
              </div>
            </div>
            <span class="goal-pct">{{ g.progress }}%</span>
          </div>
        }
        @if (!goalSummaries().length) {
          <p class="empty-text">Crea metas desde la consola.</p>
        }
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats animate-fadeInUp stagger-4">
        <div class="qs-card">
          <span class="qs-icon">💰</span>
          <span class="qs-value">\${{ pipelineValue() }}</span>
          <span class="qs-label">Pipeline</span>
        </div>
        <div class="qs-card">
          <span class="qs-icon">📈</span>
          <span class="qs-value">{{ openDeals() }}</span>
          <span class="qs-label">Deals</span>
        </div>
        <div class="qs-card">
          <span class="qs-icon">✅</span>
          <span class="qs-value">{{ completedToday() }}</span>
          <span class="qs-label">Hechas hoy</span>
        </div>
      </div>
    </div>
  `,
  styleUrl: 'briefing.scss',
})
export class BriefingComponent {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);
  private salesService = inject(SalesService);

  dateString = computed(() =>
    new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  );

  overallProgress = computed(() => {
    const goals = this.goalService.goals();
    if (!goals.length) return 0;
    return Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length);
  });

  activeGoals = computed(() => this.goalService.goals().filter(g => g.status === 'in_progress').length);

  topTasks = computed(() => this.taskService.pendingTasks().slice(0, 5));

  goalSummaries = computed(() =>
    this.goalService.goals().filter(g => g.status !== 'completed').slice(0, 5).map(g => ({
      id: g.id,
      title: g.title,
      progress: g.progress,
      icon: { leader: '🧠', business: '📋' }[g.mode] || '🎯',
      color: g.progress >= 70 ? '#00cec9' : g.progress >= 40 ? 'var(--accent)' : '#54a0ff',
    }))
  );

  pipelineValue = computed(() => Math.round(this.salesService.totalPipelineValue()));
  openDeals = computed(() => this.salesService.openDeals().length);

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
}
