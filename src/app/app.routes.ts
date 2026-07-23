import { Routes } from '@angular/router';
import { desktopOnlyGuard, mobileOnlyGuard } from './core/guards/device.guard';
import { authGuard } from './core/guards/auth.guard';
import { subscriptionGuard } from './core/guards/subscription.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';
import { registrationGuard } from './core/guards/onboarding.guard';

export const routes: Routes = [
  // ═══════════════════════════════════════════
  // 🏠  HOME / LANDING — /
  // ═══════════════════════════════════════════
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.HomeComponent),
  },

  // ═══════════════════════════════════════════
  // 🔐  LOGIN — /login
  // ═══════════════════════════════════════════
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login').then((m) => m.LoginComponent),
  },

  // ═══════════════════════════════════════════
  // 🔑  RESET PASSWORD — /reset-password/:token
  // ═══════════════════════════════════════════
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import('./features/reset-password/reset-password').then((m) => m.ResetPasswordComponent),
  },

  // ═══════════════════════════════════════════
  // 👋  WELCOME / REGISTRO — /welcome
  // ═══════════════════════════════════════════
  {
    path: 'welcome',
    loadComponent: () =>
      import('./features/welcome/welcome').then((m) => m.WelcomeComponent),
  },

  // ═══════════════════════════════════════════
  // 🧩  MODULE PICKER — /setup
  // ═══════════════════════════════════════════
  {
    path: 'setup',
    canActivate: [registrationGuard],
    loadComponent: () =>
      import('./features/module-picker/module-picker').then((m) => m.ModulePickerComponent),
  },

  // ═══════════════════════════════════════════
  // 📝  COMPLETAR PERFIL — /completar-perfil
  // ═══════════════════════════════════════════
  {
    path: 'completar-perfil',
    canActivate: [registrationGuard],
    loadComponent: () =>
      import('./features/complete-profile/complete-profile').then((m) => m.CompleteProfileComponent),
  },

  // ═══════════════════════════════════════════
  // 🎉  ONBOARDING WELCOME — /bienvenida
  // ═══════════════════════════════════════════
  {
    path: 'bienvenida',
    canActivate: [registrationGuard],
    loadComponent: () =>
      import('./features/onboarding-welcome/onboarding-welcome').then((m) => m.OnboardingWelcomeComponent),
  },

  // ═══════════════════════════════════════════
  // 🔒  SUBSCRIPTION REQUIRED — /subscription-required
  // ═══════════════════════════════════════════
  {
    path: 'subscription-required',
    loadComponent: () =>
      import('./features/subscription-required/subscription-required').then((m) => m.SubscriptionRequiredComponent),
  },

  // ═══════════════════════════════════════════
  // 🖥️  CONSOLA DE MANDO (Desktop) — /d/...
  // ═══════════════════════════════════════════
  {
    path: 'd',
    canActivate: [authGuard, subscriptionGuard, desktopOnlyGuard],
    loadComponent: () =>
      import('./layouts/desktop-layout/desktop-layout').then((m) => m.DesktopLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/desktop/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'coach',
        loadComponent: () =>
          import('./features/desktop/coach/coach').then((m) => m.CoachDesktopComponent),
      },
      // — Goals —
      {
        path: 'goals',
        loadComponent: () =>
          import('./features/desktop/goals/goal-list/goal-list').then((m) => m.GoalListComponent),
      },
      {
        path: 'goals/new',
        loadComponent: () =>
          import('./features/desktop/goals/goal-create/goal-create').then((m) => m.GoalCreateComponent),
      },
      {
        path: 'goals/tree',
        loadComponent: () =>
          import('./features/desktop/goals/goal-tree/goal-tree').then((m) => m.GoalTreeComponent),
      },
      {
        path: 'goals/:id',
        loadComponent: () =>
          import('./features/desktop/goals/goal-detail/goal-detail').then((m) => m.GoalDetailComponent),
      },
      // — Sales —
      {
        path: 'sales',
        loadComponent: () =>
          import('./features/desktop/sales/sales-pipeline/sales-pipeline').then((m) => m.SalesPipelineComponent),
      },
      {
        path: 'sales/funnel/new',
        loadComponent: () =>
          import('./features/desktop/sales/funnel-builder/funnel-builder').then((m) => m.FunnelBuilderComponent),
      },
      {
        path: 'sales/funnel/:id',
        loadComponent: () =>
          import('./features/desktop/sales/funnel-view/funnel-view').then((m) => m.FunnelViewComponent),
      },
      {
        path: 'sales/deals',
        loadComponent: () =>
          import('./features/desktop/sales/deal-tracker/deal-tracker').then((m) => m.DealTrackerComponent),
      },
      {
        path: 'sales/products',
        loadComponent: () =>
          import('./features/desktop/sales/products/products').then((m) => m.ProductsComponent),
      },
      {
        path: 'sales/analytics',
        loadComponent: () =>
          import('./features/desktop/sales/sales-analytics/sales-analytics').then((m) => m.SalesAnalyticsComponent),
      },
      // — Projects —
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/desktop/projects/project-board/project-board').then((m) => m.ProjectBoardComponent),
      },
      {
        path: 'projects/new',
        loadComponent: () =>
          import('./features/desktop/projects/project-create/project-create').then((m) => m.ProjectCreateComponent),
      },
      {
        path: 'projects/:id',
        loadComponent: () =>
          import('./features/desktop/projects/project-detail/project-detail').then((m) => m.ProjectDetailComponent),
      },
      {
        path: 'projects/:id/timeline',
        loadComponent: () =>
          import('./features/desktop/projects/project-timeline/project-timeline').then((m) => m.ProjectTimelineComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/desktop/analytics/unified/unified').then((m) => m.UnifiedAnalyticsComponent),
      },
      {
        path: 'budget-planner',
        loadComponent: () =>
          import('./features/desktop/budget-planner/budget-planner').then((m) => m.BudgetPlannerComponent),
      },
      {
        path: 'storytelling',
        loadComponent: () =>
          import('./features/desktop/storytelling/data-storytelling').then((m) => m.DataStorytellingComponent),
      },
      // — Radar (Contact Radar / Pre-Pipeline CRM) —
      {
        path: 'radar',
        loadComponent: () =>
          import('./features/desktop/radar/radar-inventory/radar-inventory').then((m) => m.RadarInventoryComponent),
      },
      {
        path: 'radar/board',
        loadComponent: () =>
          import('./features/desktop/radar/radar-board/radar-board').then((m) => m.RadarBoardComponent),
      },
      // — Flujo de Caja —
      {
        path: 'finance/analytics',
        loadComponent: () =>
          import('./features/desktop/finance-analytics/finance-analytics').then((m) => m.FinanceAnalyticsComponent),
      },
      {
        path: 'cashflow',
        loadComponent: () =>
          import('./features/desktop/cashflow/cashflow').then((m) => m.CashflowComponent),
      },
      // — Calculadora de Rentabilidad —
      {
        path: 'profitability',
        loadComponent: () =>
          import('./features/desktop/profitability/profitability').then((m) => m.ProfitabilityComponent),
      },
      // — Licitaciones —
      {
        path: 'licitaciones',
        loadComponent: () =>
          import('./features/desktop/licitaciones/licitaciones').then((m) => m.LicitacionesComponent),
      },

      // — Formularios —
      {
        path: 'admin-formularios',
        loadComponent: () =>
          import('./features/admin-formularios/admin-formularios.component').then((m) => m.AdminFormulariosComponent),
      },
      // — Tests —
      {
        path: 'tests',
        loadComponent: () =>
          import('./features/tests/tests.component').then((m) => m.TestsComponent),
      },
      // — Base de Datos (Exportación / Resultados de encuestas y tests) —
      {
        path: 'datos',
        loadComponent: () =>
          import('./features/admin-resultados/admin-resultados.component').then((m) => m.AdminResultadosComponent),
      },
      // — Análisis de Datos (Dashboards) —
      {
        path: 'resultados',
        loadComponent: () =>
          import('./features/admin-dashboards/admin-dashboards.component').then((m) => m.AdminDashboardsComponent),
      },
      // — Entrenamientos (Admin) —
      {
        path: 'admin-entrenamientos',
        loadComponent: () =>
          import('./features/admin-entrenamientos/admin-entrenamientos.component').then((m) => m.AdminEntrenamientosComponent),
      },
      // — Catálogo & Cotizador —
      {
        path: 'catalog',
        loadComponent: () =>
          import('./features/desktop/catalog/catalog').then((m) => m.CatalogComponent),
      },
      // — Inventario —
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/desktop/inventory/inventory').then((m) => m.InventoryComponent),
      },
      // — Menú Digital —
      {
        path: 'menu',
        loadComponent: () =>
          import('./features/desktop/menu/menu-admin').then((m) => m.MenuAdminComponent),
      },
      // — Turnos —
      {
        path: 'shifts',
        loadComponent: () =>
          import('./features/desktop/shifts/shifts').then((m) => m.ShiftsComponent),
      },
      // — SuperAdmin —
      {
        path: 'admin/income',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/desktop/admin/income/income').then((m) => m.AdminIncomeComponent),
      },
      {
        path: 'admin/investments',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/desktop/admin/investments/investments').then((m) => m.AdminInvestmentsComponent),
      },
      {
        path: 'admin/education',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/desktop/admin/education/education-dashboard').then((m) => m.EducationDashboardComponent),
      },
      {
        path: 'admin/education/:id',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/desktop/admin/education/education-detail').then((m) => m.EducationDetailComponent),
      },
      {
        path: 'admin/panel',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/desktop/admin/admin-panel/admin-panel').then((m) => m.AdminPanelComponent),
      },
      {
        path: 'admin/subscriptions',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/desktop/admin/subscribers/subscribers.component').then((m) => m.SubscribersComponent),
      },
      {
        path: 'admin/soporte',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/desktop/admin/support/admin-support').then((m) => m.AdminSupportComponent),
      },
      // — Appearance —
      {
        path: 'appearance',
        loadComponent: () =>
          import('./features/desktop/appearance/appearance').then((m) => m.AppearanceComponent),
      },
      // — Settings —
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/desktop/settings/settings').then((m) => m.SettingsComponent),
      },
      // — Soporte —
      {
        path: 'soporte',
        loadComponent: () =>
          import('./features/desktop/support/support').then((m) => m.UserSupportComponent),
      },
      // — CEO Dashboard (OT Analytics) —
      {
        path: 'ceo',
        loadComponent: () =>
          import('./features/desktop/ceo-dashboard/ceo-dashboard').then((m) => m.CeoDashboardComponent),
      },
      // — Field OT Promo QR —
      {
        path: 'monitoreo-movil',
        loadComponent: () =>
          import('./features/desktop/monitoreo-movil/monitoreo-movil').then((m) => m.MonitoreoMovilDesktopComponent),
      },
      // — Asignaciones —
      {
        path: 'asignaciones',
        loadComponent: () =>
          import('./features/desktop/asignaciones/asignaciones').then((m) => m.AsignacionesComponent),
      },
      // — Soy Cliente —
      {
        path: 'soy-cliente',
        loadComponent: () =>
          import('./features/desktop/soy-cliente/soy-cliente').then((m) => m.SoyClienteComponent),
      },
      // — Field OT (Mobile preview from desktop) —
      {
        path: 'field-ot',
        loadComponent: () =>
          import('./features/mobile/field-ot/field-ot').then((m) => m.FieldOtComponent),
      },
      {
        path: 'field-ot/:id',
        loadComponent: () =>
          import('./features/mobile/field-ot-detail/field-ot-detail').then((m) => m.FieldOtDetailComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ═══════════════════════════════════════════
  // 📱 ASISTENTE TÁCTICO (Mobile) — /m/...
  // ═══════════════════════════════════════════
  {
    path: 'm',
    canActivate: [authGuard, subscriptionGuard, mobileOnlyGuard],
    loadComponent: () =>
      import('./layouts/mobile-layout/mobile-layout').then((m) => m.MobileLayoutComponent),
    children: [
      {
        path: 'today',
        loadComponent: () =>
          import('./features/mobile/today/today').then((m) => m.TodayComponent),
      },
      {
        path: 'focus',
        loadComponent: () =>
          import('./features/mobile/task-focus/task-focus').then((m) => m.TaskFocusComponent),
      },
      {
        path: 'capture',
        loadComponent: () =>
          import('./features/mobile/quick-capture/quick-capture').then((m) => m.QuickCaptureComponent),
      },
      {
        path: 'briefing',
        loadComponent: () =>
          import('./features/mobile/briefing/briefing').then((m) => m.BriefingComponent),
      },
      {
        path: 'celebration',
        loadComponent: () =>
          import('./features/mobile/weekly-celebration/weekly-celebration').then((m) => m.WeeklyCelebrationComponent),
      },
      {
        path: 'install',
        loadComponent: () =>
          import('./features/mobile/install/install').then((m) => m.MobileInstallComponent),
      },
      {
        path: 'radar',
        loadComponent: () =>
          import('./features/mobile/daily-radar/daily-radar').then((m) => m.DailyRadarComponent),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/mobile/mobile-tasks/mobile-tasks').then((m) => m.MobileTasksComponent),
      },
      // — Órdenes de Trabajo (Campo) —
      {
        path: 'ot',
        loadComponent: () =>
          import('./features/mobile/field-ot/field-ot').then((m) => m.FieldOtComponent),
      },
      {
        path: 'ot/:id',
        loadComponent: () =>
          import('./features/mobile/field-ot-detail/field-ot-detail').then((m) => m.FieldOtDetailComponent),
      },
      { path: 'coach', redirectTo: 'today', pathMatch: 'full' },
      { path: '', redirectTo: 'today', pathMatch: 'full' },
    ],
  },

  // ═══════════════════════════════════════════
  // 🎓 EXPERIENCIA PÚBLICA (Entrenamiento)
  // ═══════════════════════════════════════════
  {
    path: 'entrenamiento/:token',
    loadComponent: () =>
      import('./public-portal/entrenamiento-hub/entrenamiento-hub.component').then((m) => m.EntrenamientoHubComponent),
  },

  // ═══════════════════════════════════════════
  // 📊 REPORTE PÚBLICO (Educación) — /reportes/educacion
  // ═══════════════════════════════════════════
  {
    path: 'reportes/educacion',
    loadComponent: () =>
      import('./public-portal/education-report/education-report').then((m) => m.EducationReportComponent),
  },

  // ═══════════════════════════════════════════
  // 🍽️ MENÚ DIGITAL PÚBLICO — /menu
  // ═══════════════════════════════════════════
  {
    path: 'menu',
    loadComponent: () =>
      import('./public-portal/menu-public/menu-public').then((m) => m.MenuPublicComponent),
  },
  {
    path: 'menu/:slug',
    loadComponent: () =>
      import('./public-portal/menu-public/menu-public').then((m) => m.MenuPublicComponent),
  },

  {
    path: '**',
    redirectTo: '',
  },
];

