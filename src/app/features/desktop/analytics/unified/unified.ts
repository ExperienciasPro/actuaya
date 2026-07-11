import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GoalService } from '../../../../core/services/goal.service';
import { TaskService } from '../../../../core/services/task.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring';
import { DashboardChartComponent } from '../../../../shared/dashboard-chart.component';

@Component({
  selector: 'um-unified-analytics',
  standalone: true,
  imports: [RouterLink, ProgressRingComponent, DashboardChartComponent],
  template: `
    <div class="analytics-page">

      <!-- Header -->
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <h1>Analítica Productividad</h1>
          <p class="header-subtitle">Metas y Proyectos — rendimiento en una sola vista.</p>
        </div>
        <div class="score-badge" [class]="scoreClass()">
          <span class="score-value">{{ weekScore() }}</span>
          <span class="score-label">Score</span>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid animate-fadeInUp stagger-1">
        <div class="kpi-card">
          <div class="kpi-ring">
            <um-progress-ring [value]="overallGoalProgress()" [size]="56" [strokeWidth]="5" color="#6c5ce7" />
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ overallGoalProgress() }}%</span>
            <span class="kpi-label">Progreso Metas</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-ring">
            <um-progress-ring [value]="overallProjectProgress()" [size]="56" [strokeWidth]="5" color="#00cec9" />
          </div>
          <div class="kpi-info">
            <span class="kpi-value">{{ overallProjectProgress() }}%</span>
            <span class="kpi-label">Progreso Proyectos</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-box goals">🎯</div>
          <div class="kpi-info">
            <span class="kpi-value">{{ totalGoals() }}</span>
            <span class="kpi-label">Metas Activas</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-box projects">📋</div>
          <div class="kpi-info">
            <span class="kpi-value">{{ totalProjects() }}</span>
            <span class="kpi-label">Proyectos</span>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon-box tasks">✅</div>
          <div class="kpi-info">
            <span class="kpi-value">{{ completedProjectTasks() }}/{{ totalProjectTasks() }}</span>
            <span class="kpi-label">Tareas Completadas</span>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row animate-fadeInUp stagger-2">

        <!-- Donut: Metas -->
        <div class="chart-card">
          <h3>Distribución de Metas</h3>
          <div class="donut-wrapper">
            <svg class="donut-chart" viewBox="0 0 120 120">
              @for (seg of goalDonutSegments(); track seg.label) {
                <circle
                  class="donut-segment"
                  cx="60" cy="60" r="50"
                  fill="none"
                  [attr.stroke]="seg.color"
                  stroke-width="16"
                  [attr.stroke-dasharray]="seg.dash"
                  [attr.stroke-dashoffset]="seg.offset"
                  stroke-linecap="round"
                />
              }
              <text x="60" y="56" class="donut-center-value" text-anchor="middle">{{ totalGoals() }}</text>
              <text x="60" y="72" class="donut-center-label" text-anchor="middle">metas</text>
            </svg>
            <div class="donut-legend">
              @for (item of goalDistribution(); track item.label) {
                <div class="legend-item">
                  <span class="legend-dot" [style.background]="item.color"></span>
                  <span class="legend-text">{{ item.label }}</span>
                  <span class="legend-count">{{ item.count }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Donut: Proyectos -->
        <div class="chart-card">
          <h3>Estado de Proyectos</h3>
          <div class="donut-wrapper">
            <svg class="donut-chart" viewBox="0 0 120 120">
              @for (seg of projectDonutSegments(); track seg.label) {
                <circle
                  class="donut-segment"
                  cx="60" cy="60" r="50"
                  fill="none"
                  [attr.stroke]="seg.color"
                  stroke-width="16"
                  [attr.stroke-dasharray]="seg.dash"
                  [attr.stroke-dashoffset]="seg.offset"
                  stroke-linecap="round"
                />
              }
              <text x="60" y="56" class="donut-center-value" text-anchor="middle">{{ totalProjects() }}</text>
              <text x="60" y="72" class="donut-center-label" text-anchor="middle">proyectos</text>
            </svg>
            <div class="donut-legend">
              @for (item of projectDistribution(); track item.label) {
                <div class="legend-item">
                  <span class="legend-dot" [style.background]="item.color"></span>
                  <span class="legend-text">{{ item.label }}</span>
                  <span class="legend-count">{{ item.count }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Summary Card -->
        <div class="chart-card summary-card">
          <div class="summary-section wins">
            <h4>✅ Logros</h4>
            @if (goalsCompleted() > 0) { <p>{{ goalsCompleted() }} meta(s) completadas</p> }
            @if (goalsAdvanced() > 0) { <p>{{ goalsAdvanced() }} meta(s) con avance</p> }
            @if (projectsCompleted() > 0) { <p>{{ projectsCompleted() }} proyecto(s) completado(s)</p> }
            @if (goalsCompleted() === 0 && goalsAdvanced() === 0 && projectsCompleted() === 0) {
              <p class="muted">Sin logros registrados aún</p>
            }
          </div>
          <div class="summary-section challenges">
            <h4>🔧 Áreas de mejora</h4>
            @if (stalledGoals() > 0) { <p>{{ stalledGoals() }} meta(s) estancadas</p> }
            @if (stalledProjects() > 0) { <p>{{ stalledProjects() }} proyecto(s) sin progreso</p> }
            @if (overdueTasks() > 0) { <p>{{ overdueTasks() }} tareas vencidas</p> }
            @if (stalledGoals() === 0 && stalledProjects() === 0 && overdueTasks() === 0) {
              <p class="muted">¡Sin problemas detectados!</p>
            }
          </div>
        </div>
      </div>

      <!-- Bar Chart: Progress by Goal -->
      @if (goalBars().length) {
        <div class="bar-section animate-fadeInUp stagger-3">
          <h2>Progreso por Meta</h2>
          <div class="bar-chart-container">
            @for (bar of goalBars(); track bar.id) {
              <a class="bar-row" [routerLink]="['/d/goals', bar.id]">
                <span class="bar-label">{{ bar.icon }} {{ bar.title }}</span>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="bar.progress" [style.background]="getGradient(bar.progress)">
                    <span class="bar-pct">{{ bar.progress }}%</span>
                  </div>
                </div>
              </a>
            }
          </div>
        </div>
      }

      <!-- Bar Chart: Progress by Project -->
      @if (projectBars().length) {
        <div class="bar-section animate-fadeInUp stagger-3">
          <h2>Progreso por Proyecto</h2>
          <div class="bar-chart-container">
            @for (bar of projectBars(); track bar.id) {
              <a class="bar-row" [routerLink]="['/d/projects', bar.id]">
                <span class="bar-label">📋 {{ bar.name }}</span>
                <div class="bar-track">
                  <div class="bar-fill project" [style.width.%]="bar.progress" [style.background]="getGradient(bar.progress)">
                    <span class="bar-pct">{{ bar.progress }}%</span>
                  </div>
                </div>
                <span class="bar-tasks">{{ bar.completedTasks }}/{{ bar.totalTasks }}</span>
              </a>
            }
          </div>
        </div>
      }

      <!-- Bar Chart: Team Performance -->
      @if (totalProjects() > 0) {
        <div class="bar-section animate-fadeInUp stagger-4">
          <h2>👥 Desempeño del Equipo</h2>
          <p class="bar-section-subtitle">Tareas completadas por cada miembro en todos los proyectos</p>
          @if (memberPerformance().length) {
            <div class="bar-chart-container">
              @for (member of memberPerformance(); track member.name) {
                <div class="bar-row member-row">
                  <div class="member-bar-label">
                    <span class="member-bar-avatar" [style.background]="member.color">{{ member.avatar }}</span>
                    <span class="bar-label">{{ member.name }}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill" [style.width.%]="member.pct" [style.background]="getGradient(member.pct)">
                      <span class="bar-pct">{{ member.pct }}%</span>
                    </div>
                  </div>
                  <span class="bar-tasks">{{ member.completed }}/{{ member.total }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="team-empty-state">
              <span class="team-empty-icon">👥</span>
              <p>Asigna miembros a tus proyectos y tareas para ver su rendimiento aquí.</p>
              <p class="team-empty-hint">Ve a un proyecto → Equipo → Agrega miembros → Asigna tareas</p>
            </div>
          }
        </div>
      }

      <!-- ═══════════════════════════════════════ -->
      <!-- NUEVAS GRÁFICAS ANALÍTICAS             -->
      <!-- ═══════════════════════════════════════ -->

      <!-- 1. Panel Bifocal de Progreso -->
      <div class="advanced-chart-section animate-fadeInUp stagger-5">
        <div class="advanced-chart-header">
          <div>
            <h2>⚖️ Panel Bifocal de Progreso</h2>
            <p class="advanced-chart-subtitle">Equilibrio entre tu crecimiento personal y el avance del negocio</p>
          </div>
        </div>
        @if (bifocalInsight(); as insight) {
          <div class="insight-alert" [class]="insight.type">
            <span class="insight-icon">{{ insight.icon }}</span>
            <span class="insight-text">{{ insight.message }}</span>
          </div>
        }
        <div class="advanced-chart-body">
          <app-dashboard-chart
            type="bar"
            [data]="bifocalChartData()"
            [options]="bifocalChartOptions"
            height="320px"
          />
        </div>
        <div class="bifocal-summary">
          <div class="bifocal-stat">
            <span class="bifocal-dot leader"></span>
            <span class="bifocal-label">Líder</span>
            <span class="bifocal-value">{{ leaderProgress() }}%</span>
          </div>
          <div class="bifocal-stat">
            <span class="bifocal-dot business"></span>
            <span class="bifocal-label">Negocio</span>
            <span class="bifocal-value">{{ businessProgress() }}%</span>
          </div>
          <div class="bifocal-stat">
            <span class="bifocal-dot balance"></span>
            <span class="bifocal-label">Balance</span>
            <span class="bifocal-value">{{ balanceIndex() }}%</span>
          </div>
        </div>
      </div>

      <!-- 2. Velocidad de Fragmentación (Burn-up) -->
      <div class="advanced-chart-section animate-fadeInUp stagger-6">
        <div class="advanced-chart-header">
          <div>
            <h2>🚀 Velocidad de Fragmentación</h2>
            <p class="advanced-chart-subtitle">Micro-pasos creados vs completados — tu motor de avance</p>
          </div>
        </div>
        @if (burnupInsight(); as insight) {
          <div class="insight-alert" [class]="insight.type">
            <span class="insight-icon">{{ insight.icon }}</span>
            <span class="insight-text">{{ insight.message }}</span>
          </div>
        }
        <div class="advanced-chart-body">
          <app-dashboard-chart
            type="line"
            [data]="burnupChartData()"
            [options]="burnupChartOptions"
            height="320px"
          />
        </div>
        <div class="burnup-stats">
          <div class="burnup-stat">
            <span class="burnup-stat-value">{{ totalTasksCreated() }}</span>
            <span class="burnup-stat-label">Micro-pasos creados</span>
          </div>
          <div class="burnup-stat">
            <span class="burnup-stat-value">{{ totalTasksCompleted() }}</span>
            <span class="burnup-stat-label">Completados</span>
          </div>
          <div class="burnup-stat">
            <span class="burnup-stat-value">{{ completionRate() }}%</span>
            <span class="burnup-stat-label">Tasa de finalización</span>
          </div>
        </div>
      </div>

      <!-- 3. Matriz de Consistencia y Contingencia -->
      <div class="advanced-chart-section animate-fadeInUp stagger-7">
        <div class="advanced-chart-header">
          <div>
            <h2>🎯 Matriz de Consistencia</h2>
            <p class="advanced-chart-subtitle">¿Tus acciones mueven la aguja? Consistencia (eje X) vs Impacto real (eje Y)</p>
          </div>
        </div>
        @if (matrixInsight(); as insight) {
          <div class="insight-alert" [class]="insight.type">
            <span class="insight-icon">{{ insight.icon }}</span>
            <span class="insight-text">{{ insight.message }}</span>
          </div>
        }
        <div class="advanced-chart-body">
          <app-dashboard-chart
            type="bubble"
            [data]="matrixChartData()"
            [options]="matrixChartOptions"
            height="380px"
          />
        </div>
        <div class="matrix-legend">
          <div class="matrix-quadrant q1">🏆 Alta consistencia + Alto impacto</div>
          <div class="matrix-quadrant q2">⚠️ Baja consistencia + Alto impacto</div>
          <div class="matrix-quadrant q3">🔄 Alta consistencia + Bajo impacto</div>
          <div class="matrix-quadrant q4">💤 Baja consistencia + Bajo impacto</div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    @use '../../../../../styles/variables' as *;
    @use '../../../../../styles/mixins' as *;

    .analytics-page { max-width: 1200px; margin: 0 auto; }

    /* ─── Header ─── */
    .page-header {
      @include flex-between;
      margin-bottom: $spacing-lg;
      flex-wrap: wrap;
      gap: $spacing-md;
    }
    .header-left h1 { font-size: 1.75rem; font-weight: 700; }
    .header-subtitle { font-size: 0.875rem; color: $color-text-muted; margin-top: 4px; }

    .score-badge {
      display: flex; flex-direction: column; align-items: center;
      padding: 12px 20px; border-radius: $radius-lg;
      min-width: 72px;
    }
    .score-value { font-family: 'Space Grotesk', sans-serif; font-size: 1.75rem; font-weight: 800; }
    .score-label { font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
    .score-great { background: rgba(#00cec9, 0.12); color: #00cec9; }
    .score-good  { background: rgba(#6c5ce7, 0.12); color: #6c5ce7; }
    .score-ok    { background: rgba(#feca57, 0.15); color: #e17055; }
    .score-low   { background: rgba(#d63031, 0.12); color: #d63031; }

    /* ─── KPI Cards ─── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: $spacing-md;
      margin-bottom: $spacing-xl;
    }
    .kpi-card {
      @include card($spacing-md);
      display: flex; align-items: center; gap: $spacing-md;
    }
    .kpi-ring { flex-shrink: 0; }
    .kpi-icon-box {
      width: 56px; height: 56px; border-radius: $radius-lg;
      @include flex-center; font-size: 1.5rem; flex-shrink: 0;
      &.goals    { background: rgba(#6c5ce7, 0.12); }
      &.projects { background: rgba(#00cec9, 0.12); }
      &.tasks    { background: rgba(#feca57, 0.12); }
    }
    .kpi-info { display: flex; flex-direction: column; }
    .kpi-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.25rem; font-weight: 700; color: $color-text-primary;
    }
    .kpi-label { font-size: 0.6875rem; color: $color-text-muted; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }

    /* ─── Charts Row ─── */
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: $spacing-md;
      margin-bottom: $spacing-xl;

      @include mobile-only { grid-template-columns: 1fr; }
    }
    .chart-card {
      @include card($spacing-lg);
      h3 { font-size: 0.9375rem; font-weight: 700; margin-bottom: $spacing-md; }
    }

    /* ─── Donut Chart ─── */
    .donut-wrapper {
      display: flex; flex-direction: column; align-items: center; gap: $spacing-md;
    }
    .donut-chart {
      width: 160px; height: 160px;
      transform: rotate(-90deg);
    }
    .donut-segment { @include smooth; }
    .donut-center-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem; font-weight: 800;
      fill: $color-text-primary;
      transform: rotate(90deg);
      transform-origin: center;
    }
    .donut-center-label {
      font-size: 0.5625rem;
      fill: $color-text-muted;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      transform: rotate(90deg);
      transform-origin: center;
    }
    .donut-legend { width: 100%; }
    .legend-item {
      display: flex; align-items: center; gap: $spacing-xs;
      padding: 4px 0;
      font-size: 0.8125rem;
    }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-text { flex: 1; color: $color-text-secondary; }
    .legend-count { font-weight: 700; font-family: 'Space Grotesk', sans-serif; color: $color-text-primary; }

    /* ─── Summary Card ─── */
    .summary-card {
      display: flex; flex-direction: column; gap: $spacing-md;
    }
    .summary-section {
      padding: $spacing-md;
      border-radius: $radius-md;
      h4 { font-size: 0.875rem; font-weight: 700; margin-bottom: $spacing-sm; }
      p { font-size: 0.8125rem; color: $color-text-secondary; padding: 3px 0; }
      p.muted { color: $color-text-muted; font-style: italic; }
    }
    .wins       { background: rgba(#00cec9, 0.06); }
    .challenges { background: rgba(#feca57, 0.08); }

    /* ─── Bar Chart Section ─── */
    .bar-section {
      @include card($spacing-lg);
      margin-bottom: $spacing-lg;
      h2 { font-size: 1.0625rem; font-weight: 700; margin-bottom: $spacing-lg; }
    }
    .bar-chart-container {
      display: flex; flex-direction: column; gap: $spacing-md;
    }
    .bar-row {
      display: grid;
      grid-template-columns: 160px 1fr auto;
      align-items: center;
      gap: $spacing-md;
      text-decoration: none;
      @include smooth;
      padding: 6px $spacing-sm;
      border-radius: $radius-md;
      &:hover { background: $color-bg-hover; }

      @include mobile-only {
        grid-template-columns: 1fr;
        gap: $spacing-xs;
      }
    }
    .bar-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: $color-text-primary;
      @include text-truncate;
    }
    .bar-track {
      height: 28px;
      background: $color-bg-tertiary;
      border-radius: $radius-full;
      overflow: hidden;
      position: relative;
    }
    .bar-fill {
      height: 100%;
      border-radius: $radius-full;
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 10px;
      min-width: 40px;
      @include smooth;
      animation: barGrow 800ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .bar-pct {
      font-size: 0.6875rem;
      font-weight: 700;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .bar-tasks {
      font-size: 0.75rem;
      color: $color-text-muted;
      font-weight: 600;
      white-space: nowrap;
    }

    .bar-section-subtitle {
      font-size: 0.8125rem;
      color: $color-text-muted;
      margin: -$spacing-sm 0 $spacing-lg 0;
    }

    .member-row {
      grid-template-columns: 180px 1fr auto;
    }
    .member-bar-label {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      min-width: 0;
    }
    .member-bar-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.625rem;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .team-empty-state {
      text-align: center;
      padding: $spacing-xl $spacing-lg;
      p { font-size: 0.875rem; color: $color-text-secondary; margin: 0; }
    }
    .team-empty-icon {
      font-size: 2.5rem;
      display: block;
      margin-bottom: $spacing-sm;
    }
    .team-empty-hint {
      font-size: 0.75rem !important;
      color: $color-text-muted !important;
      margin-top: $spacing-xs !important;
      font-style: italic;
    }

    @keyframes barGrow {
      from { width: 0; }
    }

    /* ═══════════════════════════════════ */
    /* NUEVAS GRÁFICAS ANALÍTICAS         */
    /* ═══════════════════════════════════ */

    .advanced-chart-section {
      @include card($spacing-lg);
      margin-bottom: $spacing-lg;
    }

    .advanced-chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: $spacing-md;
      h2 {
        font-size: 1.125rem;
        font-weight: 700;
        margin: 0;
      }
    }
    .advanced-chart-subtitle {
      font-size: 0.8125rem;
      color: $color-text-muted;
      margin-top: 4px;
    }

    .advanced-chart-body {
      border-radius: $radius-md;
      background: rgba($color-bg-tertiary, 0.4);
      padding: $spacing-md;
      margin-bottom: $spacing-md;
    }

    /* ─── Insight Alerts ─── */
    .insight-alert {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      padding: $spacing-sm $spacing-md;
      border-radius: $radius-md;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: $spacing-md;
      border: 1px solid transparent;

      &.positive {
        background: rgba(#00cec9, 0.08);
        color: #00967d;
        border-color: rgba(#00cec9, 0.2);
      }
      &.warning {
        background: rgba(#ffb822, 0.08);
        color: #c58a00;
        border-color: rgba(#ffb822, 0.2);
      }
      &.danger {
        background: rgba(#e74c3c, 0.08);
        color: #c0392b;
        border-color: rgba(#e74c3c, 0.2);
      }
      &.neutral {
        background: rgba(#8b95a9, 0.08);
        color: $color-text-secondary;
        border-color: rgba(#8b95a9, 0.2);
      }
    }
    .insight-icon { font-size: 1.25rem; }
    .insight-text { flex: 1; line-height: 1.4; }

    /* ─── Bifocal Summary ─── */
    .bifocal-summary {
      display: flex;
      gap: $spacing-lg;
      justify-content: center;
      flex-wrap: wrap;
    }
    .bifocal-stat {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
    }
    .bifocal-dot {
      width: 12px; height: 12px; border-radius: 50%;
      &.leader { background: #6c5ce7; }
      &.business { background: #00cec9; }
      &.balance { background: #feca57; }
    }
    .bifocal-label {
      font-size: 0.8125rem;
      color: $color-text-secondary;
      font-weight: 500;
    }
    .bifocal-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      color: $color-text-primary;
    }

    /* ─── Burn-up Stats ─── */
    .burnup-stats {
      display: flex;
      gap: $spacing-lg;
      justify-content: center;
      flex-wrap: wrap;
    }
    .burnup-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .burnup-stat-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem;
      font-weight: 800;
      color: $color-text-primary;
    }
    .burnup-stat-label {
      font-size: 0.6875rem;
      color: $color-text-muted;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
    }

    /* ─── Matrix Legend ─── */
    .matrix-legend {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: $spacing-sm;
      @include mobile-only { grid-template-columns: 1fr; }
    }
    .matrix-quadrant {
      font-size: 0.75rem;
      color: $color-text-secondary;
      padding: $spacing-xs $spacing-sm;
      border-radius: $radius-sm;
      background: rgba($color-bg-tertiary, 0.5);
      &.q1 { border-left: 3px solid #00cec9; }
      &.q2 { border-left: 3px solid #feca57; }
      &.q3 { border-left: 3px solid #e17055; }
      &.q4 { border-left: 3px solid #8b95a9; }
    }
  `],
})
export class UnifiedAnalyticsComponent {
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);

  // ─── Goals ────────────────────────────
  totalGoals = computed(() => this.goalService.goals().length);
  overallGoalProgress = computed(() => {
    const goals = this.goalService.goals();
    if (!goals.length) return 0;
    return Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length);
  });

  goalDistribution = computed(() => {
    const goals = this.goalService.goals();
    return [
      { label: 'En progreso', count: goals.filter(g => g.status === 'in_progress').length, color: '#6c5ce7' },
      { label: 'Completadas', count: goals.filter(g => g.status === 'completed').length, color: '#00cec9' },
      { label: 'Sin iniciar', count: goals.filter(g => g.status === 'not_started').length, color: '#8b95a9' },
      { label: 'Pausadas', count: goals.filter(g => g.status === 'paused').length, color: '#feca57' },
    ];
  });

  goalsCompleted = computed(() => this.goalService.goals().filter(g => g.status === 'completed').length);
  goalsAdvanced = computed(() => this.goalService.goals().filter(g => g.status === 'in_progress' && g.progress > 0).length);
  stalledGoals = computed(() => this.goalService.goals().filter(g => g.status === 'in_progress' && g.progress === 0).length);

  goalBars = computed(() =>
    this.goalService.goals().map(g => ({
      id: g.id,
      title: g.title,
      icon: { leader: '🧠', business: '📋' }[g.mode] || '🎯',
      progress: g.progress,
    })).sort((a, b) => b.progress - a.progress)
  );

  // ─── Projects ─────────────────────────
  totalProjects = computed(() => this.projectService.projects().length);
  overallProjectProgress = computed(() => {
    const projects = this.projectService.projects();
    if (!projects.length) return 0;
    return Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length);
  });

  totalProjectTasks = computed(() =>
    this.projectService.projects().reduce((s, p) => s + p.tasks.length, 0)
  );
  completedProjectTasks = computed(() =>
    this.projectService.projects().reduce((s, p) => s + p.tasks.filter(t => t.completed).length, 0)
  );

  projectDistribution = computed(() => {
    const projects = this.projectService.projects();
    return [
      { label: 'Activos', count: projects.filter(p => p.status === 'active').length, color: '#6c5ce7' },
      { label: 'Completados', count: projects.filter(p => p.status === 'completed').length, color: '#00cec9' },
      { label: 'Planificación', count: projects.filter(p => p.status === 'planning').length, color: '#8b95a9' },
      { label: 'En pausa', count: projects.filter(p => p.status === 'on_hold').length, color: '#feca57' },
    ];
  });

  projectsCompleted = computed(() => this.projectService.projects().filter(p => p.status === 'completed').length);
  stalledProjects = computed(() => this.projectService.projects().filter(p => p.status === 'active' && p.progress === 0).length);
  overdueTasks = computed(() => {
    const now = new Date().toISOString().slice(0, 10);
    return this.projectService.projects().reduce((s, p) =>
      s + p.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < now).length, 0);
  });

  projectBars = computed(() =>
    this.projectService.projects().map(p => ({
      id: p.id,
      name: p.name,
      progress: p.progress,
      totalTasks: p.tasks.length,
      completedTasks: p.tasks.filter(t => t.completed).length,
    })).sort((a, b) => b.progress - a.progress)
  );

  // ─── Donut Segment Calculations ───────
  private readonly CIRCUMFERENCE = 2 * Math.PI * 50; // r=50

  goalDonutSegments = computed(() => this.calcDonut(this.goalDistribution()));
  projectDonutSegments = computed(() => this.calcDonut(this.projectDistribution()));

  private calcDonut(items: { label: string; count: number; color: string }[]) {
    const total = items.reduce((s, i) => s + i.count, 0);
    if (!total) return [{ label: 'empty', color: 'rgba(139,149,169,0.2)', dash: `${this.CIRCUMFERENCE} ${this.CIRCUMFERENCE}`, offset: '0' }];

    let offset = 0;
    return items
      .filter(i => i.count > 0)
      .map(i => {
        const pct = i.count / total;
        const len = pct * this.CIRCUMFERENCE;
        const gap = this.CIRCUMFERENCE - len;
        const seg = { label: i.label, color: i.color, dash: `${len} ${gap}`, offset: `${-offset}` };
        offset += len;
        return seg;
      });
  }

  // ─── Score ────────────────────────────
  weekScore = computed(() => {
    let score = 50;
    score += Math.min(20, this.goalsAdvanced() * 5);
    score += Math.min(15, this.goalsCompleted() * 10);
    score += Math.min(15, this.projectsCompleted() * 10);
    score -= Math.min(20, this.stalledGoals() * 10);
    score -= Math.min(10, this.stalledProjects() * 5);
    return Math.max(0, Math.min(100, score));
  });

  scoreClass = computed(() => {
    const s = this.weekScore();
    if (s >= 80) return 'score-great';
    if (s >= 60) return 'score-good';
    if (s >= 40) return 'score-ok';
    return 'score-low';
  });

  // ─── Team Performance ────────────────
  memberPerformance = computed(() => {
    const projects = this.projectService.projects();
    const memberMap = new Map<string, { name: string; color: string; avatar: string; total: number; completed: number }>();

    for (const p of projects) {
      for (const task of p.tasks) {
        if (!task.assignee) continue;
        if (!memberMap.has(task.assignee)) {
          const member = (p.members || []).find(m => m.name === task.assignee);
          memberMap.set(task.assignee, {
            name: task.assignee,
            color: member?.color || '#8b95a9',
            avatar: member?.avatar || task.assignee.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
            total: 0,
            completed: 0,
          });
        }
        const entry = memberMap.get(task.assignee)!;
        entry.total++;
        if (task.completed) entry.completed++;
      }
    }

    return Array.from(memberMap.values())
      .map(m => ({ ...m, pct: m.total ? Math.round(m.completed / m.total * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct || b.total - a.total);
  });

  getGradient(progress: number): string {
    if (progress >= 80) return 'linear-gradient(90deg, #00cec9, #55efc4)';
    if (progress >= 50) return 'linear-gradient(90deg, #6c5ce7, #a29bfe)';
    if (progress >= 25) return 'linear-gradient(90deg, #54a0ff, #74b9ff)';
    return 'linear-gradient(90deg, #8b95a9, #b2bec3)';
  }

  // ═══════════════════════════════════════
  // 1. PANEL BIFOCAL DE PROGRESO
  // ═══════════════════════════════════════

  leaderProgress = computed(() => {
    const leaders = this.goalService.goals().filter(g => g.mode === 'leader');
    if (!leaders.length) return 0;
    return Math.round(leaders.reduce((s, g) => s + g.progress, 0) / leaders.length);
  });

  businessProgress = computed(() => {
    const biz = this.goalService.goals().filter(g => g.mode === 'business');
    if (!biz.length) return 0;
    return Math.round(biz.reduce((s, g) => s + g.progress, 0) / biz.length);
  });

  balanceIndex = computed(() => {
    const l = this.leaderProgress();
    const b = this.businessProgress();
    if (l === 0 && b === 0) return 0;
    const max = Math.max(l, b);
    const min = Math.min(l, b);
    return max > 0 ? Math.round((min / max) * 100) : 0;
  });

  bifocalInsight = computed<{ icon: string; message: string; type: string } | null>(() => {
    const l = this.leaderProgress();
    const b = this.businessProgress();
    const diff = Math.abs(l - b);
    const goals = this.goalService.goals();
    const hasLeader = goals.some(g => g.mode === 'leader');
    const hasBiz = goals.some(g => g.mode === 'business');

    if (!hasLeader && !hasBiz) return { icon: '💡', message: 'Crea metas de Líder y Negocio para ver tu equilibrio.', type: 'neutral' };
    if (!hasLeader) return { icon: '⚠️', message: 'No tienes metas de crecimiento personal. El equilibrio es clave para evitar el burnout.', type: 'warning' };
    if (!hasBiz) return { icon: '⚠️', message: 'No tienes metas de negocio. Tu crecimiento personal necesita aplicarse en resultados.', type: 'warning' };

    if (diff >= 40) {
      if (l > b) {
        return { icon: '🔥', message: `Tus metas personales avanzan al ${l}%, pero el negocio está en ${b}%. Riesgo de desconexión con resultados.`, type: 'warning' };
      } else {
        return { icon: '🔥', message: `Tu negocio avanza al ${b}%, pero tus metas de líder están en ${l}%. Riesgo de burnout detectado.`, type: 'danger' };
      }
    }
    if (diff <= 15 && l > 0 && b > 0) {
      return { icon: '✨', message: '¡Excelente equilibrio! Tu crecimiento personal y tu negocio avanzan a la par.', type: 'positive' };
    }
    return null;
  });

  bifocalChartData = computed(() => {
    const goals = this.goalService.goals();
    const leaderGoals = goals.filter(g => g.mode === 'leader');
    const bizGoals = goals.filter(g => g.mode === 'business');

    // Get unique goal titles for labels
    const allTitles: string[] = [];
    const leaderData: number[] = [];
    const bizData: number[] = [];

    // Build paired data
    const maxLen = Math.max(leaderGoals.length, bizGoals.length);
    for (let i = 0; i < maxLen; i++) {
      const lg = leaderGoals[i];
      const bg = bizGoals[i];
      if (lg && bg) {
        allTitles.push(this.truncate(lg.title, 12) + ' / ' + this.truncate(bg.title, 12));
      } else if (lg) {
        allTitles.push(this.truncate(lg.title, 20));
      } else if (bg) {
        allTitles.push(this.truncate(bg.title, 20));
      }
      leaderData.push(lg ? lg.progress : 0);
      bizData.push(bg ? bg.progress : 0);
    }

    // Fallback if no goals
    if (!allTitles.length) {
      allTitles.push('Sin metas');
      leaderData.push(0);
      bizData.push(0);
    }

    return {
      labels: allTitles,
      datasets: [
        {
          label: '🧠 Líder',
          data: leaderData,
          backgroundColor: 'rgba(108, 92, 231, 0.7)',
          borderColor: '#6c5ce7',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.6,
        },
        {
          label: '📋 Negocio',
          data: bizData,
          backgroundColor: 'rgba(0, 206, 201, 0.7)',
          borderColor: '#00cec9',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.7,
          categoryPercentage: 0.6,
        },
      ],
    };
  });

  bifocalChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v: any) => v + '%', color: '#8fa8b0', font: { size: 11 } },
        grid: { color: 'rgba(0,40,30,0.06)' },
      },
      x: {
        ticks: { color: '#8fa8b0', font: { size: 10 }, maxRotation: 45 },
        grid: { display: false },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#5a7a84', usePointStyle: true, pointStyle: 'rectRounded', padding: 16, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: 'rgba(26,46,53,0.9)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}%` },
      },
    },
  };

  // ═══════════════════════════════════════
  // 2. VELOCIDAD DE FRAGMENTACIÓN (BURN-UP)
  // ═══════════════════════════════════════

  totalTasksCreated = computed(() => this.taskService.tasks().length);
  totalTasksCompleted = computed(() => this.taskService.tasks().filter(t => t.status === 'completed').length);
  completionRate = computed(() => {
    const total = this.totalTasksCreated();
    if (!total) return 0;
    return Math.round((this.totalTasksCompleted() / total) * 100);
  });

  burnupInsight = computed<{ icon: string; message: string; type: string } | null>(() => {
    const total = this.totalTasksCreated();
    const completed = this.totalTasksCompleted();
    if (total === 0) return { icon: '💡', message: 'Crea micro-pasos en tus metas para visualizar tu velocidad de avance.', type: 'neutral' };
    const rate = this.completionRate();
    if (rate >= 80) return { icon: '🎉', message: `¡Impresionante! Has completado el ${rate}% de tus micro-pasos. La fragmentación está funcionando.`, type: 'positive' };
    if (rate >= 50) return { icon: '📈', message: `Vas bien: ${completed} de ${total} micro-pasos completados. ¡Sigue fragmentando!`, type: 'positive' };
    if (rate >= 20) return { icon: '💪', message: `Has completado ${completed} de ${total} micro-pasos. Cada uno te acerca más a tus metas.`, type: 'neutral' };
    return { icon: '🔔', message: `Solo ${completed} de ${total} micro-pasos completados. Enfócate en completar los que ya tienes.`, type: 'warning' };
  });

  burnupChartData = computed(() => {
    const tasks = this.taskService.tasks();
    if (!tasks.length) {
      return {
        labels: ['Hoy'],
        datasets: [
          { label: 'Creados', data: [0], borderColor: '#6c5ce7', backgroundColor: 'rgba(108,92,231,0.05)', fill: false, tension: 0.3, pointRadius: 4 },
          { label: 'Completados', data: [0], borderColor: '#00cec9', backgroundColor: 'rgba(0,206,201,0.15)', fill: true, tension: 0.3, pointRadius: 4 },
        ],
      };
    }

    // Build daily cumulative data for last 30 days
    const now = new Date();
    const days = 30;
    const labels: string[] = [];
    const createdCumulative: number[] = [];
    const completedCumulative: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      labels.push(label);

      const created = tasks.filter(t => {
        const cd = new Date(t.createdAt).toISOString().slice(0, 10);
        return cd <= dayStr;
      }).length;

      const completed = tasks.filter(t => {
        if (t.status !== 'completed' || !t.completedAt) return false;
        const cd = new Date(t.completedAt).toISOString().slice(0, 10);
        return cd <= dayStr;
      }).length;

      createdCumulative.push(created);
      completedCumulative.push(completed);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Total creados',
          data: createdCumulative,
          borderColor: '#6c5ce7',
          backgroundColor: 'rgba(108,92,231,0.05)',
          borderWidth: 2.5,
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: 'Completados',
          data: completedCumulative,
          borderColor: '#00cec9',
          backgroundColor: 'rgba(0,206,201,0.12)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    };
  });

  burnupChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#8fa8b0', font: { size: 11 }, stepSize: 1 },
        grid: { color: 'rgba(0,40,30,0.06)' },
        title: { display: true, text: 'Micro-pasos', color: '#8fa8b0', font: { size: 11 } },
      },
      x: {
        ticks: { color: '#8fa8b0', font: { size: 10 }, maxTicksLimit: 10 },
        grid: { display: false },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#5a7a84', usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(26,46,53,0.9)',
      },
    },
    interaction: { mode: 'index' as const, intersect: false },
  };

  // ═══════════════════════════════════════
  // 3. MATRIZ DE CONSISTENCIA Y CONTINGENCIA
  // ═══════════════════════════════════════

  matrixGoalData = computed(() => {
    const goals = this.goalService.goals();
    return goals.map(g => {
      const tasks = this.taskService.getByGoalId(g.id);
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const consistency = total > 0 ? Math.round((completed / total) * 100) : 0;
      const impact = g.progress;
      return {
        title: g.title,
        mode: g.mode,
        consistency,
        impact,
        taskCount: total,
      };
    });
  });

  matrixInsight = computed<{ icon: string; message: string; type: string } | null>(() => {
    const data = this.matrixGoalData();
    if (!data.length) return { icon: '💡', message: 'Crea metas con micro-pasos para ver la matriz de consistencia.', type: 'neutral' };

    // Detect goals with high consistency but low impact
    const ineffective = data.filter(d => d.consistency >= 60 && d.impact < 30 && d.taskCount > 0);
    if (ineffective.length > 0) {
      const names = ineffective.map(d => `"${d.title}"`).join(', ');
      return {
        icon: '🔄',
        message: `${names}: alta consistencia pero bajo impacto. Considera reestructurar tu "Intención de Implementación" para acciones más efectivas.`,
        type: 'warning',
      };
    }

    // Detect goals with low consistency but high impact
    const lucky = data.filter(d => d.consistency < 30 && d.impact >= 60 && d.taskCount > 0);
    if (lucky.length > 0) {
      return {
        icon: '⚠️',
        message: `Algunas metas avanzan sin completar micro-pasos. Asegúrate de que el progreso real se refleje en tus acciones diarias.`,
        type: 'neutral',
      };
    }

    const highPerformers = data.filter(d => d.consistency >= 60 && d.impact >= 60);
    if (highPerformers.length > 0) {
      return { icon: '🏆', message: `¡${highPerformers.length} meta(s) en la zona ideal! Tu plan de acción está funcionando.`, type: 'positive' };
    }

    return null;
  });

  matrixChartData = computed(() => {
    const data = this.matrixGoalData();
    const leaderBubbles = data.filter(d => d.mode === 'leader').map(d => ({
      x: d.consistency,
      y: d.impact,
      r: Math.max(6, Math.min(20, d.taskCount * 3)),
      label: d.title,
    }));
    const bizBubbles = data.filter(d => d.mode === 'business').map(d => ({
      x: d.consistency,
      y: d.impact,
      r: Math.max(6, Math.min(20, d.taskCount * 3)),
      label: d.title,
    }));

    return {
      datasets: [
        {
          label: '🧠 Líder',
          data: leaderBubbles,
          backgroundColor: 'rgba(108, 92, 231, 0.5)',
          borderColor: '#6c5ce7',
          borderWidth: 1.5,
        },
        {
          label: '📋 Negocio',
          data: bizBubbles,
          backgroundColor: 'rgba(0, 206, 201, 0.5)',
          borderColor: '#00cec9',
          borderWidth: 1.5,
        },
      ],
    };
  });

  matrixChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        min: 0, max: 100,
        title: { display: true, text: 'Consistencia (%)', color: '#8fa8b0', font: { size: 12 } },
        ticks: { callback: (v: any) => v + '%', color: '#8fa8b0', font: { size: 10 } },
        grid: { color: 'rgba(0,40,30,0.06)' },
      },
      y: {
        min: 0, max: 100,
        title: { display: true, text: 'Impacto / Avance (%)', color: '#8fa8b0', font: { size: 12 } },
        ticks: { callback: (v: any) => v + '%', color: '#8fa8b0', font: { size: 10 } },
        grid: { color: 'rgba(0,40,30,0.06)' },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#5a7a84', usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: 'rgba(26,46,53,0.9)',
        callbacks: {
          label: (ctx: any) => {
            const d = ctx.raw;
            return `${d.label || ctx.dataset.label}: Consistencia ${d.x}%, Impacto ${d.y}%`;
          },
        },
      },
    },
  };

  // ─── Helpers ──────────────────────────
  private truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
  }
}
