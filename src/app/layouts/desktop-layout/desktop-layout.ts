import { Component, inject, signal, computed, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../core/services/theme.service';
import { GoalService } from '../../core/services/goal.service';
import { TaskService } from '../../core/services/task.service';
import { SalesService } from '../../core/services/sales.service';
import { UserService } from '../../core/services/user.service';
import { StorageService } from '../../core/services/storage.service';
import { DeviceService } from '../../core/services/device.service';
import { DataSyncService } from '../../core/services/data-sync.service';
import { MockSubscriptionService } from '../../core/services/mock-subscription.service';
import { UmIconComponent } from '../../shared/components/um-icon/um-icon';
import { LOGO_FULL, LOGO_ORANGE } from '../../core/constants/logo.constants';

interface NavItem {
  label: string;
  icon: string;
  iconKey?: string;
  route: string;
  moduleId?: string | string[];
}

@Component({
  selector: 'um-desktop-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="desktop-shell" [class.sidebar-collapsed]="collapsed()" [class.sidebar-compact]="!isExpanded()" [class.is-mobile]="isMobile()">

      <!-- ═══ MOBILE HEADER ═══ (only visible on mobile) -->
      <header class="mobile-topbar">
        <button class="mob-menu-btn" (click)="toggleMobileDrawer()" aria-label="Menú">☰</button>
        <h2 class="mob-title">{{ pageTitle() }}</h2>
        <div class="mob-actions">
          <button class="mob-btn" (click)="toggleSearch()" title="Buscar">🔍</button>
          <button class="mob-btn" (click)="themeService.toggle()" title="Tema">{{ themeEmoji() }}</button>
        </div>
      </header>

      <!-- ═══ SIDEBAR OVERLAY BACKDROP ═══ (mobile) -->
      @if (mobileDrawerOpen()) {
        <div class="drawer-backdrop" (click)="toggleMobileDrawer()"></div>
      }

      <!-- ═══ SIDEBAR ═══ -->
      <aside class="sidebar" [class.drawer-open]="mobileDrawerOpen()" (mouseenter)="onMouseEnter()" (mouseleave)="onMouseLeave()">
        <div class="sidebar-header">
          <div class="logo-area">
            @if (isExpanded() || isMobile()) {
              <img class="logo-full" [src]="logoFull" alt="ActuaYa" />
            } @else {
              <img class="logo-icon" [src]="logoOrange" alt="ActuaYa" />
            }
          </div>
          @if (!isMobile()) {
            <button class="collapse-btn" (click)="toggleSidebar()" [attr.aria-label]="collapsed() ? 'Expandir sidebar' : 'Colapsar sidebar'">
              <span class="collapse-icon" [class.rotated]="collapsed()">‹</span>
            </button>
          } @else {
            <button class="collapse-btn" (click)="toggleMobileDrawer()" aria-label="Cerrar menú">✕</button>
          }
        </div>

        <nav class="sidebar-nav">
          @for (section of navSections(); track section.title; let si = $index) {
            <div class="nav-section"
              [class.drag-over-section]="dragOverSectionIdx() === si && dragType() === 'section'"
              [class.dragging-section]="draggingSectionIdx() === si"
              (dragover)="onSectionDragOver($event, si)"
              (dragleave)="onSectionDragLeave()"
              (drop)="onSectionDrop($event, si)">

              <div class="nav-section-title"
                draggable="true"
                (dragstart)="onSectionDragStart($event, si)"
                (dragend)="onDragEnd()">
                @if (isExpanded() || isMobile()) {
                  <span class="drag-handle section-handle" title="Arrastra para reordenar categoría">⠿</span>
                }
                <span>{{ section.title }}</span>
              </div>

              @for (item of section.items; track item.route; let ii = $index) {
                <a
                  class="nav-item"
                  [class.drag-over-item]="dragOverItemIdx()?.si === si && dragOverItemIdx()?.ii === ii && dragType() === 'item'"
                  [class.dragging-item]="draggingItemIdx()?.si === si && draggingItemIdx()?.ii === ii"
                  [routerLink]="item.route"
                  routerLinkActive="active"
                  [attr.title]="!isExpanded() && !isMobile() ? item.label : null"
                  draggable="true"
                  (dragstart)="onItemDragStart($event, si, ii)"
                  (dragover)="onItemDragOver($event, si, ii)"
                  (dragleave)="onItemDragLeave()"
                  (drop)="onItemDrop($event, si, ii)"
                  (dragend)="onDragEnd()"
                  (click)="onNavClick()"
                >
                  @if (isExpanded() || isMobile()) {
                    <span class="drag-handle item-handle" (mousedown)="$event.stopPropagation()">⠿</span>
                  }
                  <span class="nav-icon">{{ item.iconKey ? themeService.getIcon(item.iconKey) : item.icon }}</span>
                  @if (isExpanded() || isMobile()) {
                    <span class="nav-label">{{ item.label }}</span>
                  }
                </a>
              }
            </div>
          }

          @if (isSuperAdmin()) {
            @for (section of adminSections; track section.title) {
              <div class="nav-section-title admin-title">{{ section.title }}</div>
              @for (item of section.items; track item.route) {
                <a
                  class="nav-item admin-item"
                  [routerLink]="item.route"
                  routerLinkActive="active"
                  (click)="onNavClick()"
                >
                  <span class="nav-icon">{{ item.iconKey ? themeService.getIcon(item.iconKey) : item.icon }}</span>
                  @if (isExpanded() || isMobile()) {
                    <span class="nav-label">{{ item.label }}</span>
                  }
                </a>
              }
            }
          }
        </nav>

        <div class="sidebar-footer">
          <!-- Mobile-only: link to Coach Móvil -->
          @if (isMobile()) {
            <a class="nav-item coach-link" routerLink="/m/today" (click)="onNavClick()">
              <span class="nav-icon">{{ themeService.getIcon('coach') }}</span>
              <span class="nav-label">Coach Móvil</span>
            </a>
          }
          <a class="user-pill" routerLink="/d/appearance" routerLinkActive="active" (click)="onNavClick()">
            <span class="user-avatar">{{ themeService.getIcon('storytelling') }}</span>
            @if (isExpanded() || isMobile()) {
              <span class="user-name">Personalizar</span>
            }
          </a>
          <a class="user-pill" routerLink="/d/settings" routerLinkActive="active" (click)="onNavClick()">
            <span class="user-avatar">{{ themeService.getIcon('client') }}</span>
            @if (isExpanded() || isMobile()) {
              <span class="user-name">Mi Cuenta</span>
            }
          </a>
        </div>
      </aside>

      <!-- ═══ MAIN CONTENT AREA ═══ -->
      <div class="main-area">
        <!-- Desktop Topbar (hidden on mobile) -->
        <header class="topbar">
          <div class="topbar-left">
            @if (collapsed()) {
              <button class="topbar-btn expand-btn" title="Abrir menú" (click)="toggleSidebar()">
                <span>☰</span>
              </button>
            }
            <h2 class="page-title">Consola de Mando</h2>
          </div>
          <div class="topbar-right">
            <button class="topbar-btn" title="Buscar" (click)="toggleSearch()"><span>🔍</span></button>
            <button class="btn-logout-topbar" (click)="logout()" title="Cerrar sesión">Cerrar sesión</button>
            <button class="topbar-btn" title="Notificaciones" (click)="toggleNotifications()">
              <span>🔔</span>
              @if (unreadNotifications() > 0) {
                <span class="notification-dot"></span>
              }
            </button>
            <button class="topbar-btn theme-toggle" title="Cambiar tema" (click)="themeService.toggle()">
              <span>{{ themeEmoji() }}</span>
            </button>
          </div>
        </header>

        <!-- Search Panel -->
        @if (searchOpen()) {
          <div class="search-panel animate-fadeInUp">
            <div class="search-bar">
              <span class="search-icon">🔍</span>
              <input
                class="search-input"
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Buscar metas, tareas, deals..."
                autofocus
                (keyup.escape)="toggleSearch()"
              />
              <button class="search-close" (click)="toggleSearch()">✕</button>
            </div>
            @if (searchResults().length) {
              <div class="search-results">
                @for (r of searchResults(); track r.id) {
                  <a class="search-result-item" [routerLink]="r.route" (click)="toggleSearch()">
                    <span class="sr-icon">{{ r.icon }}</span>
                    <div class="sr-info">
                      <span class="sr-title">{{ r.title }}</span>
                      <span class="sr-type">{{ r.type }}</span>
                    </div>
                  </a>
                }
              </div>
            } @else if (searchQuery().trim().length > 1) {
              <div class="search-empty">Sin resultados para "{{ searchQuery() }}"</div>
            }
          </div>
        }

        <!-- Notifications Panel -->
        @if (notificationsOpen()) {
          <div class="notifications-panel animate-fadeInUp">
            <div class="notif-header">
              <h3>Notificaciones</h3>
              <button class="notif-close" (click)="toggleNotifications()">✕</button>
            </div>
            @if (notifications().length) {
              @for (n of notifications(); track n.id) {
                <div class="notif-item" [class.unread]="!n.read">
                  <span class="notif-icon">{{ n.icon }}</span>
                  <div class="notif-content">
                    <span class="notif-message">{{ n.message }}</span>
                    <span class="notif-time">{{ n.time }}</span>
                  </div>
                </div>
              }
            } @else {
              <div class="notif-empty">Sin notificaciones 🎉</div>
            }
          </div>
        }

        <!-- Trial Banner -->
        @if (showTrialBanner()) {
          <div class="trial-banner animate-fadeInUp">
            <div class="trial-banner-inner">
              <span class="trial-icon">⏳</span>
              <div class="trial-text">
                <strong>Período de prueba</strong>
                <span>
                  @if (trialDaysRemaining() > 1) {
                    Te quedan <strong>{{ trialDaysRemaining() }} días</strong> de prueba gratuita.
                  } @else if (trialDaysRemaining() === 1) {
                    ¡Te queda <strong>1 día</strong> de prueba gratuita!
                  } @else {
                    Tu prueba gratuita termina <strong>hoy</strong>.
                  }
                </span>
              </div>
              <a class="trial-cta" href="https://wa.me/573001234567?text=Hola,%20quiero%20activar%20mi%20suscripción%20de%20ACTUAYA" target="_blank">
                Activar plan →
              </a>
            </div>
          </div>
        }

        <!-- Page Content -->
        <main class="content-area">
          <router-outlet />
        </main>
      </div>

      <!-- ═══ MOBILE BOTTOM NAV ═══ (quick access on mobile) -->
      @if (isMobile()) {
        <nav class="mob-bottom-nav">
          <a class="mob-nav-item" routerLink="/d/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span class="mob-nav-icon">{{ themeService.getIcon('home') || '🏠' }}</span>
            <span class="mob-nav-label">Inicio</span>
          </a>
          @for (q of quickNavItems(); track q.route) {
            <a class="mob-nav-item" [routerLink]="q.route" routerLinkActive="active">
              <span class="mob-nav-icon">{{ q.iconKey ? themeService.getIcon(q.iconKey) : q.icon }}</span>
              <span class="mob-nav-label">{{ q.label }}</span>
            </a>
          }
          <button class="mob-nav-item" (click)="toggleMobileDrawer()">
            <span class="mob-nav-icon">≡</span>
            <span class="mob-nav-label">Más</span>
          </button>
        </nav>
      }
    </div>
  `,
  styleUrl: 'desktop-layout.scss',
})
export class DesktopLayoutComponent implements OnInit {
  readonly logoFull = LOGO_FULL;
  readonly logoOrange = LOGO_ORANGE;
  private platformId = inject(PLATFORM_ID);
  private deviceService = inject(DeviceService);
  private router = inject(Router);
  themeService = inject(ThemeService);
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);
  private salesService = inject(SalesService);
  private mockSubService = inject(MockSubscriptionService);
  private dataSync = inject(DataSyncService);

  collapsed = signal(true);
  isHovered = signal(false);
  searchOpen = signal(false);
  notificationsOpen = signal(false);

  // ─── Drag & Drop State ──────────────────────
  dragType = signal<'section' | 'item' | null>(null);
  draggingSectionIdx = signal<number | null>(null);
  dragOverSectionIdx = signal<number | null>(null);
  draggingItemIdx = signal<{ si: number; ii: number } | null>(null);
  dragOverItemIdx = signal<{ si: number; ii: number } | null>(null);
  searchQuery = signal('');
  mobileDrawerOpen = signal(false);

  isMobile = computed(() => this.deviceService.isMobile());
  isExpanded = computed(() => !this.collapsed() || this.isHovered());

  /** Dynamic page title based on current route */
  pageTitle = computed(() => {
    const url = this.router.url;
    const flat = this.navSections().flatMap(s => s.items);
    const match = flat.find(i => url.startsWith(i.route));
    return match ? match.label : 'Consola de Mando';
  });

  /** Top 3 most useful modules for the mobile bottom bar */
  quickNavItems = computed(() => {
    const all = this.navSections().flatMap(s => s.items);
    // Pick the first 3 non-dashboard items
    return all.filter(i => i.route !== '/d/dashboard').slice(0, 3);
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Auto-sync cloud data on Desktop init
      this.dataSync.syncFromServer();
      // On mobile, start with sidebar collapsed
      if (this.deviceService.isMobile()) {
        this.collapsed.set(true);
      }
      // Check subscription status on layout init
      this.mockSubService.checkAndUpdateStatus();
    }
  }

  // ─── Trial Banner State ──────────────────────
  showTrialBanner = computed(() => this.mockSubService.isTrial());
  trialDaysRemaining = computed(() => this.mockSubService.trialDaysRemaining());

  onMouseEnter() {
    if (this.collapsed() && !this.isMobile()) {
      this.isHovered.set(true);
    }
  }

  onMouseLeave() {
    if (this.collapsed() && !this.isMobile()) {
      this.isHovered.set(false);
    }
  }

  themeEmoji = computed(() => {
    const t = this.themeService.theme();
    return t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '🌓';
  });

  toggleMobileDrawer(): void {
    this.mobileDrawerOpen.update(v => !v);
  }

  onNavClick(): void {
    // Close drawer on mobile after navigation
    if (this.isMobile()) {
      this.mobileDrawerOpen.set(false);
    }
  }

  searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (q.length < 2) return [];
    const results: { id: string; title: string; type: string; icon: string; route: string }[] = [];

    this.goalService.goals().forEach(g => {
      if (g.title.toLowerCase().includes(q)) {
        results.push({ id: g.id, title: g.title, type: 'Meta', icon: '🎯', route: `/d/goals/${g.id}` });
      }
    });

    this.taskService.tasks().forEach(t => {
      if (t.title.toLowerCase().includes(q)) {
        results.push({ id: t.id, title: t.title, type: 'Tarea', icon: '✅', route: `/d/goals` });
      }
    });

    this.salesService.deals().forEach(d => {
      if (d.contactName.toLowerCase().includes(q)) {
        results.push({ id: d.id, title: d.contactName, type: 'Deal', icon: '🤝', route: `/d/sales/deals` });
      }
    });

    this.salesService.funnels().forEach(f => {
      if (f.name.toLowerCase().includes(q)) {
        results.push({ id: f.id, title: f.name, type: 'Embudo', icon: '🌪️', route: `/d/sales/funnel/${f.id}` });
      }
    });

    return results.slice(0, 8);
  });

  notifications = computed(() => {
    const notifs: { id: string; icon: string; message: string; time: string; read: boolean }[] = [];

    const pendingTasks = this.taskService.pendingTasks();
    if (pendingTasks.length > 3) {
      notifs.push({ id: 'tasks', icon: '📋', message: `Tienes ${pendingTasks.length} tareas pendientes`, time: 'Ahora', read: false });
    }

    const stalledGoals = this.goalService.goals().filter(g => g.status === 'in_progress' && g.progress === 0);
    if (stalledGoals.length) {
      notifs.push({ id: 'goals', icon: '⚠️', message: `${stalledGoals.length} meta(s) sin progreso`, time: 'Hoy', read: false });
    }

    const openDeals = this.salesService.openDeals();
    if (openDeals.length > 0) {
      notifs.push({ id: 'deals', icon: '🤝', message: `${openDeals.length} deal(s) abiertos`, time: 'Hoy', read: true });
    }

    const completedGoals = this.goalService.goals().filter(g => g.status === 'completed');
    if (completedGoals.length) {
      notifs.push({ id: 'completed', icon: '🎉', message: `¡${completedGoals.length} meta(s) completada(s)!`, time: 'Reciente', read: true });
    }

    return notifs;
  });

  unreadNotifications = computed(() => this.notifications().filter(n => !n.read).length);

  private userService = inject(UserService);
  private storage = inject(StorageService);
  isSuperAdmin = computed(() => this.userService.isSuperAdmin());

  private enabledModules = computed(() => {
    this.storage.updateToken();
    const saved = this.storage.get<string[]>('um_enabled_modules');
    return saved ? new Set(saved) : null;
  });

  private isModuleActive(moduleId: string | string[] | undefined): boolean {
    if (!moduleId) return true;
    const isSuper = this.userService.isSuperAdmin();
    if (!isSuper) {
      if (moduleId === 'income' || moduleId === 'investments' || moduleId === 'education' || moduleId === 'budget_planner') return false;
    }
    const enabled = this.enabledModules();
    if (!enabled) return true;
    
    if (Array.isArray(moduleId)) {
      return moduleId.some(id => (isSuper || (id !== 'income' && id !== 'investments')) && enabled.has(id));
    }
    return enabled.has(moduleId);
  }

  /** Saved custom order signal — triggers re-computation */
  private navOrderToken = signal(0);
  private readonly NAV_ORDER_KEY = 'um_nav_order';

  navSections = computed(() => {
    // Access the token to create reactivity when order changes
    this.navOrderToken();

    const allSections: { title: string; items: NavItem[] }[] = [
      {
        title: 'General',
        items: [
          { label: 'Dashboard', icon: '🏠', iconKey: 'home', route: '/d/dashboard' },
          { label: 'Soporte', icon: '🎧', iconKey: 'coach', route: '/d/soporte' },
        ],
      },
      {
        title: 'Gestión de Mantenimiento',
        items: [
          { label: 'Soy Administrador', icon: '⏲️', iconKey: 'ceo', route: '/d/ceo', moduleId: 'ceo_teo' },
          { label: 'Asignaciones', icon: '📅', iconKey: 'assignments', route: '/d/asignaciones', moduleId: 'asignaciones' },
          { label: 'Soy Técnico', icon: '🛠️', iconKey: 'technician', route: '/d/monitoreo-movil', moduleId: 'monitoreo' },
          { label: 'Soy Cliente', icon: '👤', iconKey: 'client', route: '/d/soy-cliente', moduleId: 'soy_cliente' },
        ],
      },
      {
        title: 'Productividad',
        items: [
          { label: 'Metas', icon: '🎯', iconKey: 'goals', route: '/d/goals', moduleId: 'goals' },
          { label: 'Coach Móvil', icon: '📱', iconKey: 'coach', route: this.isMobile() ? '/m/today' : '/d/coach', moduleId: 'coach' },
          { label: 'Proyectos', icon: '📋', iconKey: 'projects', route: '/d/projects', moduleId: 'projects' },
          { label: 'Storytelling', icon: '🎨', iconKey: 'storytelling', route: '/d/storytelling', moduleId: 'storytelling' },
          { label: 'Analítica Productividad', icon: '📊', iconKey: 'analytics', route: '/d/analytics', moduleId: 'analytics' },
        ],
      },
      {
        title: 'Comercial & Ventas',
        items: [
          { label: 'El Radar', icon: '📡', iconKey: 'radar', route: '/d/radar', moduleId: 'radar' },
          { label: 'Productos', icon: '📦', iconKey: 'inventory', route: '/d/sales/products', moduleId: 'sales' },
          { label: 'Embudos de Venta', icon: '🌪️', iconKey: 'sales', route: '/d/sales', moduleId: 'sales' },
          { label: 'Oportunidades', icon: '🤝', iconKey: 'deals', route: '/d/sales/deals', moduleId: 'sales' },
          { label: 'Catálogo / Cotizador', icon: '🏷️', iconKey: 'catalog', route: '/d/catalog', moduleId: 'catalog' },
          { label: 'Analítica Comercial', icon: '📊', iconKey: 'analytics', route: '/d/sales/analytics', moduleId: ['radar', 'sales', 'catalog'] },
        ],
      },
      {
        title: 'Evaluación & Diagnóstico',
        items: [
          { label: 'Formularios', icon: '📋', iconKey: 'forms', route: '/d/admin-formularios', moduleId: 'formularios' },
          { label: 'Tests & Evaluaciones', icon: '🧪', iconKey: 'tests', route: '/d/tests', moduleId: 'tests' },
          { label: 'Registros Recibidos', icon: '🗄️', iconKey: 'data', route: '/d/datos', moduleId: 'datos' },
          { label: 'Analítica Evaluaciones', icon: '📊', iconKey: 'results', route: '/d/resultados', moduleId: 'resultados' },
        ],
      },
      {
        title: 'Finanzas',
        items: [
          { label: 'Flujo de Caja', icon: '💸', iconKey: 'cashflow', route: '/d/cashflow', moduleId: 'cashflow' },
        ],
      },
      {
        title: 'Operaciones',
        items: [
          { label: 'Inventario', icon: '📦', iconKey: 'inventory', route: '/d/inventory', moduleId: 'inventory' },
          { label: 'Menú Digital', icon: '🍽️', iconKey: 'menu', route: '/d/menu', moduleId: 'menu_digital' },
          { label: 'Turnos', icon: '🕐', iconKey: 'shifts', route: '/d/shifts', moduleId: 'shifts' },
        ],
      },
    ];

    if (this.userService.isSuperAdmin()) {
      const finSection = allSections.find(s => s.title === 'Finanzas');
      if (finSection) {
        finSection.items.unshift(
          { label: 'Ingresos', icon: '🧾', iconKey: 'income', route: '/d/admin/income', moduleId: 'income' }
        );
        finSection.items.push(
          { label: 'Inversiones', icon: '💎', iconKey: 'subscriptions', route: '/d/admin/investments', moduleId: 'investments' },
          { label: 'Proyectos Educativos', icon: '🎓', iconKey: 'education', route: '/d/admin/education', moduleId: 'education' },
          { label: 'Planeación Financiera', icon: '💰', iconKey: 'finance', route: '/d/budget-planner', moduleId: 'budget_planner' },
          { label: 'Calculadora de Rentabilidad', icon: '📐', iconKey: 'profitability', route: '/d/profitability', moduleId: 'profitability' },
          { label: 'Analítica Finanzas', icon: '📊', iconKey: 'finance', route: '/d/finance/analytics', moduleId: ['cashflow', 'profitability'] }
        );
      }
    } else {
      const finSection = allSections.find(s => s.title === 'Finanzas');
      if (finSection) {
        finSection.items.push(
          { label: 'Calculadora de Rentabilidad', icon: '📐', iconKey: 'profitability', route: '/d/profitability', moduleId: 'profitability' },
          { label: 'Analítica Finanzas', icon: '📊', iconKey: 'finance', route: '/d/finance/analytics', moduleId: ['cashflow', 'profitability'] }
        );
      }
    }

    // Filter by active modules first
    let filtered = allSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => this.isModuleActive(item.moduleId)),
      }))
      .filter(section => section.items.length > 0);

    // Apply saved custom order
    filtered = this.applySavedOrder(filtered);

    return filtered;
  });

  adminSections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Administración',
      items: [
        { label: 'Panel Admin', icon: '⚙️', iconKey: 'settings', route: '/d/admin/panel' },
        { label: 'Usuarios', icon: '💎', iconKey: 'subscriptions', route: '/d/admin/subscriptions' },
        { label: 'Bandeja de Soporte', icon: '🎧', iconKey: 'coach', route: '/d/admin/soporte' },
      ],
    }
  ];

  toggleSidebar(): void {
    this.collapsed.update((v) => !v);
    this.isHovered.set(false);
  }

  toggleSearch(): void {
    this.searchOpen.update(v => !v);
    if (!this.searchOpen()) this.searchQuery.set('');
    this.notificationsOpen.set(false);
  }

  toggleNotifications(): void {
    this.notificationsOpen.update(v => !v);
    this.searchOpen.set(false);
  }

  logout(): void {
    this.userService.clearProfile();
    this.router.navigate(['/']);
  }

  // ─── Drag & Drop: Section Reordering ────────────────

  onSectionDragStart(e: DragEvent, sectionIdx: number): void {
    // Don't allow dragging items to bubble as section drags
    if (this.dragType() === 'item') return;
    this.dragType.set('section');
    this.draggingSectionIdx.set(sectionIdx);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `section:${sectionIdx}`);
    }
  }

  onSectionDragOver(e: DragEvent, sectionIdx: number): void {
    if (this.dragType() !== 'section') return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    this.dragOverSectionIdx.set(sectionIdx);
  }

  onSectionDragLeave(): void {
    this.dragOverSectionIdx.set(null);
  }

  onSectionDrop(e: DragEvent, targetIdx: number): void {
    e.preventDefault();
    const sourceIdx = this.draggingSectionIdx();
    if (this.dragType() !== 'section' || sourceIdx === null || sourceIdx === targetIdx) {
      this.resetDragState();
      return;
    }

    const sections = [...this.navSections()];
    const [moved] = sections.splice(sourceIdx, 1);
    sections.splice(targetIdx, 0, moved);
    this.saveOrder(sections);
    this.resetDragState();
  }

  // ─── Drag & Drop: Item Reordering (within same section) ──

  onItemDragStart(e: DragEvent, sectionIdx: number, itemIdx: number): void {
    e.stopPropagation(); // Prevent section drag
    this.dragType.set('item');
    this.draggingItemIdx.set({ si: sectionIdx, ii: itemIdx });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `item:${sectionIdx}:${itemIdx}`);
    }
  }

  onItemDragOver(e: DragEvent, sectionIdx: number, itemIdx: number): void {
    if (this.dragType() !== 'item') return;
    const dragging = this.draggingItemIdx();
    if (!dragging || dragging.si !== sectionIdx) return; // Only within same section
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    this.dragOverItemIdx.set({ si: sectionIdx, ii: itemIdx });
  }

  onItemDragLeave(): void {
    this.dragOverItemIdx.set(null);
  }

  onItemDrop(e: DragEvent, targetSi: number, targetIi: number): void {
    e.preventDefault();
    e.stopPropagation();
    const source = this.draggingItemIdx();
    if (this.dragType() !== 'item' || !source || source.si !== targetSi || source.ii === targetIi) {
      this.resetDragState();
      return;
    }

    const sections = this.navSections().map(s => ({ ...s, items: [...s.items] }));
    const items = sections[targetSi].items;
    const [moved] = items.splice(source.ii, 1);
    items.splice(targetIi, 0, moved);
    this.saveOrder(sections);
    this.resetDragState();
  }

  onDragEnd(): void {
    this.resetDragState();
  }

  private resetDragState(): void {
    this.dragType.set(null);
    this.draggingSectionIdx.set(null);
    this.dragOverSectionIdx.set(null);
    this.draggingItemIdx.set(null);
    this.dragOverItemIdx.set(null);
  }

  // ─── Order Persistence ──────────────────────

  private saveOrder(sections: { title: string; items: NavItem[] }[]): void {
    const order = sections.map(s => ({
      title: s.title,
      routes: s.items.map(i => i.route),
    }));
    this.storage.set(this.NAV_ORDER_KEY, order);
    this.navOrderToken.update(v => v + 1); // Trigger recomputation
  }

  private applySavedOrder(sections: { title: string; items: NavItem[] }[]): { title: string; items: NavItem[] }[] {
    const saved = this.storage.get<{ title: string; routes: string[] }[]>(this.NAV_ORDER_KEY);
    if (!saved || !saved.length) return sections;

    // Build a map of sections by title
    const sectionMap = new Map(sections.map(s => [s.title, s]));
    const ordered: { title: string; items: NavItem[] }[] = [];

    for (const savedSection of saved) {
      const section = sectionMap.get(savedSection.title);
      if (!section) continue;

      // Reorder items within section based on saved route order
      const itemMap = new Map(section.items.map(i => [i.route, i]));
      const orderedItems: NavItem[] = [];

      for (const route of savedSection.routes) {
        const item = itemMap.get(route);
        if (item) {
          orderedItems.push(item);
          itemMap.delete(route);
        }
      }
      // Append any new items not in saved order
      itemMap.forEach(item => orderedItems.push(item));

      ordered.push({ title: section.title, items: orderedItems });
      sectionMap.delete(savedSection.title);
    }

    // Append any new sections not in saved order
    sectionMap.forEach(section => ordered.push(section));

    return ordered;
  }
}
