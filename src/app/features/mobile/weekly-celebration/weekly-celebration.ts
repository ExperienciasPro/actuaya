import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../../core/services/task.service';
import { GoalService } from '../../../core/services/goal.service';
import { SalesService } from '../../../core/services/sales.service';

@Component({
  selector: 'um-weekly-celebration',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="celebration-screen">
      <!-- Hero -->
      <div class="celeb-hero animate-fadeInUp">
        <div class="confetti-bg">
          @for (i of confettiDots; track i) {
            <span class="confetti-dot" [style.left.%]="i * 10" [style.animation-delay]="i * 0.15 + 's'"></span>
          }
        </div>
        <span class="trophy">🏆</span>
        <h1>Resumen Semanal</h1>
        <p class="hero-sub">{{ getMotivation(weekScore()) }}</p>
      </div>

      <!-- Score -->
      <div class="score-card animate-fadeInUp stagger-1">
        <div class="score-circle" [class]="scoreClass()">
          <span class="score-num">{{ weekScore() }}</span>
          <span class="score-of">/100</span>
        </div>
        <span class="score-title">Tu Score Semanal</span>
      </div>

      <!-- Achievements -->
      <div class="achievements animate-fadeInUp stagger-2">
        @for (ach of achievements(); track ach.label) {
          <div class="ach-card" [class.achieved]="ach.value > 0">
            <span class="ach-emoji">{{ ach.emoji }}</span>
            <span class="ach-value">{{ ach.value }}</span>
            <span class="ach-label">{{ ach.label }}</span>
          </div>
        }
      </div>

      <!-- Goals Progress -->
      @if (goalProgress().length) {
        <div class="goals-section animate-fadeInUp stagger-3">
          <h2>Progreso de Metas</h2>
          @for (g of goalProgress(); track g.id) {
            <div class="goal-row">
              <span class="gr-icon">{{ g.icon }}</span>
              <span class="gr-name">{{ g.title }}</span>
              <div class="gr-bar">
                <div class="gr-fill" [style.width.%]="g.progress" [style.background]="g.color"></div>
              </div>
              <span class="gr-pct">{{ g.progress }}%</span>
            </div>
          }
        </div>
      }

      <!-- Motivation -->
      <div class="motivation-card animate-fadeInUp stagger-4">
        <span class="motiv-quote">"{{ motivationalQuote() }}"</span>
      </div>

      <!-- CTA -->
      <a class="new-week-btn animate-fadeInUp stagger-5" routerLink="/m/today">
        🚀 Empezar nueva semana
      </a>
    </div>
  `,
  styleUrl: 'weekly-celebration.scss',
})
export class WeeklyCelebrationComponent {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);
  private salesService = inject(SalesService);

  confettiDots = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  private weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  private tasksCompleted = computed(() =>
    this.taskService.tasks().filter(t =>
      t.completedAt && new Date(t.completedAt) >= this.weekStart
    ).length
  );

  private goalsAdvanced = computed(() =>
    this.goalService.goals().filter(g => g.status === 'in_progress' && g.progress > 0).length
  );

  private dealsClosed = computed(() =>
    this.salesService.deals().filter(d =>
      d.closedAt && new Date(d.closedAt) >= this.weekStart && d.status === 'won'
    ).length
  );

  weekScore = computed(() => {
    let s = 50;
    s += Math.min(20, this.tasksCompleted() * 4);
    s += Math.min(15, this.goalsAdvanced() * 5);
    s += Math.min(15, this.dealsClosed() * 5);
    return Math.max(0, Math.min(100, s));
  });

  scoreClass = computed(() => {
    const s = this.weekScore();
    if (s >= 80) return 'excellent';
    if (s >= 60) return 'good';
    if (s >= 40) return 'fair';
    return 'low';
  });

  achievements = computed(() => [
    { emoji: '✅', value: this.tasksCompleted(), label: 'Tareas completadas' },
    { emoji: '🎯', value: this.goalsAdvanced(), label: 'Metas avanzadas' },
    { emoji: '💰', value: this.dealsClosed(), label: 'Deals cerrados' },
    { emoji: '🔥', value: this.getStreak(), label: 'Días seguidos' },
  ]);

  goalProgress = computed(() =>
    this.goalService.goals().slice(0, 4).map(g => ({
      id: g.id,
      title: g.title,
      progress: g.progress,
      icon: { leader: '🧠', business: '📋' }[g.mode] || '🎯',
      color: g.progress >= 70 ? '#00cec9' : g.progress >= 40 ? 'var(--accent)' : '#54a0ff',
    }))
  );

  motivationalQuote = computed(() => {
    const quotes = [
      'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
      'No cuentes los días, haz que los días cuenten.',
      'La disciplina supera al talento cuando el talento no se disciplina.',
      'Cada paso cuenta, sigue avanzando.',
      'Tu futuro se construye con lo que haces hoy.',
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  });

  getStreak(): number {
    const tasks = this.taskService.tasks().filter(t => t.completedAt);
    if (!tasks.length) return 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const check = new Date(today);
      check.setDate(check.getDate() - i);
      const hasActivity = tasks.some(t => {
        const d = new Date(t.completedAt!);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === check.getTime();
      });
      if (hasActivity) streak++;
      else if (i > 0) break;
    }
    return streak;
  }

  getMotivation(score: number): string {
    if (score >= 80) return '¡Semana INCREÍBLE! 🔥🔥🔥';
    if (score >= 60) return '¡Gran semana! Sigue así 💪';
    if (score >= 40) return 'Buena base, va por más 📈';
    return '¡La próxima será mejor! 🚀';
  }
}
