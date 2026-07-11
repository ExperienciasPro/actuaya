import { Component, signal, OnInit, PLATFORM_ID, inject, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { UmIconComponent } from '../../shared/components/um-icon/um-icon';
import { ReminderService, RemoteReminder } from '../../core/services/reminder.service';
import { DataSyncService } from '../../core/services/data-sync.service';
import { UserService } from '../../core/services/user.service';
import { LOGO_FULL } from '../../core/constants/logo.constants';

@Component({
  selector: 'um-mobile-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UmIconComponent],
  template: `
    <div class="mobile-shell" (touchstart)="onTouchStart($event)" (touchmove)="onTouchMove($event)" (touchend)="onTouchEnd()">
      <!-- Pull to refresh indicator -->
      @if (pullDistance() > 0 || isRefreshing()) {
        <div class="pull-refresh-banner" [style.height.px]="isRefreshing() ? 50 : pullDistance()">
          <span class="refresh-spinner" [class.spinning]="isRefreshing()">🔄</span>
          <span class="refresh-text">{{ isRefreshing() ? 'Sincronizando...' : (pullDistance() > 60 ? 'Suelta para actualizar' : 'Desliza para actualizar') }}</span>
        </div>
      }

      <!-- Mobile Header -->
      @if (!isInstallRoute()) {
        <header class="mobile-header">
          <img class="mobile-logo" [src]="logoFull" alt="ActuaYa" />
          <div class="header-right">
            <button class="sync-refresh-btn" [class.spinning]="isRefreshing()" (click)="manualSync()" title="Sincronizar datos">
              🔄
            </button>
            <button class="desktop-link-btn" (click)="goToDesktop()">
              Ir al sitio web <span>↗</span>
            </button>
            @if (reminderSvc.unreadCount() > 0) {
              <button class="notif-btn" (click)="toggleReminders()" title="Recordatorios">
                🔔
                <span class="notif-badge">{{ reminderSvc.unreadCount() }}</span>
              </button>
            }
          </div>
        </header>
      }

      <!-- Reminder Dropdown -->
      @if (showReminders()) {
        <div class="reminder-dropdown animate-fadeInDown">
          <div class="reminder-header">
            <strong>🔔 Recordatorios</strong>
            <button class="dismiss-all" (click)="dismissAllReminders()">Marcar todo leído</button>
          </div>
          @for (r of reminderSvc.reminders(); track r.id) {
            @if (!r.read) {
              <div class="reminder-item" [class.high]="r.priority === 'high'" (click)="ackReminder(r.id)">
                <span class="reminder-icon">{{ r.icon }}</span>
                <div class="reminder-body">
                  <strong>{{ r.title }}</strong>
                  <p>{{ r.message }}</p>
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- Diagnostic Toast -->
      @if (syncToast()) {
        <div class="sync-toast-banner animate-fadeInDown">
          <span>{{ syncToast() }}</span>
        </div>
      }

      <!-- Install Prompt (PWA) -->
      @if (showInstallPrompt()) {
        <div class="pwa-prompt animate-fadeInDown">
          <div class="pwa-text">
            <strong>📲 Instala tu {{ isOtRoute() ? 'Monitoreo Operativo' : 'Coach Móvil' }}</strong>
            <p>Añade a tu inicio desde las opciones de tu navegador.</p>
          </div>
          <button class="pwa-close" (click)="dismissInstall()" aria-label="Cerrar">✕</button>
        </div>
      }

      <!-- Page Content -->
      <main class="mobile-content">
        <router-outlet />
      </main>

      <!-- Bottom Navigation -->
      @if (!isInstallRoute()) {
        <nav class="bottom-nav">
          @for (tab of tabs; track tab.route) {
            <a
              class="bottom-nav-item"
              [routerLink]="tab.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: tab.exact }"
            >
              <um-icon class="tab-icon" [name]="tab.icon" [size]="30"></um-icon>
              <span class="tab-label">{{ tab.label }}</span>
            </a>
          }
        </nav>
      }
    </div>
  `,
  styles: [`
    .header-right { display: flex; align-items: center; gap: 8px; }
    .sync-refresh-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform 0.3s; }
    .sync-refresh-btn:active { transform: scale(0.85); }
    .notif-btn { position: relative; background: none; border: none; font-size: 1.3rem; cursor: pointer; padding: 4px; }
    .notif-badge { position: absolute; top: -4px; right: -6px; background: #e74c3c; color: #fff; font-size: 0.65rem; font-weight: 800; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

    .pull-refresh-banner { width: 100%; background: #edf5f2; display: flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; transition: height 0.2s ease; border-bottom: 1px solid rgba(0,40,30,0.08); }
    .refresh-spinner { font-size: 1.1rem; display: inline-block; }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .refresh-text { font-size: 0.8rem; font-weight: 700; color: #1a2e35; }

    .reminder-dropdown { position: absolute; top: 56px; left: 12px; right: 12px; background: #fff; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.15); z-index: 999; padding: 16px; max-height: 60vh; overflow-y: auto; }
    .reminder-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 0.95rem; }
    .dismiss-all { background: none; border: none; color: #6c3ce9; font-weight: 700; font-size: 0.8rem; cursor: pointer; }
    .reminder-item { display: flex; gap: 10px; padding: 10px; border-radius: 12px; background: #f8f9fa; margin-bottom: 8px; cursor: pointer; transition: background 0.2s; }
    .reminder-item:hover { background: #eef5f2; }
    .reminder-item.high { background: #fff5f5; border-left: 3px solid #e74c3c; }
    .reminder-icon { font-size: 1.4rem; flex-shrink: 0; }
    .reminder-body { flex: 1; }
    .reminder-body strong { font-size: 0.9rem; color: #1a2e35; display: block; margin-bottom: 2px; }
    .reminder-body p { font-size: 0.8rem; color: #5a7a84; margin: 0; line-height: 1.4; }

    .sync-toast-banner { background: #1a2e35; color: #00cec9; padding: 8px 16px; font-size: 0.8rem; font-weight: 700; text-align: center; border-bottom: 1px solid #00cec9; }
    .animate-fadeInDown { animation: fadeInDown 300ms ease-out both; }
    @keyframes fadeInDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
  `],
  styleUrl: 'mobile-layout.scss',
})
export class MobileLayoutComponent implements OnInit {
  readonly logoFull = LOGO_FULL;
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  reminderSvc = inject(ReminderService);
  private dataSync = inject(DataSyncService);
  private userService = inject(UserService);

  showInstallPrompt = signal(false);
  showReminders = signal(false);
  isRefreshing = signal(false);
  pullDistance = signal(0);
  syncToast = signal('');
  private touchStartY = 0;
  
  isOtRoute(): boolean {
    return this.router.url.includes('/m/ot');
  }

  isInstallRoute(): boolean {
    return this.router.url.includes('/m/install');
  }

  tabs = [
    { label: 'Hoy', icon: 'sun', route: '/m/today', exact: true },
    { label: 'Metas', icon: 'target', route: '/m/tasks', exact: true },
    { label: 'Radar', icon: 'radar', route: '/m/radar', exact: true },
    { label: 'Briefing', icon: 'briefing', route: '/m/briefing', exact: true },
  ];

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkInstallPrompt();
      // Auto-sync reminders & cloud data from backend
      this.reminderSvc.sync();
      const res = await this.dataSync.syncFromServer();
      this.showToastDiagnostic(res);
    }
  }

  private showToastDiagnostic(res: { success: boolean; msg: string; goals: number; tasks: number; radar: number }) {
    if (res) {
      this.syncToast.set(`📡 ${res.msg} | Metas: ${res.goals} | Tareas: ${res.tasks} | Radar: ${res.radar}`);
      setTimeout(() => {
        this.syncToast.set('');
      }, 6000);
    }
  }

  onTouchStart(e: TouchEvent) {
    if (!isPlatformBrowser(this.platformId)) return;
    const contentEl = document.querySelector('.mobile-content') as HTMLElement;
    const scrollTop = contentEl ? contentEl.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
    
    if (scrollTop <= 5 && e.touches.length === 1) {
      this.touchStartY = e.touches[0].clientY;
    } else {
      this.touchStartY = 0;
    }
  }

  onTouchMove(e: TouchEvent) {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.touchStartY > 0 && e.touches.length === 1) {
      const contentEl = document.querySelector('.mobile-content') as HTMLElement;
      const scrollTop = contentEl ? contentEl.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
      
      if (scrollTop <= 5) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - this.touchStartY;
        if (diff > 0) {
          this.pullDistance.set(Math.min(75, diff * 0.5));
        } else {
          this.pullDistance.set(0);
        }
      }
    }
  }

  async onTouchEnd() {
    if (this.pullDistance() > 40 && !this.isRefreshing()) {
      await this.manualSync();
    }
    this.pullDistance.set(0);
    this.touchStartY = 0;
  }

  private swUpdate = inject(SwUpdate, { optional: true });

  async manualSync() {
    this.isRefreshing.set(true);
    try {
      if (this.swUpdate?.isEnabled) {
        const hasUpdate = await this.swUpdate.checkForUpdate().catch(() => false);
        if (hasUpdate) {
          await this.swUpdate.activateUpdate().catch(() => {});
          window.location.reload();
          return;
        }
      }
      const res = await this.dataSync.syncFromServer();
      await this.reminderSvc.sync();
      this.showToastDiagnostic(res);
    } finally {
      setTimeout(() => {
        this.isRefreshing.set(false);
      }, 500);
    }
  }

  private checkInstallPrompt() {
    const nav = window.navigator as any;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone;
    const isDismissed = localStorage.getItem('um_pwa_dismissed') === '1';

    if (!isStandalone && !isDismissed) {
      this.showInstallPrompt.set(true);
    }
  }

  dismissInstall() {
    localStorage.setItem('um_pwa_dismissed', '1');
    this.showInstallPrompt.set(false);
  }

  toggleReminders() {
    this.showReminders.update(v => !v);
  }

  ackReminder(id: string) {
    this.reminderSvc.acknowledge(id);
  }

  async dismissAllReminders() {
    await this.reminderSvc.dismissAll();
    this.showReminders.set(false);
  }

  goToDesktop() {
    const user = this.userService.profile();
    const authParam = user?.id ? `?auth=${user.id}` : '';
    window.location.href = `/d/dashboard${authParam}`;
  }
}
