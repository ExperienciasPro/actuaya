import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { GoalService } from '../../../core/services/goal.service';
import { TaskService } from '../../../core/services/task.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { StorageService } from '../../../core/services/storage.service';
import { SalesService } from '../../../core/services/sales.service';
import { CashflowService } from '../../../core/services/cashflow.service';
import { FinanceService } from '../../../core/services/finance.service';
import { InventoryService } from '../../../core/services/inventory.service';

import { RadarService } from '../../../core/services/radar.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { MenuService } from '../../../core/services/menu.service';
import { ShiftsService } from '../../../core/services/shifts.service';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';

@Component({
  selector: 'um-dashboard',
  standalone: true,
  imports: [RouterLink, UpperCasePipe, DecimalPipe, UmIconComponent],
  template: `
    <div class="dashboard">

      <!-- Welcome Section -->
      <section class="welcome-section animate-fadeInUp">
        <div class="welcome-text">
          <h1>{{ greeting() }}</h1>
          <p class="subtitle">{{ dateString() }}</p>
        </div>
      </section>

      <!-- Dynamic KPI Grid -->
      <section class="kpi-grid">
        @for (kpi of kpiCards(); track kpi.id; let i = $index) {
          <a class="kpi-card animate-fadeInUp" [routerLink]="kpi.route"
             [style.animation-delay.ms]="100 + i * 80">
            <div class="kpi-header">
              <span class="kpi-icon" [style.background]="kpi.bgColor">{{ kpi.icon }}</span>
              <span class="kpi-trend" [class.up]="kpi.trendUp">{{ kpi.trendLabel }}</span>
            </div>
            <div class="kpi-value">{{ kpi.value }}</div>
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-bar">
              <div class="kpi-bar-fill" [style.width.%]="kpi.barPct" [style.background]="kpi.barColor"></div>
            </div>
          </a>
        }
      </section>

      <!-- Main Content Grid - Dynamically populated -->
      <section class="content-grid">

        <!-- Focus Task — always visible -->
        <div class="dash-card focus-card animate-fadeInUp stagger-5">
          <div class="card-header">
            <h3>🔥 Enfoque del Día</h3>
          </div>
          <div class="card-body">
            @if (focusTask(); as task) {
              <div class="focus-task">
                <div class="focus-priority" [class]="task.priority">{{ task.priority | uppercase }}</div>
                <h4 class="focus-title">{{ task.title }}</h4>
                @if (task.description) {
                  <p class="focus-description">{{ task.description }}</p>
                }
                <div class="focus-meta">
                  @if (task.estimatedMinutes) {
                    <span class="meta-chip">⏱️ {{ task.estimatedMinutes }} min</span>
                  }
                  <span class="meta-chip">📎 {{ task.goalId ? 'Vinculada' : 'Sin meta' }}</span>
                </div>
              </div>
            } @else {
              <div class="empty-state">
                <span class="empty-icon">🧘</span>
                <p>No hay tareas pendientes.</p>
                <p class="text-muted">¡Crea una meta para empezar!</p>
              </div>
            }
          </div>
        </div>

        <!-- Active Goals Summary -->
        @if (hasModule('goals')) {
          <div class="dash-card animate-fadeInUp stagger-6">
            <div class="card-header">
              <h3>🎯 Metas Activas</h3>
              <a class="card-link" routerLink="/d/goals">Ver todas →</a>
            </div>
            <div class="card-body">
              @if (activeGoals().length) {
                <div class="goal-list">
                  @for (goal of activeGoals().slice(0, 5); track goal.id) {
                    <a class="goal-item" [routerLink]="['/d/goals', goal.id]">
                      <div class="goal-info">
                        <span class="goal-mode-icon">{{ getModeIcon(goal.mode) }}</span>
                        <span class="goal-name">{{ goal.title }}</span>
                      </div>
                      <div class="goal-progress-wrap">
                        <div class="goal-progress-bar">
                          <div class="goal-progress-fill" [style.width.%]="goal.progress"></div>
                        </div>
                        <span class="goal-pct">{{ goal.progress }}%</span>
                      </div>
                    </a>
                  }
                </div>
              } @else {
                <div class="empty-state small">
                  <p class="text-muted">Sin metas activas aún.</p>
                  <a class="empty-action" routerLink="/d/goals/new">+ Crear meta</a>
                </div>
              }
            </div>
          </div>
        }

        <!-- Sales Pipeline Mini -->
        @if (hasModule('sales')) {
          <div class="dash-card animate-fadeInUp stagger-6">
            <div class="card-header">
              <h3>🤝 Pipeline de Ventas</h3>
              <a class="card-link" routerLink="/d/sales/deals">Ver deals →</a>
            </div>
            <div class="card-body">
              <div class="mini-stats-row">
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ salesService.openDeals().length }}</span>
                  <span class="mini-stat-label">Abiertos</span>
                </div>
                <div class="mini-stat won">
                  <span class="mini-stat-value">{{ salesService.wonDeals().length }}</span>
                  <span class="mini-stat-label">Ganados</span>
                </div>
                <div class="mini-stat lost">
                  <span class="mini-stat-value">{{ salesService.lostDeals().length }}</span>
                  <span class="mini-stat-label">Perdidos</span>
                </div>
              </div>
              @if (salesService.totalPipelineValue() > 0) {
                <div class="pipeline-value">
                  <span class="pv-label">Pipeline total</span>
                  <span class="pv-amount">{{ '\$' +  fmtNum(salesService.totalPipelineValue())  }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Radar Mini -->
        @if (hasModule('radar')) {
          <div class="dash-card animate-fadeInUp stagger-7">
            <div class="card-header">
              <h3>📡 El Radar</h3>
              <a class="card-link" routerLink="/d/radar">Abrir →</a>
            </div>
            <div class="card-body">
              <div class="mini-stats-row">
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ radarService.totalContacts() }}</span>
                  <span class="mini-stat-label">Contactos</span>
                </div>
                <div class="mini-stat won">
                  <span class="mini-stat-value">{{ radarService.dailyContactedCount() }}/5</span>
                  <span class="mini-stat-label">Hoy</span>
                </div>
                <div class="mini-stat" [class.lost]="radarService.overdueContacts().length > 0">
                  <span class="mini-stat-value">{{ radarService.overdueContacts().length }}</span>
                  <span class="mini-stat-label">Vencidos</span>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Cashflow Mini -->
        @if (hasModule('cashflow')) {
          <div class="dash-card animate-fadeInUp stagger-7">
            <div class="card-header">
              <h3>💸 Flujo de Caja</h3>
              <a class="card-link" routerLink="/d/cashflow">Detalle →</a>
            </div>
            <div class="card-body">
              <div class="mini-stats-row">
                <div class="mini-stat won">
                  <span class="mini-stat-value">{{ '\$' +  fmtNum(cashflow.summary().totalIngresos)  }}</span>
                  <span class="mini-stat-label">Ingresos</span>
                </div>
                <div class="mini-stat lost">
                  <span class="mini-stat-value">{{ '\$' +  fmtNum(cashflow.summary().totalEgresos)  }}</span>
                  <span class="mini-stat-label">Egresos</span>
                </div>
              </div>
              <div class="balance-row" [class.positive]="cashflow.summary().balance >= 0" [class.negative]="cashflow.summary().balance < 0">
                <span class="balance-label">Balance</span>
                <span class="balance-val">{{ '\$' +  fmtNum(cashflow.summary().balance)  }}</span>
              </div>
            </div>
          </div>
        }

        <!-- Investments Mini -->
        @if (hasModule('investments')) {
          <div class="dash-card animate-fadeInUp stagger-7">
            <div class="card-header">
              <h3>💎 Inversiones</h3>
              <a class="card-link" routerLink="/d/admin/investments">Portafolio →</a>
            </div>
            <div class="card-body">
              <div class="mini-stats-row">
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ '\$' +  fmtNum(finance.totalInvested())  }}</span>
                  <span class="mini-stat-label">Invertido</span>
                </div>
                <div class="mini-stat" [class.won]="finance.totalCurrentValue() >= finance.totalInvested()" [class.lost]="finance.totalCurrentValue() < finance.totalInvested()">
                  <span class="mini-stat-value">{{ '\$' +  fmtNum(finance.totalCurrentValue())  }}</span>
                  <span class="mini-stat-label">Valor Actual</span>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Inventory Mini -->
        @if (hasModule('inventory')) {
          <div class="dash-card animate-fadeInUp stagger-7">
            <div class="card-header">
              <h3>📦 Inventario</h3>
              <a class="card-link" routerLink="/d/inventory">Gestionar →</a>
            </div>
            <div class="card-body">
              <div class="mini-stats-row">
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ inventoryService.stats().totalProducts }}</span>
                  <span class="mini-stat-label">Productos</span>
                </div>
                <div class="mini-stat" [class.lost]="inventoryService.criticalProducts().length > 0">
                  <span class="mini-stat-value">{{ inventoryService.criticalProducts().length }}</span>
                  <span class="mini-stat-label">Stock crítico</span>
                </div>
              </div>
            </div>
          </div>
        }



        <!-- Catalog Mini -->
        @if (hasModule('catalog')) {
          <div class="dash-card animate-fadeInUp stagger-7">
            <div class="card-header">
              <h3>🏷️ Catálogo</h3>
              <a class="card-link" routerLink="/d/catalog">Ver →</a>
            </div>
            <div class="card-body">
              <div class="mini-stats-row">
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ catalogService.activeItems().length }}</span>
                  <span class="mini-stat-label">Productos</span>
                </div>
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ catalogService.categories().length }}</span>
                  <span class="mini-stat-label">Categorías</span>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Menú Digital Mini -->
        @if (hasModule('menu_digital')) {
          <div class="dash-card animate-fadeInUp stagger-7">
            <div class="card-header">
              <h3>🍽️ Menú Digital</h3>
              <a class="card-link" routerLink="/d/menu">Gestionar →</a>
            </div>
            <div class="card-body">
              <div class="mini-stats-row">
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ menuService.items().length }}</span>
                  <span class="mini-stat-label">Platillos</span>
                </div>
                <div class="mini-stat won">
                  <span class="mini-stat-value">{{ menuService.availableItems().length }}</span>
                  <span class="mini-stat-label">Disponibles</span>
                </div>
              </div>
              <a class="dash-pub-link" href="/menu" target="_blank">👁️ Ver menú público</a>
            </div>
          </div>
        }

        <!-- Turnos Mini -->
        @if (hasModule('shifts')) {
          <div class="dash-card animate-fadeInUp stagger-7">
            <div class="card-header">
              <h3>🕐 Turnos</h3>
              <a class="card-link" routerLink="/d/shifts">Gestionar →</a>
            </div>
            <div class="card-body">
              <div class="mini-stats-row">
                <div class="mini-stat">
                  <span class="mini-stat-value">{{ shiftsService.activeMembers().length }}</span>
                  <span class="mini-stat-label">Miembros activos</span>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Activity Timeline — always visible -->
        <div class="dash-card animate-fadeInUp stagger-8">
          <div class="card-header">
            <h3>📅 Actividad Reciente</h3>
          </div>
          <div class="card-body">
            @if (recentItems().length) {
              <div class="activity-list">
                @for (item of recentItems(); track item.id) {
                  <div class="activity-item">
                    <span class="activity-dot" [class]="item.type"></span>
                    <div class="activity-content">
                      <span class="activity-text">{{ item.text }}</span>
                      <span class="activity-time">{{ item.timeAgo }}</span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state small">
                <p class="text-muted">Sin actividad reciente.</p>
              </div>
            }
          </div>
        </div>
      </section>


      @if (showInitialCoachModal()) {
        <div class="modal-overlay animate-fadeIn">
          <div class="modal-box animate-fadeInUp">
            <h2>📱 ¡Tu Asistente de Bolsillo está listo!</h2>
            <p>Has activado de manera exitosa el módulo de <b>Coach Móvil</b>.</p>
            <p>Conecta tu dispositivo para llevar tus tareas, metas y embudos a donde vayas. Luego siempre podrás volver a escanearlo desde el menú izquierdo.</p>
            
            <div class="modal-actions">
              <button class="btn ghost" (click)="closeInitialCoachModal()">Más tarde</button>
              <button class="btn primary" (click)="closeAndGoCoach()">Conectar Ahora</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private userService = inject(UserService);
  private storageService = inject(StorageService);
  private router = inject(Router);

  // Injected services for module-aware cards
  salesService = inject(SalesService);
  cashflow = inject(CashflowService);
  finance = inject(FinanceService);
  inventoryService = inject(InventoryService);

  radarService = inject(RadarService);
  catalogService = inject(CatalogService);
  menuService = inject(MenuService);
  shiftsService = inject(ShiftsService);

  /** Module awareness */
  private enabledModules = computed(() => {
    this.storageService.updateToken(); // make reactive
    const saved = this.storageService.get<string[]>('um_enabled_modules');
    return saved ? new Set(saved) : null;
  });

  hasModule(id: string): boolean {
    const enabled = this.enabledModules();
    return enabled ? enabled.has(id) : true;
  }

  showInitialCoachModal = signal(false);

  ngOnInit() {
    if (!this.storageService.has('um_coach_onboarded')) {
      this.showInitialCoachModal.set(true);
    }
  }

  closeInitialCoachModal() {
    this.storageService.set('um_coach_onboarded', '1');
    this.showInitialCoachModal.set(false);
  }

  closeAndGoCoach() {
    this.closeInitialCoachModal();
    this.router.navigate(['/d/coach']);
  }

  // ─── Dynamic Quick Actions ───────────────────
  quickActions = computed(() => {
    const actions: { icon: string; label: string; route: string }[] = [];
    if (this.hasModule('goals'))    actions.push({ icon: '🎯', label: 'Metas',    route: '/d/goals' });
    if (this.hasModule('projects')) actions.push({ icon: '📋', label: 'Adm. Proyectos', route: '/d/projects' });
    if (this.hasModule('sales'))    actions.push({ icon: '🤝', label: 'Pipeline',  route: '/d/sales' });
    if (this.hasModule('cashflow')) actions.push({ icon: '💸', label: 'Caja',      route: '/d/cashflow' });

    if (this.hasModule('radar'))    actions.push({ icon: '📡', label: 'Radar',     route: '/d/radar' });
    return actions.slice(0, 5);
  });

  // ─── Dynamic KPI Cards ──────────────────────
  kpiCards = computed(() => {
    const cards: {
      id: string; icon: string; value: string; label: string;
      trendLabel: string; trendUp: boolean; barPct: number;
      bgColor: string; barColor: string; route: string;
    }[] = [];

    if (this.hasModule('goals')) {
      const active = this.goalService.activeGoals().length;
      const total = this.goalService.goals().length;
      const completed = this.goalService.completedGoals().length;
      cards.push({
        id: 'goals', icon: '🎯', value: `${active}`,
        label: 'Metas en progreso', trendLabel: 'Activas', trendUp: active > 0,
        barPct: total ? Math.round((completed / total) * 100) : 0,
        bgColor: 'rgba(108, 92, 231, 0.15)', barColor: '#6c5ce7', route: '/d/goals',
      });
      cards.push({
        id: 'goals_done', icon: '🏆', value: `${completed}`,
        label: 'Metas completadas', trendLabel: 'Logradas', trendUp: completed > 0,
        barPct: 100,
        bgColor: 'rgba(85, 239, 196, 0.15)', barColor: '#00cec9', route: '/d/goals',
      });
    }

    // Tasks — always visible
    const pendingTasks = this.taskService.pendingTasks().length;
    const totalTasks = this.taskService.tasks().length;
    const doneT = this.taskService.tasks().filter(t => t.status === 'completed').length;
    cards.push({
      id: 'tasks', icon: '✅', value: `${pendingTasks}`,
      label: 'Tareas por completar', trendLabel: 'Pendientes', trendUp: false,
      barPct: totalTasks ? Math.round((doneT / totalTasks) * 100) : 0,
      bgColor: 'rgba(0, 206, 201, 0.15)', barColor: '#00cec9', route: '/d/goals',
    });

    if (this.hasModule('projects')) {
      const projects = this.projectService.projects();
      const avg = projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
      cards.push({
        id: 'projects', icon: '📋', value: `${projects.length}`,
        label: 'Proyectos activos', trendLabel: 'Total', trendUp: false,
        barPct: avg,
        bgColor: 'rgba(84, 160, 255, 0.15)', barColor: '#54a0ff', route: '/d/projects',
      });
    }

    if (this.hasModule('sales')) {
      cards.push({
        id: 'sales', icon: '🤝', value: `${this.salesService.openDeals().length}`,
        label: 'Deals abiertos', trendLabel: `${this.salesService.wonDeals().length} ganados`, trendUp: this.salesService.wonDeals().length > 0,
        barPct: this.salesService.deals().length ? Math.round((this.salesService.wonDeals().length / this.salesService.deals().length) * 100) : 0,
        bgColor: 'rgba(253, 203, 110, 0.2)', barColor: '#fdcb6e', route: '/d/sales/deals',
      });
    }

    if (this.hasModule('cashflow')) {
      const bal = this.cashflow.summary().balance;
      cards.push({
        id: 'cashflow', icon: '💸', value: `$${Math.abs(bal).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
        label: bal >= 0 ? 'Balance positivo' : 'Balance negativo',
        trendLabel: bal >= 0 ? '▲ Superávit' : '▼ Déficit', trendUp: bal >= 0,
        barPct: 100,
        bgColor: bal >= 0 ? 'rgba(0, 206, 201, 0.15)' : 'rgba(214, 48, 49, 0.12)', barColor: bal >= 0 ? '#00b894' : '#d63031',
        route: '/d/cashflow',
      });
    }



    if (this.hasModule('inventory')) {
      const critical = this.inventoryService.criticalProducts().length;
      cards.push({
        id: 'inventory', icon: '📦', value: `${this.inventoryService.stats().totalProducts}`,
        label: 'Productos en inventario',
        trendLabel: critical > 0 ? `⚠️ ${critical} críticos` : '✅ Stock OK',
        trendUp: critical === 0,
        barPct: 100,
        bgColor: critical > 0 ? 'rgba(214, 48, 49, 0.12)' : 'rgba(85, 239, 196, 0.15)',
        barColor: critical > 0 ? '#d63031' : '#00b894',
        route: '/d/inventory',
      });
    }

    return cards;
  });

  // ─── Existing computeds ──────────────────────
  activeGoals = this.goalService.activeGoals;
  focusTask = computed(() => this.taskService.getTodaysFocusTask());

  greeting = computed(() => {
    const hour = new Date().getHours();
    const name = this.userService.firstName();
    const nameStr = name ? `, ${name}` : '';
    if (hour < 12) return `Buenos días${nameStr} ☀️`;
    if (hour < 18) return `Buenas tardes${nameStr} 🌤️`;
    return `Buenas noches${nameStr} 🌙`;
  });

  dateString = computed(() => {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  });

  recentItems = computed(() => {
    const items: { id: string; type: string; text: string; timeAgo: string; date: Date }[] = [];

    for (const goal of this.goalService.goals().slice(-5)) {
      items.push({ id: goal.id, type: 'goal', text: `Meta creada: ${goal.title}`, timeAgo: this.getTimeAgo(goal.createdAt), date: new Date(goal.createdAt) });
    }

    for (const task of this.taskService.tasks().filter(t => t.completedAt).slice(-5)) {
      items.push({ id: task.id, type: 'task', text: `Tarea completada: ${task.title}`, timeAgo: this.getTimeAgo(task.completedAt!), date: new Date(task.completedAt!) });
    }

    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);
  });

  getModeIcon(mode: string): string {
    const icons: Record<string, string> = { sales: '💰', project: '📋', personal: '🧠' };
    return icons[mode] || '🎯';
  }

  logout(): void {
    this.userService.clearProfile();
    this.router.navigate(['/']);
  }

  fmtNum(val: number): string {
    return Math.round(val).toLocaleString('es-CO');
  }

  private getTimeAgo(date: Date | string): string {
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days}d`;
    return d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  }
}
