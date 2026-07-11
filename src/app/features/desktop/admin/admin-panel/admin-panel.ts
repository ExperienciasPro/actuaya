import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { StorageService } from '../../../../core/services/storage.service';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';

@Component({
  selector: 'um-admin-panel',
  standalone: true,
  imports: [FormsModule, UmIconComponent],
  template: `
    <div class="admin-panel">
      <div class="page-header animate-fadeInUp">
        <div class="header-top">
          <div>
            <h1>🔧 Panel de Administración</h1>
            <p class="header-subtitle">Estadísticas y configuración del sistema</p>
          </div>
        </div>
      </div>


      <!-- System Info -->
      <div class="section-card animate-fadeInUp stagger-2">
        <div class="section-header">
          <h2><um-icon name="settings" [size]="22"></um-icon> Información del Sistema</h2>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Versión de la App</span>
            <span class="info-value">v1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">Framework</span>
            <span class="info-value">Angular 21.2</span>
          </div>
          <div class="info-item">
            <span class="info-label">Persistencia</span>
            <span class="info-value">localStorage</span>
          </div>
          <div class="info-item">
            <span class="info-label">Keys en Storage</span>
            <span class="info-value">{{ stats().storageKeys }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Dominio</span>
            <span class="info-value">actuaya.co</span>
          </div>
          <div class="info-item">
            <span class="info-label">Super Admin</span>
            <span class="info-value">experiencias3&#64;gmail.com</span>
          </div>
        </div>

        <div class="danger-zone">
          <h3>⚠️ Zona de Peligro</h3>
          <div class="danger-actions">
            <button class="btn-danger" (click)="clearAllData()">
              <um-icon name="trash" [size]="18"></um-icon>
              Borrar TODOS los datos del sistema
            </button>
            <button class="btn-danger secondary" (click)="exportFullBackup()">
              <um-icon name="download" [size]="18"></um-icon>
              Backup completo del sistema
            </button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      @if (toast()) {
        <div class="toast animate-fadeInUp">{{ toast() }}</div>
      }
    </div>
  `,
  styleUrl: 'admin-panel.scss',
})
export class AdminPanelComponent {
  private userService = inject(UserService);
  private storageService = inject(StorageService);
  private router = inject(Router);

  stats = computed(() => this.userService.getSystemStats());
  toast = signal('');

  constructor() {
    // Redirect if not superadmin
    if (!this.userService.isSuperAdmin()) {
      this.router.navigate(['/d/dashboard']);
      return;
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  clearAllData(): void {
    if (confirm('⚠️ ¿Estás seguro? Se eliminarán TODOS los datos del sistema. Esta acción no se puede deshacer.')) {
      this.storageService.clear();
      this.showToast('🗑️ Todos los datos eliminados. Recarga la página.');
    }
  }

  exportFullBackup(): void {
    const data: Record<string, unknown> = {};
    const keys = this.storageService.getAllKeys('um_');
    for (const key of keys) {
      const raw = this.storageService.getRaw(key);
      if (raw) {
        try { data[key] = JSON.parse(raw); }
        catch { data[key] = raw; }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actuaya-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('✅ Backup descargado');
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }
}
