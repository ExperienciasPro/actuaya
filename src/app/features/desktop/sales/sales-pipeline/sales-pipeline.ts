import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../../core/services/sales.service';
import { DataSyncService } from '../../../../core/services/data-sync.service';
import { GoalService } from '../../../../core/services/goal.service';
import { ProductDataService } from '../../../../core/services/product.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';

@Component({
  selector: 'um-sales-pipeline',
  standalone: true,
  imports: [RouterLink, DecimalPipe, FormsModule, EmptyStateComponent, ConfirmDialogComponent, UmIconComponent],
  template: `
    <div class="sales-page">
      <!-- Header -->
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <h1>Embudos de Venta</h1>
          <p class="header-subtitle">{{ funnels().length }} embudos · {{ openDeals().length }} oportunidades abiertas</p>
        </div>
        <div class="header-actions">
          <a class="btn-primary" routerLink="/d/sales/funnel/new">+ Nuevo Embudo</a>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="kpi-row animate-fadeInUp stagger-1">
        <div class="kpi-card">
          <span class="kpi-icon">💰</span>
          <div class="kpi-info">
            <span class="kpi-value">\${{ totalPipeline() | number:'1.0-0' }}</span>
            <span class="kpi-label">Valor Total</span>
          </div>
        </div>
        <div class="kpi-card won">
          <span class="kpi-icon">🏆</span>
          <div class="kpi-info">
            <span class="kpi-value">\${{ totalWon() | number:'1.0-0' }}</span>
            <span class="kpi-label">Ganado</span>
          </div>
        </div>
        <div class="kpi-card">
          <span class="kpi-icon">📊</span>
          <div class="kpi-info">
            <span class="kpi-value">{{ winRate() }}%</span>
            <span class="kpi-label">Win Rate</span>
          </div>
        </div>
        <div class="kpi-card">
          <span class="kpi-icon">📋</span>
          <div class="kpi-info">
            <span class="kpi-value">{{ openDeals().length }}</span>
            <span class="kpi-label">Oport. Abiertas</span>
          </div>
        </div>
      </div>

      <!-- Funnels List Grouped by Product -->
      @if (funnels().length) {
        <div class="funnels-container animate-fadeInUp stagger-2">
          @for (group of groupedFunnels(); track group.productId) {
            <div class="product-group">
              <h2 class="group-title">
                @if (group.product) {
                  <span class="group-icon" [style.background]="group.product.color">{{ group.product.icon || '📦' }}</span>
                  {{ group.product.name }}
                } @else {
                  <span class="group-icon gray">🔧</span>
                  General (Sin Producto)
                }
              </h2>
              <div class="funnels-grid">
                @for (funnel of group.funnels; track funnel.id; let i = $index) {
                  <div class="funnel-card" [style.animation-delay.ms]="i * 60">
                    <div class="funnel-header">
                      <h3 class="funnel-name">{{ funnel.name }}</h3>
                      <div class="funnel-actions">
                        <a class="action-link" [routerLink]="['/d/sales/funnel', funnel.id]">Ver →</a>
                        <button class="action-btn danger" (click)="confirmDeleteFunnel(funnel.id, funnel.name)"><um-icon name="trash" [size]="16"></um-icon></button>
                      </div>
                    </div>

                    <!-- Pipeline Visualization -->
                    <div class="pipeline-viz">
                      @for (stage of funnel.stages; track stage.id) {
                        <div class="stage-block">
                          <div class="stage-bar" [style.background]="stage.color" [style.height.px]="getStageHeight(funnel.id, stage.id)"></div>
                          <span class="stage-name">{{ stage.name }}</span>
                          <span class="stage-count">{{ getStageCount(funnel.id, stage.id) }}</span>
                        </div>
                      }
                    </div>

                    <div class="funnel-stats">
                      <span class="stat">{{ getDealCount(funnel.id) }} oport.</span>
                      <span class="stat">\${{ getFunnelValue(funnel.id) | number:'1.0-0' }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <um-empty-state
          icon="💼"
          title="Sin embudos de ventas"
          subtitle="Crea tu primer embudo para empezar a rastrear tus oportunidades."
        >
          <a class="btn-primary" routerLink="/d/sales/funnel/new">+ Crear embudo</a>
        </um-empty-state>
      }

      <!-- Recent Deals -->
      @if (recentDeals().length) {
        <div class="recent-section animate-fadeInUp stagger-3">
          <div class="section-header">
            <h2>Oportunidades Recientes</h2>
            <a class="action-link" routerLink="/d/sales/deals">Ver todos →</a>
          </div>
          <div class="deals-table">
            <div class="table-header">
              <span>Contacto</span>
              <span>Empresa</span>
              <span>Valor</span>
              <span>Estado</span>
            </div>
            @for (deal of recentDeals(); track deal.id) {
              <div class="table-row" [class]="deal.status">
                <span class="deal-contact">{{ deal.contactName }}</span>
                <span class="deal-company">{{ deal.company || '—' }}</span>
                <span class="deal-value">\${{ (deal.value || 0) | number:'1.0-0' }}</span>
                <span class="deal-status">
                  <span class="status-dot" [class]="deal.status"></span>
                  {{ getStatusLabel(deal.status) }}
                </span>
              </div>
            }
          </div>
        </div>
      }

      <um-confirm-dialog
        [open]="showDeleteDialog()"
        title="Eliminar embudo"
        message="Se eliminarán todas las oportunidades asociadas."
        icon="🗑️"
        confirmLabel="Eliminar"
        variant="danger"
        (confirmed)="executeDeleteFunnel()"
        (cancelled)="showDeleteDialog.set(false)"
      />
    </div>
  `,
  styleUrl: 'sales-pipeline.scss',
})
export class SalesPipelineComponent {
  private salesService = inject(SalesService);
  private dataSync = inject(DataSyncService);
  private productService = inject(ProductDataService);

