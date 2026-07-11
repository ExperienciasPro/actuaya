import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkOrderService } from '../../../core/services/work-order.service';
import {
  OT_STATUS_LABELS,
  OT_STATUS_ICONS,
  OT_STATUS_COLORS,
  OtStatus,
} from '../../../core/models/work-order.model';

@Component({
  selector: 'um-field-ot',
  standalone: true,
  template: `
    <div class="ot-list-page">

      <!-- ═══ Header ═══ -->
      <div class="ot-hero">
        <span class="hero-icon">🔧</span>
        <div>
          <h1>Mis Órdenes de Trabajo</h1>
          <p class="hero-sub">{{ otSvc.orders().length }} orden(es) asignadas</p>
        </div>
      </div>

      <!-- ═══ Quick Create ═══ -->
      <div class="quick-create">
        <button class="btn-new-ot" (click)="showCreate.set(!showCreate())">
          {{ showCreate() ? '✕ Cancelar' : '＋ Nueva OT (Demo)' }}
        </button>
      </div>

      @if (showCreate()) {
        <div class="create-form animate-fadeInUp">
          <input
            class="ot-input"
            type="text"
            placeholder="Título de la OT..."
            [(ngModel)]="newTitle"
            (keydown.enter)="createOt()"
          />
          <textarea
            class="ot-input ot-textarea"
            placeholder="Descripción (opcional)..."
            [(ngModel)]="newDesc"
            rows="2"
          ></textarea>
          <button class="btn-submit" [disabled]="!newTitle.trim()" (click)="createOt()">
            Crear Orden de Trabajo
          </button>
        </div>
      }

      <!-- ═══ Tab Filters ═══ -->
      <div class="tab-bar">
        @for (tab of tabs; track tab.key) {
          <button
            class="tab"
            [class.active]="activeTab() === tab.key"
            (click)="activeTab.set(tab.key)"
          >
            {{ tab.icon }} {{ tab.label }}
            <span class="tab-count">{{ getTabCount(tab.key) }}</span>
          </button>
        }
      </div>

      <!-- ═══ Order Cards ═══ -->
      <div class="ot-card-list">
        @for (ot of filteredOrders(); track ot.id) {
          <button
            class="ot-card animate-fadeInUp"
            (click)="openOt(ot.id)"
          >
            <div class="card-top">
              <span
                class="status-pill"
                [style.background]="getStatusColor(ot.status)"
              >
                {{ getStatusIcon(ot.status) }} {{ getStatusLabel(ot.status) }}
              </span>
              <span class="card-time">{{ formatDate(ot.updated_at) }}</span>
            </div>
            <h3 class="card-title">{{ ot.title }}</h3>
            @if (ot.description) {
              <p class="card-desc">{{ ot.description }}</p>
            }
            <div class="card-footer">
              <span class="card-id">🆔 {{ ot.id.slice(0, 8) }}...</span>
              <span class="card-arrow">→</span>
            </div>
          </button>
        } @empty {
          <div class="empty-state">
            <span class="empty-icon">📭</span>
            <h3>Sin órdenes</h3>
            <p>No tienes órdenes en esta categoría.</p>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: 'field-ot.scss',
  imports: [FormsModule],
})
export class FieldOtComponent {
  otSvc = inject(WorkOrderService);
  private router = inject(Router);

  activeTab = signal<string>('pending');
  showCreate = signal(false);
  newTitle = '';
  newDesc = '';

  tabs = [
    { key: 'pending', label: 'Pendientes', icon: '📋' },
    { key: 'active', label: 'Activas', icon: '🔧' },
    { key: 'done', label: 'Cerradas', icon: '✅' },
  ];

  filteredOrders = () => {
    const tab = this.activeTab();
    if (tab === 'pending') return this.otSvc.assignedOrders();
    if (tab === 'active') return this.otSvc.activeOrders();
    return this.otSvc.completedOrders();
  };

  getTabCount(key: string): number {
    if (key === 'pending') return this.otSvc.assignedOrders().length;
    if (key === 'active') return this.otSvc.activeOrders().length;
    return this.otSvc.completedOrders().length;
  }

  getStatusLabel(s: OtStatus): string { return OT_STATUS_LABELS[s]; }
  getStatusIcon(s: OtStatus): string { return OT_STATUS_ICONS[s]; }
  getStatusColor(s: OtStatus): string { return OT_STATUS_COLORS[s]; }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async createOt(): Promise<void> {
    if (!this.newTitle.trim()) return;
    const ot = await this.otSvc.createOrder(this.newTitle.trim(), this.newDesc.trim());
    if (ot) {
      // Auto-transition to asignada for demo
      await this.otSvc.transition(ot.id, 'asignada');
      this.newTitle = '';
      this.newDesc = '';
      this.showCreate.set(false);
    }
  }

  openOt(id: string): void {
    const ot = this.otSvc.getById(id);
    if (ot) {
      this.otSvc.setActive(ot);
      this.router.navigate(['/m/ot', id]);
    }
  }
}
