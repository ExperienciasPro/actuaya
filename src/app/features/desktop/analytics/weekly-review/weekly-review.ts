import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GoalService } from '../../../../core/services/goal.service';
import { TaskService } from '../../../../core/services/task.service';
import { SalesService } from '../../../../core/services/sales.service';

@Component({
  selector: 'um-weekly-review',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="review-page">
      <div class="page-header animate-fadeInUp">
        <h1>Revisión Semanal</h1>
        <p class="header-subtitle">Reflexiona sobre tu semana y planifica la siguiente.</p>
      </div>

      <!-- Week Score -->
      <div class="score-section animate-fadeInUp stagger-1">
        <div class="score-card">
          <div class="score-ring">
            <span class="score-value">{{ weekScore() }}</span>
            <span class="score-max">/100</span>
          </div>
          <span class="score-label">Score de tu Semana</span>
          <span class="score-desc">{{ getScoreMessage(weekScore()) }}</span>
        </div>
      </div>

      <!-- Achievements -->
      <div class="section animate-fadeInUp stagger-2">
        <h2>🏆 Logros de la Semana</h2>
        <div class="achievements-grid">
          <div class="achievement-card">
            <span class="ach-value">{{ tasksCompletedThisWeek() }}</span>
            <span class="ach-label">Tareas completadas</span>
          </div>
          <div class="achievement-card">
            <span class="ach-value">{{ goalsAdvanced() }}</span>
            <span class="ach-label">Metas avanzadas</span>
          </div>
          <div class="achievement-card">
            <span class="ach-value">{{ dealsClosedThisWeek() }}</span>
            <span class="ach-label">Deals cerrados</span>
          </div>
        </div>
      </div>

      <!-- Wins & Challenges -->
      <div class="two-col animate-fadeInUp stagger-3">
        <div class="col-card wins">
          <h3>✅ Qué salió bien</h3>
          <div class="items-list">
            @if (tasksCompletedThisWeek() > 0) {
              <div class="item">Completaste {{ tasksCompletedThisWeek() }} tareas esta semana</div>
            }
            @if (goalsAdvanced() > 0) {
              <div class="item">Avanzaste en {{ goalsAdvanced() }} metas</div>
            }
            @if (dealsClosedThisWeek() > 0) {
              <div class="item">Cerraste {{ dealsClosedThisWeek() }} deals exitosamente</div>
            }
            @if (tasksCompletedThisWeek() === 0 && goalsAdvanced() === 0) {
              <div class="item muted">Aún no hay logros registrados esta semana</div>
            }
          </div>
        </div>
        <div class="col-card challenges">
          <h3>🔧 Áreas de mejora</h3>
          <div class="items-list">
            @if (pendingTasks() > 5) {
              <div class="item">Tienes {{ pendingTasks() }} tareas pendientes — prioriza</div>
            }
            @if (stalledGoals() > 0) {
              <div class="item">{{ stalledGoals() }} meta(s) sin progreso esta semana</div>
            }
            @if (pendingTasks() <= 5 && stalledGoals() === 0) {
              <div class="item muted">¡Vas por buen camino! Sin problemas detectados</div>
            }
          </div>
        </div>
      </div>

      <!-- Focus for Next Week -->
      <div class="section animate-fadeInUp stagger-4">
        <h2>🎯 Foco para la Siguiente Semana</h2>
        <div class="focus-grid">
          @for (goal of topGoals(); track goal.id) {
            <a class="focus-card" [routerLink]="['/d/goals', goal.id]">
              <span class="focus-icon">{{ goal.icon }}</span>
              <span class="focus-title">{{ goal.title }}</span>
              <div class="focus-bar">
                <div class="focus-fill" [style.width.%]="goal.progress"></div>
              </div>
              <span class="focus-pct">{{ goal.progress }}%</span>
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: 'weekly-review.scss',
})
export class WeeklyReviewComponent {
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);
  private salesService = inject(SalesService);

  private weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  tasksCompletedThisWeek = computed(() =>
    this.taskService.tasks().filter(t =>
      t.completedAt && new Date(t.completedAt) >= this.weekStart
    ).length
  );

  pendingTasks = computed(() =>
    this.taskService.tasks().filter(t => t.status === 'pending' || t.status === 'in_progress').length
  );

  goalsAdvanced = computed(() =>
    this.goalService.goals().filter(g => g.status === 'in_progress' && g.progress > 0).length
  );

  stalledGoals = computed(() =>
    this.goalService.goals().filter(g => g.status === 'in_progress' && g.progress === 0).length
  );

  dealsClosedThisWeek = computed(() =>
    this.salesService.deals().filter(d =>
      d.closedAt && new Date(d.closedAt) >= this.weekStart && d.status === 'won'
    ).length
  );

  weekScore = computed(() => {
    let score = 50;
    score += Math.min(20, this.tasksCompletedThisWeek() * 4);
    score += Math.min(15, this.goalsAdvanced() * 5);
    score += Math.min(15, this.dealsClosedThisWeek() * 5);
    score -= Math.min(20, this.stalledGoals() * 10);
    return Math.max(0, Math.min(100, score));
  });

  topGoals = computed(() =>
    this.goalService.goals()
      .filter(g => g.status !== 'completed')
      .slice(0, 3)
      .map(g => ({
        id: g.id,
        title: g.title,
        progress: g.progress,
        icon: { leader: '🧠', business: '📋' }[g.mode] || '🎯',
      }))
  );

  getScoreMessage(score: number): string {
    if (score >= 80) return '¡Semana excepcional! 🔥';
    if (score >= 60) return 'Buen ritmo, sigue así 💪';
    if (score >= 40) return 'Hay margen de mejora 📈';
    return 'Semana floja, ¡vamos por la próxima! 🚀';
  }
}