  funnels = this.salesService.funnels;
  openDeals = this.salesService.openDeals;
  totalPipeline = this.salesService.totalPipelineValue;
  totalWon = this.salesService.totalWonRevenue;

  winRate = computed(() => {
    const won = this.salesService.wonDeals().length;
    const total = won + this.salesService.lostDeals().length;
    return total ? Math.round((won / total) * 100) : 0;
  });

  recentDeals = computed(() =>
    [...this.salesService.deals()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  );

  groupedFunnels = computed(() => {
    const fList = this.funnels();
    const map = new Map<string, typeof fList>();
    
    for (const f of fList) {
      const pid = f.productId || 'general';
      const arr = map.get(pid) || [];
      arr.push(f);
      map.set(pid, arr);
    }
    
    const groups = [];
    for (const [pid, funnels] of map.entries()) {
      groups.push({
        productId: pid,
        product: pid === 'general' ? null : this.productService.getById(pid),
        funnels
      });
    }
    
    // Sort: Products first (alphabetical), General at the end
    groups.sort((a, b) => {
      if (a.productId === 'general') return 1;
      if (b.productId === 'general') return -1;
      const nameA = a.product?.name || '';
      const nameB = b.product?.name || '';
      return nameA.localeCompare(nameB);
    });
    
    return groups;
  });

  showDeleteDialog = signal(false);
  deletingFunnelId = signal('');

  getDealCount(funnelId: string): number {
    return this.salesService.getByFunnel(funnelId).length;
  }

  getFunnelValue(funnelId: string): number {
    return this.salesService.getByFunnel(funnelId)
      .filter(d => d.status === 'open')
      .reduce((s, d) => s + (d.value || 0), 0);
  }

  getStageCount(funnelId: string, stageId: string): number {
    return this.salesService.getByStage(stageId).filter(d => d.funnelId === funnelId).length;
  }

  getStageHeight(funnelId: string, stageId: string): number {
    const count = this.getStageCount(funnelId, stageId);
    return Math.max(16, Math.min(60, count * 20 + 16));
  }

  getStatusLabel(status: string): string {
    return { open: 'Abierto', won: 'Ganado', lost: 'Perdido', stalled: 'Estancado' }[status] || status;
  }

  confirmDeleteFunnel(id: string, name: string): void {
    this.deletingFunnelId.set(id);
    this.showDeleteDialog.set(true);
  }

  executeDeleteFunnel(): void {
    this.salesService.deleteFunnel(this.deletingFunnelId());
    this.dataSync.saveToServerImmediate();
    this.showDeleteDialog.set(false);
  }
}
