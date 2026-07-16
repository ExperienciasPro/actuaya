import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService, AppTheme } from '../../../core/services/theme.service';
import { StorageService } from '../../../core/services/storage.service';
import { UserService, UserProfile } from '../../../core/services/user.service';

interface ModuleDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  superAdminOnly?: boolean;
}

interface CategoryDef {
  id: string;
  icon: string;
  title: string;
  modules: ModuleDef[];
}

@Component({
  selector: 'um-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="settings-page">
      <div class="page-header animate-fadeInUp">
        <h1>Mi Cuenta</h1>
        <p class="header-subtitle">Ajustes y preferencias de la aplicación.</p>
      </div>

      <div class="settings-grid">
        <!-- ═══ USER PROFILE ═══ -->
        <div class="settings-section animate-fadeInUp">
          <h2><span>👤</span> Información de Perfil</h2>
          <div class="profile-grid">
            <div class="input-group">
              <label>Nombre de Usuario</label>
              <input type="text" [(ngModel)]="editName" placeholder="Tu nombre..." />
            </div>
            <div class="input-group">
              <label>Correo Electrónico</label>
              <input type="email" [(ngModel)]="editEmail" placeholder="tu@correo.com" />
            </div>
            <button class="save-profile-btn" (click)="saveUserProfile()" [disabled]="!isProfileDirty()">
              Guardar Cambios
            </button>
          </div>
        </div>

        <!-- ═══ SECURITY ═══ -->
        <div class="settings-section animate-fadeInUp">
          <h2><span>🔒</span> Seguridad</h2>
          @if (!showPasswordForm()) {
            <button class="action-btn" (click)="showPasswordForm.set(true)">
              <span class="action-icon">🔑</span>
              <div class="action-info">
                <span class="action-title">Cambiar Contraseña</span>
                <span class="action-desc">Actualiza tu clave de acceso</span>
              </div>
            </button>
          } @else {
            <div class="password-form">
              <div class="input-group">
                <label>Nueva Contraseña</label>
                <input type="password" [(ngModel)]="newPassword" placeholder="Mínimo 6 caracteres" />
              </div>
              <div class="password-actions">
                <button class="save-profile-btn" (click)="updatePassword()" [disabled]="newPassword().length < 4">
                  Actualizar Clave
                </button>
                <button class="cancel-btn" (click)="showPasswordForm.set(false)">Cancelar</button>
              </div>
            </div>
          }
        </div>

        <!-- ═══ MODULE MANAGER ═══ -->
        <div class="settings-section full-width animate-fadeInUp stagger-1">
          <h2><span>🧩</span> Módulos Activos</h2>
          <p class="section-hint">
            Activa o desactiva módulos según las necesidades de tu negocio.
          </p>

          <div class="mod-manager">
            @for (cat of visibleCategories(); track cat.id) {
              <div class="mod-category">
                <div class="mod-cat-header">
                  <span class="mod-cat-icon">{{ cat.icon }}</span>
                  <span class="mod-cat-title">{{ cat.title }}</span>
                  <button class="mod-cat-toggle" (click)="toggleCategory(cat)">
                    {{ isCategoryFull(cat) ? 'Desactivar' : 'Activar' }}
                  </button>
                </div>
                <div class="mod-list">
                  @for (m of cat.modules; track m.id) {
                    <button
                      class="mod-item"
                      [class.active]="isEnabled(m.id)"
                      (click)="toggleModule(m.id)">
                      <span class="mod-icon">{{ m.icon }}</span>
                      <div class="mod-info">
                        <span class="mod-name">{{ m.name }}</span>
                        <!-- <span class="mod-desc">{{ m.desc }}</span> -->
                      </div>
                      <div class="mod-switch" [class.on]="isEnabled(m.id)">
                        <div class="mod-switch-thumb"></div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          <div class="mod-summary">
            <span class="mod-count">{{ enabledCount() }} módulos activos</span>
            <button class="mod-reset-btn" (click)="resetModules()">
              ↻ Reset
            </button>
          </div>
        </div>


        <!-- Data Management -->
        <div class="settings-section animate-fadeInUp stagger-3">
          <h2><span>💾</span> Datos</h2>
          <div class="settings-actions">
            <button class="action-btn" (click)="exportData()">
              <span class="action-icon">📤</span>
              <div class="action-info">
                <span class="action-title">Exportar</span>
                <!-- <span class="action-desc">Descarga backup JSON</span> -->
              </div>
            </button>
            <label class="action-btn import-label">
              <span class="action-icon">📥</span>
              <div class="action-info">
                <span class="action-title">Importar</span>
                <!-- <span class="action-desc">Restaura desde JSON</span> -->
              </div>
              <input type="file" accept=".json" class="file-input" (change)="importData($event)" />
            </label>
          </div>
        </div>

        <!-- About -->
        <div class="settings-section full-width animate-fadeInUp stagger-4">
          <h2><span>ℹ️</span> Acerca de</h2>
          <div class="about-flex">
            <div class="about-card">
              <span class="about-logo-emoji">✨</span>
              <div class="about-info">
                <span class="about-name">ActuaYa</span>
                <span class="about-version">v1.0.0</span>
                <span class="about-desc">Tu sistema de productividad personal y gestión comercial.</span>
              </div>
            </div>
            <div class="about-stats-row">
              <span class="stat">Local Browser Storage • No Servers • 100% Private</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast -->
      @if (toast()) {
        <div class="toast animate-fadeInUp">{{ toast() }}</div>
      }
    </div>
  `,
  styleUrl: 'settings.scss',
})
export class SettingsComponent {
  themeService = inject(ThemeService);
  private storage = inject(StorageService);
  private userService = inject(UserService);

  toast = signal('');

  // ─── Profile & Security ───────────────────
  editName = this.userService.profile()?.name || '';
  editEmail = this.userService.profile()?.email || '';
  showPasswordForm = signal(false);
  newPassword = signal('');

  isProfileDirty(): boolean {
    const current = this.userService.profile() || { name: '', email: '' };
    return this.editName !== current.name || this.editEmail !== current.email;
  }

  async saveUserProfile(): Promise<void> {
    await this.userService.saveProfile({ name: this.editName, email: this.editEmail });
    this.showToast('✅ Perfil actualizado correctamente');
  }

  updatePassword(): void {
    const user = this.userService.profile();
    if (user && this.newPassword()) {
      this.userService.updateUserPassword(user.id, this.newPassword());
      this.newPassword.set('');
      this.showPasswordForm.set(false);
      this.showToast('✅ Contraseña actualizada correctamente');
    }
  }

  // ─── Module Management ────────────────────
  private readonly MODULES_KEY = 'um_enabled_modules';

  /** All available modules by category */
  categories: CategoryDef[] = [
    {
      id: 'strategy', icon: '🚀', title: 'Estrategia & Productividad',
      modules: [
        { id: 'goals', icon: '🎯', name: 'Metas y Objetivos', desc: 'Plazos, hitos y sub-metas' },
        { id: 'projects', icon: '📋', name: 'Administrador de Proyectos', desc: 'Tableros Kanban' },
        { id: 'analytics', icon: '📊', name: 'Analítica', desc: 'KPIs unificados' },
        { id: 'coach', icon: '📱', name: 'Coach Móvil', desc: 'Prioridades del día en tu bolsillo' },
      ],
    },
    {
      id: 'commercial', icon: '🤝', title: 'Comercial & Ventas',
      modules: [
        { id: 'radar', icon: '📡', name: 'El Radar', desc: 'Gestión de contactos pre-pipeline con recordatorios automáticos' },
        { id: 'sales', icon: '📈', name: 'Marketing y Ventas', desc: 'Pipeline visual de prospectos y deals' },
        { id: 'catalog', icon: '🏷️', name: 'Catálogo & Cotizador', desc: 'Cotizaciones rápidas y envío por WhatsApp' },

      ],
    },
    {
      id: 'evaluacion', icon: '📋', title: 'Evaluación & Diagnóstico',
      modules: [
        { id: 'formularios', icon: '📋', name: 'Formularios Custom', desc: 'Formularios dinámicos para leads y encuestas' },
        { id: 'tests', icon: '🧪', name: 'Tests & Evaluaciones', desc: 'Evaluaciones psicotécnicas, de conocimientos o diagnósticos' },
        { id: 'datos', icon: '🗄️', name: 'Base de Datos', desc: 'Repositorio centralizado de información capturada' },
        { id: 'resultados', icon: '📊', name: 'Análisis de Datos', desc: 'Cruza información para obtener insights profundos' },
      ],
    },
    {
      id: 'finance', icon: '💰', title: 'Finanzas & Rentabilidad',
      modules: [
        { id: 'income', icon: '🧾', name: 'Ingresos', desc: 'Control de facturas y órdenes de compra', superAdminOnly: true },
        { id: 'cashflow', icon: '💸', name: 'Flujo de Caja', desc: 'Balance diario entre ingresos y egresos' },
        { id: 'investments', icon: '💎', name: 'Gestión de Inversiones', desc: 'Seguimiento de portafolio y retornos', superAdminOnly: true },
        { id: 'profitability', icon: '📐', name: 'Calculadora de Rentabilidad', desc: 'Margen real de productos y servicios' },
        { id: 'budget_planner', icon: '💰', name: 'Planeación Financiera', desc: 'Capital disponible y planificación de inversiones', superAdminOnly: true },
      ],
    },
    {
      id: 'operations', icon: '⚙️', title: 'Operaciones & Equipo',
      modules: [
        { id: 'inventory', icon: '📦', name: 'Control de Inventario', desc: 'Existencias con alertas de stock mínimo' },
        { id: 'menu_digital', icon: '🍽️', name: 'Menú Digital', desc: 'Carta digital para bares, restaurantes y cafés' },
        { id: 'shifts', icon: '🕐', name: 'Gestión de Turnos', desc: 'Horarios del equipo por semanas o meses' },
      ],
    },
    {
      id: 'gestion_mant', icon: '🔧', title: 'Gestión de Mantenimiento',
      modules: [
        { id: 'ceo_teo', icon: '⏲️', name: 'Soy Administrador', desc: 'Panel ejecutivo de órdenes de trabajo y KPIs operativos' },
        { id: 'asignaciones', icon: '📅', name: 'Asignaciones', desc: 'Calendario inteligente para asignar OTs a tu equipo' },
        { id: 'monitoreo', icon: '🛠️', name: 'Soy Técnico', desc: 'Asignación y seguimiento de OTs a técnicos en campo con mapa GPS' },
        { id: 'soy_cliente', icon: '👤', name: 'Soy Cliente', desc: 'Monitoreo de equipos, alertas de mantenimiento y contacto por WhatsApp' },
      ],
    },
  ];

  /** Filtered categories based on user role */
  visibleCategories = computed(() => {
    const isSuperAdmin = this.userService.isSuperAdmin();
    return this.categories
      .map(cat => ({
        ...cat,
        modules: cat.modules.filter(m => !m.superAdminOnly || isSuperAdmin),
      }))
      .filter(cat => cat.modules.length > 0);
  });

  /** Current enabled modules (reactive) */
  enabledModules = signal<Set<string>>(this.loadEnabledModules());

  enabledCount = computed(() => this.enabledModules().size);

  isEnabled(id: string): boolean {
    return this.enabledModules().has(id);
  }

  toggleModule(id: string): void {
    const next = new Set(this.enabledModules());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.enabledModules.set(next);
    this.saveModules(next);

    if (next.has(id)) {
      // Module was just enabled — check dependencies
      const depMsg = this.getActivationMessage(id, next);
      this.showToast(depMsg || `✅ ${this.getModuleName(id)} activado`);
    } else {
      this.showToast(`❌ ${this.getModuleName(id)} desactivado`);
    }
  }

  isCategoryFull(cat: CategoryDef): boolean {
    return cat.modules.every(m => this.enabledModules().has(m.id));
  }

  toggleCategory(cat: CategoryDef): void {
    const next = new Set(this.enabledModules());
    const allOn = this.isCategoryFull(cat);
    cat.modules.forEach(m => {
      if (allOn) {
        next.delete(m.id);
      } else {
        next.add(m.id);
      }
    });
    this.enabledModules.set(next);
    this.saveModules(next);
    this.showToast(allOn ? `Categoría ${cat.title} desactivada` : `✅ Categoría ${cat.title} activada`);
  }

  resetModules(): void {
    if (confirm('¿Quieres volver a seleccionar tus módulos desde cero?')) {
      this.storage.remove(this.MODULES_KEY);
      window.location.href = '/setup';
    }
  }

  private loadEnabledModules(): Set<string> {
    const saved = this.storage.get<string[]>(this.MODULES_KEY);
    if (saved) return new Set(saved);
    // Default: all enabled
    return new Set(this.visibleCategories().flatMap(c => c.modules.map(m => m.id)));
  }

  private saveModules(set: Set<string>): void {
    this.storage.set(this.MODULES_KEY, Array.from(set));
  }

  private getModuleName(id: string): string {
    for (const cat of this.categories) {
      const mod = cat.modules.find(m => m.id === id);
      if (mod) return mod.name;
    }
    return id;
  }

  // ─── Module Dependencies ───────────────────
  /**
   * Map of moduleId → { requires: related modules, hint: visible text }
   * These are "soft" dependencies — recommendations, not hard blocks.
   */
  private readonly DEPENDENCIES: Record<string, { recommends: string[]; hint: string }> = {
    analytics: {
      recommends: ['goals', 'projects', 'sales'],
      hint: 'Funciona mejor con Metas, Proyectos y Ventas activos.',
    },
    projects: {
      recommends: ['goals'],
      hint: 'Se potencia con Metas y Objetivos para vincular tareas.',
    },
    sales: {
      recommends: ['radar'],
      hint: 'Se complementa con El Radar para gestión pre-pipeline.',
    },
    radar: {
      recommends: ['sales'],
      hint: 'Se complementa con Marketing y Ventas para el pipeline completo.',
    },
    profitability: {
      recommends: ['cashflow'],
      hint: 'Se integra mejor con Flujo de Caja para análisis completo.',
    },
  };

  /** Returns a hint string if the module has dependencies that are not active */
  getDependencyHint(id: string): string | null {
    const dep = this.DEPENDENCIES[id];
    if (!dep) return null;
    const missing = dep.recommends.filter(r => !this.enabledModules().has(r));
    if (missing.length === 0) return null;
    return dep.hint;
  }

  /** Returns an activation message mentioning missing recommended modules */
  private getActivationMessage(id: string, enabled: Set<string>): string | null {
    const dep = this.DEPENDENCIES[id];
    if (!dep) return null;
    const missing = dep.recommends.filter(r => !enabled.has(r));
    if (missing.length === 0) return null;
    const names = missing.map(m => this.getModuleName(m)).join(', ');
    return `✅ ${this.getModuleName(id)} activado · 💡 Recomendado activar: ${names}`;
  }


  // ─── Data Management ──────────────────────
  exportData(): void {
    const data: Record<string, unknown> = {};
    const keys = this.storage.getAllKeys('um_');
    for (const key of keys) {
      const raw = this.storage.getRaw(key);
      if (raw) {
        try { data[key] = JSON.parse(raw); }
        catch { data[key] = raw; }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `una-meta-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('✅ Datos exportados');
  }

  importData(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        Object.entries(data).forEach(([key, value]) => {
          this.storage.set(key, value);
        });
        this.showToast('✅ Datos importados. Recarga la página.');
      } catch {
        this.showToast('❌ Error al importar');
      }
    };
    reader.readAsText(file);
  }



  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
