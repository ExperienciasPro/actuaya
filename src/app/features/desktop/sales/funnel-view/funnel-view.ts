import { Component, inject, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { SalesService } from '../../../../core/services/sales.service';
import { ProductDataService } from '../../../../core/services/product.service';
import { Deal } from '../../../../core/models/sales-funnel.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'um-funnel-view',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, ConfirmDialogComponent],
  template: `
    <div class="funnel-view-page">
      @if (funnel(); as f) {
        <div class="page-header animate-fadeInUp">
          <div class="header-breadcrumbs">
            <a class="back-link" routerLink="/d/sales">← Pipeline</a>
            @if (funnelProduct(); as p) {
              <span class="separator">/</span>
              <span class="product-badge" [style.background]="p.color + '20'" [style.color]="p.color">
                {{ p.icon || '📦' }} {{ p.name }}
              </span>
            }
          </div>
          <div class="header-row">
            <h1>{{ f.name }}</h1>
            <button class="btn-primary" (click)="showAddDeal.set(true)">+ Nuevo Deal</button>
          </div>
          <p class="header-subtitle">{{ funnelDeals().length }} deals · \${{ funnelValue() | number:'1.0-0' }} en pipeline</p>
        </div>

        <!-- Kanban Board -->
        <div class="kanban-board animate-fadeInUp stagger-1">
          @for (stage of f.stages; track stage.id) {
            <div class="kanban-column">
              <div class="column-header" [style.border-bottom-color]="stage.color">
                <span class="column-dot" [style.background]="stage.color"></span>
                <h3>{{ stage.name }}</h3>
                <span class="column-count">{{ getDealsForStage(stage.id).length }}</span>
              </div>
              <div class="column-body">
                @for (deal of getDealsForStage(stage.id); track deal.id) {
                  <div class="deal-card" [class.won]="deal.status === 'won'" [class.lost]="deal.status === 'lost'">
                    <div class="deal-top">
                      <span class="deal-name">{{ deal.contactName }}</span>
                      <button class="deal-menu-btn" (click)="confirmDeleteDeal(deal.id)">×</button>
                    </div>
                    @if (deal.company) {
                      <span class="deal-company">{{ deal.company }}</span>
                    }
                    <span class="deal-value">\${{ (deal.value || 0) | number:'1.0-0' }}</span>
                    <div class="deal-actions">
                      @if (getNextStage(stage.id); as nextStage) {
                        <button class="move-btn" (click)="moveDeal(deal.id, nextStage.id)" title="Mover a {{ nextStage.name }}">→</button>
                      }
                      @if (deal.status === 'open') {
                        <button class="win-btn" (click)="closeDeal(deal.id, 'won')" title="Ganado">✓</button>
                        <button class="lose-btn" (click)="closeDeal(deal.id, 'lost')" title="Perdido">✗</button>
                      }
                    </div>
                  </div>
                }
                @if (!getDealsForStage(stage.id).length) {
                  <div class="empty-col">Sin deals</div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="not-found animate-fadeInUp">
          <span class="nf-icon">🔍</span>
          <h2>Embudo no encontrado</h2>
          <a class="btn-primary" routerLink="/d/sales">Volver al pipeline</a>
        </div>
      }

      <!-- Add Deal Modal -->
      @if (showAddDeal()) {
        <div class="modal-overlay" (click)="showAddDeal.set(false)">
          <div class="modal-card animate-fadeInUp" (click)="$event.stopPropagation()">
            <h3>Nuevo Deal</h3>
            <div class="modal-form">
              <input class="form-input" [(ngModel)]="newDealContact" placeholder="Nombre del contacto *" />
              <input class="form-input" [(ngModel)]="newDealCompany" placeholder="Empresa (opcional)" />
              <input class="form-input" type="number" [(ngModel)]="newDealValue" placeholder="Valor ($)" />
              <select class="form-input" [(ngModel)]="newDealStage">
                @for (stage of funnel()?.stages || []; track stage.id) {
                  <option [value]="stage.id">{{ stage.name }}</option>
                }
              </select>
            </div>
            <div class="modal-actions">
              <button class="btn-ghost" (click)="showAddDeal.set(false)">Cancelar</button>
              <button class="btn-primary" [disabled]="!newDealContact().trim()" (click)="addDeal()">Agregar</button>
            </div>
          </div>
        </div>
      }

      <um-confirm-dialog
        [open]="showDeleteDealDialog()"
        title="Eliminar deal"
        message="Se eliminará este deal permanentemente."
        icon="🗑️"
        confirmLabel="Eliminar"
        variant="danger"
        (confirmed)="executeDeleteDeal()"
        (cancelled)="showDeleteDealDialog.set(false)"
      />
    </div>
  `,
  styleUrl: 'funnel-view.scss',
})
export class FunnelViewComponent {
  private salesService = inject(SalesService);
  private productService = inject(ProductDataService);
  private route = inject(ActivatedRoute);

  private funnelId = this.route.snapshot.paramMap.get('id') || '';

  funnel = computed(() => this.salesService.getFunnelById(this.funnelId));
  funnelProduct = computed(() => {
    const f = this.funnel();
    return f?.productId ? this.productService.getById(f.productId) : null;
  });
  funnelDeals = computed(() => this.salesService.getByFunnel(this.funnelId));
  funnelValue = computed(() =>
    this.funnelDeals().filter(d => d.status === 'open').reduce((s, d) => s + (d.value || 0), 0)
  );

  showAddDeal = signal(false);
  newDealContact = signal('');
  newDealCompany = signal('');
  newDealValue = signal(0);
  newDealStage = signal('');

  showDeleteDealDialog = signal(false);
  deletingDealId = signal('');

  getDealsForStage(stageId: string): Deal[] {
    return this.salesService.getByFunnel(this.funnelId).filter(d => d.stageId === stageId);
  }

  getNextStage(currentStageId: string) {
    const stages = this.funnel()?.stages || [];
    const idx = stages.findIndex(s => s.id === currentStageId);
    return idx < stages.length - 1 ? stages[idx + 1] : null;
  }

  moveDeal(dealId: string, stageId: string): void {
    this.salesService.moveDealToStage(dealId, stageId);
  }

  closeDeal(dealId: string, status: 'won' | 'lost'): void {
    this.salesService.closeDeal(dealId, status);
  }

  addDeal(): void {
    const stageId = this.newDealStage() || this.funnel()?.stages[0]?.id || '';
    this.salesService.createDeal({
      funnelId: this.funnelId,
      stageId,
      contactName: this.newDealContact().trim(),
      company: this.newDealCompany().trim() || undefined,
      value: this.newDealValue() || 0,
      currency: 'USD',
      status: 'open',
      lastContactDate: new Date(),
    });
    this.newDealContact.set('');
    this.newDealCompany.set('');
    this.newDealValue.set(0);
    this.showAddDeal.set(false);
  }

  confirmDeleteDeal(id: string): void {
    this.deletingDealId.set(id);
    this.showDeleteDealDialog.set(true);
  }

  executeDeleteDeal(): void {
    this.salesService.deleteDeal(this.deletingDealId());
    this.showDeleteDealDialog.set(false);
  }
}
