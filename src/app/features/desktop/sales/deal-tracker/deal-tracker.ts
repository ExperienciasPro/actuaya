import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../../core/services/sales.service';
import { Deal, DealStatus } from '../../../../core/models/sales-funnel.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'um-deal-tracker',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="deals-page">
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <a class="back-link" routerLink="/d/sales">← Pipeline</a>
          <h1>Todas las Oportunidades</h1>
          <p class="header-subtitle">{{ filteredDeals().length }} oportunidades</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-row animate-fadeInUp stagger-1">
        @for (f of statusFilters; track f.value) {
          <button class="filter-btn" [class.active]="statusFilter() === f.value" (click)="statusFilter.set(f.value)">
            {{ f.label }}
            <span class="filter-count">{{ getCount(f.value) }}</span>
          </button>
        }
      </div>

      @if (filteredDeals().length) {
        <!-- Stats Row -->
        <div class="stats-row animate-fadeInUp stagger-2">
          <div class="stat-card">
            <span class="stat-value">\${{ filteredValue() | number:'1.0-0' }}</span>
            <span class="stat-label">Valor total</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">\${{ averageValue() | number:'1.0-0' }}</span>
            <span class="stat-label">Promedio por oportunidad</span>
          </div>
        </div>

        <!-- Deals Table -->
        <div class="deals-table animate-fadeInUp stagger-3">
          <div class="table-header">
            <span>Contacto</span>
            <span>Empresa</span>
            <span>Embudo</span>
            <span>Valor</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          @for (deal of filteredDeals(); track deal.id) {
            <div class="table-row">
              <span class="cell-contact">{{ deal.contactName }}</span>
              <span class="cell-company">{{ deal.company || '—' }}</span>
              <span class="cell-funnel">{{ getFunnelName(deal.funnelId) }}</span>
              <span class="cell-value">\${{ (deal.value || 0) | number:'1.0-0' }}</span>
              <span class="cell-status">
                <span class="status-dot" [class]="deal.status"></span>
                {{ getStatusLabel(deal.status) }}
              </span>
              <div class="cell-actions">
                @if (deal.status === 'open') {
                  <button class="action-btn win" (click)="closeDeal(deal.id, 'won')" title="Ganado">✓</button>
                  <button class="action-btn lose" (click)="closeDeal(deal.id, 'lost')" title="Perdido">✗</button>
                }
                <button class="action-btn danger" (click)="confirmDelete(deal.id)">🗑️</button>
              </div>
            </div>
          }
        </div>
      } @else {
        <um-empty-state
          icon="💼"
          title="Sin oportunidades"
          subtitle="Crea oportunidades desde un embudo para empezar a rastrearlas."
        >
          <a class="btn-primary" routerLink="/d/sales">Ir al pipeline</a>
        </um-empty-state>
      }

      <um-confirm-dialog
        [open]="showDelete()"
        title="Eliminar oportunidad"
        message="Se eliminará esta oportunidad permanentemente."
        icon="🗑️"
        confirmLabel="Eliminar"
        variant="danger"
        (confirmed)="executeDelete()"
        (cancelled)="showDelete.set(false)"
      />
    </div>
  `,
  styleUrl: 'deal-tracker.scss',
})
export class DealTrackerComponent {
  private salesService = inject(SalesService);

  statusFilter = signal<DealStatus | 'all'>('all');
  statusFilters: { value: DealStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'open', label: 'Abiertos' },
    { value: 'won', label: 'Ganados' },
    { value: 'lost', label: 'Perdidos' },
    { value: 'stalled', label: 'Estancados' },
  ];

  filteredDeals = computed(() => {
    const all = this.salesService.deals();
    const filter = this.statusFilter();
    return filter === 'all' ? all : all.filter(d => d.status === filter);
  });

  filteredValue = computed(() =>
    this.filteredDeals().reduce((s, d) => s + (d.value || 0), 0)
  );

  averageValue = computed(() => {
    const deals = this.filteredDeals();
    return deals.length ? this.filteredValue() / deals.length : 0;
  });

  showDelete = signal(false);
  deletingId = signal('');

  getCount(status: DealStatus | 'all'): number {
    const all = this.salesService.deals();
    return status === 'all' ? all.length : all.filter(d => d.status === status).length;
  }

  getFunnelName(funnelId: string): string {
    return this.salesService.getFunnelById(funnelId)?.name || '—';
  }

  getStatusLabel(status: string): string {
    return { open: 'Abierto', won: 'Ganado', lost: 'Perdido', stalled: 'Estancado' }[status] || status;
  }

  closeDeal(id: string, status: 'won' | 'lost'): void {
    this.salesService.closeDeal(id, status);
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
    this.showDelete.set(true);
  }

  executeDelete(): void {
    this.salesService.deleteDeal(this.deletingId());
    this.showDelete.set(false);
  }
}
