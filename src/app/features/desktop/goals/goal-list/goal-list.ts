import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { NgTemplateOutlet } from '@angular/common';
import { GoalService } from '../../../../core/services/goal.service';
import { TaskService } from '../../../../core/services/task.service';
import { DataSyncService } from '../../../../core/services/data-sync.service';
import { Goal, GoalStatus, GoalMode } from '../../../../core/models/goal.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';
@Component({
  selector: 'um-goal-list',
  standalone: true,
  imports: [
    RouterLink,
    SlicePipe,
    NgTemplateOutlet,
    StatusBadgeComponent,
    ProgressRingComponent,
    EmptyStateComponent,
    ConfirmDialogComponent,
    TimeAgoPipe,
    UmIconComponent,
  ],
  template: `
    <div class="goal-list-page">
      <!-- Header -->
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <h1>Metas</h1>
          <p class="header-subtitle">{{ goals().length }} metas · {{ activeCount() }} activas</p>
        </div>
        <div class="header-actions">
          <a class="btn-primary" routerLink="/d/goals/new">
            <span>+</span> Nueva Meta
          </a>
        </div>
      </div>

      <!-- ═══════════════════════════════ -->
      <!-- LIST VIEW                      -->
      <!-- ═══════════════════════════════ -->
        <!-- Filters -->
        <div class="filters-bar animate-fadeInUp stagger-1">

          <div class="filter-group">
            <button
              class="filter-chip mode"
              [class.active]="filterMode() === 'all'"
              (click)="filterMode.set('all')"
            >Todos</button>
            <button
              class="filter-chip mode"
              [class.active]="filterMode() === 'leader'"
              (click)="filterMode.set('leader')"
            >
              <um-icon name="user" [size]="16"></um-icon> Líder
              <div class="chip-inline-progress">
                <div class="chip-inline-fill" [style.width.%]="leaderProgress()"></div>
              </div>
            </button>
            <button
              class="filter-chip mode"
              [class.active]="filterMode() === 'business'"
              (click)="filterMode.set('business')"
            >
              <um-icon name="board" [size]="16"></um-icon> Negocio
              <div class="chip-inline-progress">
                <div class="chip-inline-fill" [style.width.%]="businessProgress()"></div>
              </div>
            </button>
          </div>
        </div>

        <!-- Goal Grid -->
        @if (filteredGoals().length) {
          <div class="goal-grid">
            @for (goal of filteredGoals(); track goal.id; let i = $index) {
              <div class="goal-card animate-fadeInUp" [style.animation-delay.ms]="i * 50" [routerLink]="['/d/goals', goal.id]" style="cursor: pointer;">
                <div class="card-top">
                  <div class="card-top-left">
                    <span class="mode-tag"><um-icon [name]="getModeIcon(goal.mode)" [size]="14"></um-icon> {{ getModeName(goal.mode) }}</span>
                  </div>
                  <div class="card-top-right" style="display: flex; gap: 8px; align-items: center;">
                    <um-status-badge [variant]="goal.status" />
                    <button class="action-btn danger" (click)="$event.stopPropagation(); confirmDelete(goal)" title="Eliminar" style="width: 28px; height: 28px; font-size: 0.8rem; border: none; background: transparent; cursor: pointer;">
                      <um-icon name="trash" [size]="16"></um-icon>
                    </button>
                  </div>
                </div>

                <h3 class="goal-title" style="margin: 0;">{{ goal.title }}</h3>

                @if (goal.intentionAction) {
                  <p class="goal-desc">{{ goal.intentionAction | slice:0:90 }}{{ goal.intentionAction.length > 90 ? '...' : '' }}</p>
                }

                <div class="goal-progress-section linear">
                  <div class="progress-details">
                    <span class="progress-value">{{ goal.progress }}%</span>
                  </div>
                  <div class="progress-bar-inline">
                    <div class="progress-bar-track">
                      <div class="progress-bar-fill" [style.width.%]="goal.progress" [style.background]="getProgressGradient(goal.progress)"></div>
                    </div>
                  </div>
                </div>

                @if (goal.tags.length) {
                  <div class="card-meta">
                    <div class="tags-row">
                      @for (tag of goal.tags.slice(0, 3); track tag) {
                        <span class="tag-chip">{{ tag }}</span>
                      }
                    </div>
                  </div>
                }

              </div>
            }
          </div>
        } @else {
          <um-empty-state
            [icon]="filterStatus() !== 'all' || filterMode() !== 'all' ? '🔍' : '🎯'"
            [title]="filterStatus() !== 'all' || filterMode() !== 'all' ? 'Sin resultados' : 'Sin metas aún'"
            [subtitle]="filterStatus() !== 'all' || filterMode() !== 'all' ? 'Prueba cambiando los filtros.' : 'Crea tu primera meta para empezar tu camino.'"
          >
            @if (filterStatus() === 'all' && filterMode() === 'all') {
              <a class="btn-primary" routerLink="/d/goals/new">+ Crear mi primera meta</a>
            }
          </um-empty-state>
        }


      <!-- Delete Confirmation -->
      <um-confirm-dialog
        [open]="showDeleteDialog()"
        title="Eliminar meta"
        [message]="deleteMessage()"
        icon="🗑️"
        confirmLabel="Eliminar"
        variant="danger"
        (confirmed)="executeDelete()"
        (cancelled)="showDeleteDialog.set(false)"
      />
    </div>
  `,
  styleUrl: 'goal-list.scss',
})
export class GoalListComponent {
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);
  private dataSync = inject(DataSyncService);

  goals = this.goalService.goals;
  activeCount = computed(() => this.goalService.activeGoals().length);

  // — List filters —
  filterStatus = signal<GoalStatus | 'all'>('all');
  filterMode = signal<GoalMode | 'all'>('all');

  showDeleteDialog = signal(false);
  deletingGoal = signal<Goal | null>(null);

  deleteMessage = computed(() => {
    const g = this.deletingGoal();
    return g ? 'Esta acción eliminará la meta de forma permanente.' : '';
  });

  filteredGoals = computed(() => {
    let result = this.goals();
    const status = this.filterStatus();
    const mode = this.filterMode();

    if (status !== 'all') {
      result = result.filter((g) => g.status === status);
    }
    if (mode !== 'all') {
      result = result.filter((g) => g.mode === mode);
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });

  leaderProgress = computed(() => {
    const leaderGoals = this.goals().filter(g => g.mode === 'leader');
    if (!leaderGoals.length) return 0;
    const total = leaderGoals.reduce((sum, g) => sum + (g.progress || 0), 0);
    return Math.round(total / leaderGoals.length);
  });

  businessProgress = computed(() => {
    const businessGoals = this.goals().filter(g => g.mode === 'business');
    if (!businessGoals.length) return 0;
    const total = businessGoals.reduce((sum, g) => sum + (g.progress || 0), 0);
    return Math.round(total / businessGoals.length);
  });



  // — Shared helpers —
  getModeIcon(mode: GoalMode): string {
    return { leader: 'user', business: 'board' }[mode];
  }

  getModeName(mode: GoalMode): string {
    return { leader: 'Líder', business: 'Negocio' }[mode];
  }

  getTaskCount(goalId: string): number {
    return this.taskService.getByGoalId(goalId).length;
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return '#00cec9';
    if (progress >= 50) return '#6c5ce7';
    if (progress >= 20) return '#54a0ff';
    return '#8b95a9';
  }

  getProgressGradient(progress: number): string {
    if (progress >= 80) return 'linear-gradient(90deg, #00cec9, #55efc4)';
    if (progress >= 50) return 'linear-gradient(90deg, #6c5ce7, #a29bfe)';
    return 'linear-gradient(90deg, #54a0ff, #74b9ff)';
  }

  togglePause(goal: Goal): void {
    if (goal.status === 'paused') {
      this.goalService.update(goal.id, { status: 'in_progress' });
    } else {
      this.goalService.update(goal.id, { status: 'paused' });
    }
  }

  confirmDelete(goal: Goal): void {
    this.deletingGoal.set(goal);
    this.showDeleteDialog.set(true);
  }

  executeDelete(): void {
    const goal = this.deletingGoal();
    if (goal) {
      this.goalService.delete(goal.id);
      // Push deletion to server immediately (bypass 300ms debounce)
      this.dataSync.saveToServerImmediate();
    }
    this.showDeleteDialog.set(false);
    this.deletingGoal.set(null);
  }
}
