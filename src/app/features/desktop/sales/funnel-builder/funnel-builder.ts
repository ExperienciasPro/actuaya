import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalesService } from '../../../../core/services/sales.service';
import { GoalService } from '../../../../core/services/goal.service';
import { ProductDataService } from '../../../../core/services/product.service';
import { FunnelStage } from '../../../../core/models/sales-funnel.model';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';

@Component({
  selector: 'um-funnel-builder',
  standalone: true,
  imports: [FormsModule, RouterLink, UmIconComponent],
  template: `
    <div class="funnel-builder-page">
      <div class="page-header animate-fadeInUp">
        <a class="back-link" routerLink="/d/sales">← Pipeline</a>
        <h1>Nuevo Embudo</h1>
        <p class="header-subtitle">Define las etapas de tu proceso de ventas.</p>
      </div>

      <form class="builder-form animate-fadeInUp stagger-1" (ngSubmit)="onSubmit()">
        <!-- Name -->
        <div class="form-section">
          <label class="form-label" for="name">Nombre del embudo *</label>
          <input id="name" class="form-input" type="text" [(ngModel)]="name" name="name"
            placeholder="Ej: Embudo de ventas B2B" required maxlength="80" />
        </div>

        <!-- Goal Link -->
        @if (goals().length) {
          <div class="form-section">
            <label class="form-label" for="goalId">Meta asociada</label>
            <select id="goalId" class="form-input" [(ngModel)]="goalId" name="goalId">
              <option value="">Sin meta asociada</option>
              @for (g of goals(); track g.id) {
                <option [value]="g.id">{{ g.title }}</option>
              }
            </select>
          </div>
        }

        <!-- Product Link -->
        <div class="form-section">
          <label class="form-label" for="productId">Producto / Servicio asociado</label>
          @if (products().length) {
            <select id="productId" class="form-input" [(ngModel)]="productId" name="productId">
              <option value="">Sin producto asociado (General)</option>
              @for (p of products(); track p.id) {
                <option [value]="p.id">{{ p.icon || '📦' }} {{ p.name }}</option>
              }
            </select>
          } @else {
            <div class="empty-products-alert">
              <p>Aún no tienes productos o servicios configurados.</p>
              <a routerLink="/d/sales/products" class="btn-ghost btn-small">Configurar Productos</a>
            </div>
          }
        </div>

        <!-- Stages Builder -->
        <div class="form-section">
          <label class="form-label">Etapas del embudo</label>
          <div class="stages-list">
            @for (stage of stages(); track stage.id; let i = $index) {
              <div class="stage-item" [style.border-left-color]="stage.color">
                <span class="stage-order">{{ i + 1 }}</span>
                <input class="form-input stage-input" [(ngModel)]="stage.name" [name]="'stage-' + i"
                  placeholder="Nombre de la etapa" />
                <input class="color-input" type="color" [(ngModel)]="stage.color" [name]="'color-' + i" />
                <button type="button" class="remove-btn" (click)="removeStage(i)" [disabled]="stages().length <= 2"><um-icon name="trash" [size]="14"></um-icon></button>
              </div>
            }
          </div>
          <button type="button" class="add-stage-btn" (click)="addStage()" [disabled]="stages().length >= 8">
            + Agregar etapa
          </button>
        </div>

        <!-- Preview -->
        <div class="form-section">
          <label class="form-label">Vista previa</label>
          <div class="funnel-preview">
            @for (stage of stages(); track stage.id; let i = $index) {
              <div class="preview-stage" [style.background]="stage.color" [style.width.%]="100 - i * 10"></div>
            }
          </div>
        </div>

        <div class="form-actions">
          <a class="btn-ghost" routerLink="/d/sales">Cancelar</a>
          <button type="submit" class="btn-primary" [disabled]="!isValid()">💼 Crear Embudo</button>
        </div>
      </form>
    </div>
  `,
  styleUrl: 'funnel-builder.scss',
})
export class FunnelBuilderComponent {
  private salesService = inject(SalesService);
  private goalService = inject(GoalService);
  private productService = inject(ProductDataService);
  private router = inject(Router);

  goals = this.goalService.goals;
  products = this.productService.activeProducts;
  name = signal('');
  goalId = signal('');
  productId = signal('');

  private defaultStages: FunnelStage[] = [
    { id: crypto.randomUUID(), name: 'Prospecto', order: 0, color: '#54a0ff', deals: [] },
    { id: crypto.randomUUID(), name: 'Contacto', order: 1, color: '#6c5ce7', deals: [] },
    { id: crypto.randomUUID(), name: 'Propuesta', order: 2, color: '#feca57', deals: [] },
    { id: crypto.randomUUID(), name: 'Negociación', order: 3, color: '#ff6b6b', deals: [] },
    { id: crypto.randomUUID(), name: 'Cierre', order: 4, color: '#00cec9', deals: [] },
  ];

  stages = signal<FunnelStage[]>([...this.defaultStages]);

  isValid = () => this.name().trim().length >= 3 && this.stages().length >= 2;

  addStage(): void {
    this.stages.update(s => [...s, {
      id: crypto.randomUUID(),
      name: '',
      order: s.length,
      color: '#8b95a9',
      deals: [],
    }]);
  }

  removeStage(index: number): void {
    this.stages.update(s => s.filter((_, i) => i !== index));
  }

  onSubmit(): void {
    if (!this.isValid()) return;
    const funnel = this.salesService.createFunnel({
      name: this.name().trim(),
      goalId: this.goalId() || '',
      productId: this.productId() || undefined,
      stages: this.stages().map((s, i) => ({ ...s, order: i })),
    });
    this.router.navigate(['/d/sales/funnel', funnel.id]);
  }
}
