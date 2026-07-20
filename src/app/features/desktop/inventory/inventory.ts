import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';

import { InventoryService } from '../../../core/services/inventory.service';
import { ProductCatalogService } from '../../../core/services/product-catalog.service';
import { BusinessAutomationService } from '../../../core/services/business-automation.service';
import { InventoryProduct, INVENTORY_UNITS, ENTRY_REASONS, EXIT_REASONS, MovementType } from '../../../core/models/inventory.model';

@Component({
  selector: 'um-inventory',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, DecimalPipe, UmIconComponent],
  template: `
    <div class="inv-page">

      <!-- ═══ Header ═══ -->
      <header class="page-header">
        <div class="header-top">
          <div>
            <h1>Control de Inventario</h1>
            <p class="header-subtitle">Entradas, salidas y alertas de stock crítico.</p>
          </div>
          <button class="btn-primary" (click)="showProductForm.set(!showProductForm())">
            {{ showProductForm() ? '✕ Cerrar' : '+ Nuevo producto' }}
          </button>
        </div>
      </header>

      <!-- ═══ Critical Stock Alert ═══ -->
      @if (inv.criticalProducts().length > 0) {
        <div class="alert-banner">
          <span class="alert-icon">⚠️</span>
          <div class="alert-body">
            <strong>Stock Crítico ({{ inv.criticalProducts().length }})</strong>
            <p>
              @for (p of inv.criticalProducts(); track p.id; let last = $last) {
                <span class="alert-product" (click)="openMovement(p, 'entrada')">{{ p.name }} ({{ p.currentStock }})</span>{{ last ? '' : ', ' }}
              }
            </p>
          </div>
        </div>
      }

      <!-- ═══ Stats Row ═══ -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-icon">📦</span>
          <div>
            <p class="stat-label">Productos</p>
            <p class="stat-value">{{ inv.stats().totalProducts }}</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🏷️</span>
          <div>
            <p class="stat-label">Unidades totales</p>
            <p class="stat-value">{{ inv.stats().totalItems | number }}</p>
          </div>
        </div>
        <div class="stat-card" [class.critical]="inv.stats().criticalCount > 0">
          <span class="stat-icon">🔴</span>
          <div>
            <p class="stat-label">Stock crítico</p>
            <p class="stat-value">{{ inv.stats().criticalCount }}</p>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">💰</span>
          <div>
            <p class="stat-label">Valor inventario</p>
            <p class="stat-value">{{ inv.stats().totalValue | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
          </div>
        </div>
      </div>

      <!-- ═══ Add Product Form ═══ -->
      @if (showProductForm()) {
        <div class="form-card">
          <h3>{{ editingProductId() ? '✏️ Editar producto' : '➕ Nuevo producto' }}</h3>
          <div class="form-row-4">
            <div class="form-field">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="fName" placeholder="Ej: Cemento Portland" />
            </div>
            <div class="form-field">
              <label>SKU / Código</label>
              <input type="text" [(ngModel)]="fSku" placeholder="CP-001" />
            </div>
            <div class="form-field">
              <label>Categoría</label>
              <input type="text" [(ngModel)]="fCategory" placeholder="Materiales" />
            </div>
            <div class="form-field">
              <label>Unidad</label>
              <select [(ngModel)]="fUnit">
                @for (u of unitOptions; track u.value) {
                  <option [value]="u.value">{{ u.label }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-row-3">
            <div class="form-field">
              <label>Stock inicial</label>
              <input type="number" [(ngModel)]="fStock" placeholder="0" min="0" />
            </div>
            <div class="form-field">
              <label>Stock mínimo (alerta)</label>
              <input type="number" [(ngModel)]="fMinStock" placeholder="5" min="0" />
            </div>
            <div class="form-field">
              <label>Costo de adquisición *</label>
              <div class="price-wrap">
                <span class="prefix">$</span>
                <input type="number" [(ngModel)]="fCost" placeholder="0" min="0" />
              </div>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-field">
              <label>Precio de venta (Catálogo) *</label>
              <div class="price-wrap">
                <span class="prefix">$</span>
                <input type="number" [(ngModel)]="fSalePrice" placeholder="0" min="0" />
              </div>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-primary" [disabled]="!fName.trim() || !fSalePrice" (click)="saveProduct()">
              {{ editingProductId() ? 'Actualizar' : 'Agregar producto' }}
            </button>
            @if (editingProductId()) {
              <button class="btn-secondary" (click)="cancelEdit()">Cancelar</button>
            }
          </div>
        </div>
      }

      <!-- ═══ Movement Modal ═══ -->
      @if (movementProduct()) {
        <div class="modal-backdrop" (click)="movementProduct.set(null)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>{{ movementType() === 'entrada' ? '📥 Entrada' : '📤 Salida' }} — {{ movementProduct()!.name }}</h3>
            <p class="modal-stock">Stock actual: <strong>{{ movementProduct()!.currentStock }} {{ movementProduct()!.unit }}</strong></p>

            <div class="type-toggle">
              <button [class.active]="movementType() === 'entrada'" (click)="movementType.set('entrada')">📥 Entrada</button>
              <button [class.active]="movementType() === 'salida'" (click)="movementType.set('salida')">📤 Salida</button>
            </div>

            <div class="form-row-2">
              <div class="form-field">
                <label>Cantidad</label>
                <input type="number" [(ngModel)]="mQty" placeholder="0" min="1" />
              </div>
              <div class="form-field">
                <label>Motivo</label>
                <select [(ngModel)]="mReason">
                  @for (r of getReasons(); track r) {
                    <option [value]="r">{{ r }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn-primary" [disabled]="!mQty || mQty <= 0" (click)="confirmMovement()">
                Registrar {{ movementType() === 'entrada' ? 'entrada' : 'salida' }}
              </button>
              <button class="btn-secondary" (click)="movementProduct.set(null)">Cancelar</button>
            </div>
          </div>
        </div>
      }

      <!-- ═══ Product Table ═══ -->
      <div class="table-card">
        <div class="table-header">
          <h2>Productos ({{ inv.products().length }})</h2>
        </div>

        @if (inv.products().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">📦</span>
            <p>No hay productos en tu inventario.</p>
            <p class="empty-hint">Toca "+ Nuevo producto" para empezar.</p>
          </div>
        }

        @for (p of inv.products(); track p.id) {
          <div class="product-row" [class.critical]="p.currentStock <= p.minStock">
            <div class="product-main">
              <div class="product-name-row">
                <h4>{{ p.name }}</h4>
                @if (p.currentStock <= p.minStock) {
                  <span class="badge-critical">⚠ Crítico</span>
                }
              </div>
              <p class="product-meta">
                @if (p.sku) { {{ p.sku }} · }
                {{ p.category || 'Sin categoría' }}
                · Costo: {{ p.costPerUnit | currency:'COP':'symbol-narrow':'1.0-0' }} / {{ p.unit }}
                · Venta: {{ getProductSalePrice(p.id) | currency:'COP':'symbol-narrow':'1.0-0' }}
              </p>
            </div>

            <div class="stock-display">
              <span class="stock-current" [class.low]="p.currentStock <= p.minStock">{{ p.currentStock }}</span>
              <span class="stock-unit">{{ p.unit }}</span>
              <span class="stock-min">mín: {{ p.minStock }}</span>
            </div>

            <div class="product-actions">
              <button class="btn-action entrada" title="Comprar / Reabastecer" (click)="openMovement(p, 'entrada')">📥</button>
              <button class="btn-action salida" title="Vender" (click)="openMovement(p, 'salida')">📤</button>
              <button class="btn-action" title="Editar" (click)="editProduct(p)">✏️</button>
              <button class="btn-action danger" title="Eliminar" (click)="inv.removeProduct(p.id)"><um-icon name="trash" [size]="16"></um-icon></button>
            </div>
          </div>
        }
      </div>

      <!-- ═══ Recent Movements ═══ -->
      @if (inv.movements().length > 0) {
        <div class="table-card movements">
          <div class="table-header">
            <h2>Últimos movimientos</h2>
          </div>

          @for (m of inv.getRecentMovements(15); track m.id) {
            <div class="movement-row" [class.entrada]="m.type === 'entrada'" [class.salida]="m.type === 'salida'">
              <span class="mov-icon">{{ m.type === 'entrada' ? '📥' : '📤' }}</span>
              <div class="mov-info">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong>{{ m.productName }}</strong>
                  @if (isAutoMovement(m.id)) {
                    <span class="badge-auto">🔗 Auto</span>
                  }
                </div>
                <span class="mov-reason">{{ m.reason }}</span>
              </div>
              <div class="mov-qty" [class.plus]="m.type === 'entrada'" [class.minus]="m.type === 'salida'">
                {{ m.type === 'entrada' ? '+' : '-' }}{{ m.quantity }}
              </div>
              <span class="mov-date">{{ m.date | date:'d MMM' }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: 'inventory.scss',
})
export class InventoryComponent {
  inv = inject(InventoryService);
  private productService = inject(ProductCatalogService);
  private automationService = inject(BusinessAutomationService);

  unitOptions = INVENTORY_UNITS;

  // ─── Product form ───────────────────────
  showProductForm = signal(false);
  editingProductId = signal<string | null>(null);
  fName = '';
  fSku = '';
  fCategory = '';
  fUnit = 'unidades';
  fStock: number | null = 0;
  fMinStock: number | null = 5;
  fCost: number | null = 0;
  fSalePrice: number | null = 0;

  // ─── Movement modal ─────────────────────
  movementProduct = signal<InventoryProduct | null>(null);
  movementType = signal<MovementType>('entrada');
  mQty: number | null = null;
  mReason = 'Compra a proveedor';

  // ─── Product CRUD ───────────────────────

  saveProduct(): void {
    if (!this.fName.trim()) return;
    if (this.editingProductId()) {
      this.inv.updateProduct(this.editingProductId()!, {
        name: this.fName.trim(),
        sku: this.fSku.trim(),
        category: this.fCategory.trim(),
        unit: this.fUnit,
        minStock: this.fMinStock || 0,
        costPerUnit: this.fCost || 0,
      });
      // Actualizar el precio de venta en el modelo unificado
      this.productService.updateProduct(this.editingProductId()!, {
        salePrice: this.fSalePrice || 0
      });
      this.editingProductId.set(null);
    } else {
      this.productService.addProduct({
        name: this.fName.trim(),
        sku: this.fSku.trim(),
        category: this.fCategory.trim(),
        unit: this.fUnit,
        currentStock: this.fStock || 0,
        minStock: this.fMinStock || 0,
        costPrice: this.fCost || 0,
        salePrice: this.fSalePrice || 0,
        trackInventory: true,
        active: true
      });
    }
    this.resetForm();
    this.showProductForm.set(false);
  }

  editProduct(p: InventoryProduct): void {
    this.fName = p.name;
    this.fSku = p.sku;
    this.fCategory = p.category;
    this.fUnit = p.unit;
    this.fStock = p.currentStock;
    this.fMinStock = p.minStock;
    this.fCost = p.costPerUnit;
    
    // Obtener precio de venta desde ProductService
    const prod = this.productService.getProductById(p.id);
    this.fSalePrice = prod ? prod.salePrice : 0;

    this.editingProductId.set(p.id);
    this.showProductForm.set(true);
  }

  cancelEdit(): void {
    this.editingProductId.set(null);
    this.resetForm();
    this.showProductForm.set(false);
  }

  private resetForm(): void {
    this.fName = '';
    this.fSku = '';
    this.fCategory = '';
    this.fUnit = 'unidades';
    this.fStock = 0;
    this.fMinStock = 5;
    this.fCost = 0;
    this.fSalePrice = 0;
  }

  // ─── Movement ───────────────────────────

  openMovement(p: InventoryProduct, type: MovementType): void {
    this.movementProduct.set(p);
    this.movementType.set(type);
    this.mQty = null;
    this.mReason = type === 'entrada' ? 'Compra a proveedor' : 'Venta';
  }

  getReasons(): string[] {
    return this.movementType() === 'entrada' ? ENTRY_REASONS : EXIT_REASONS;
  }

  confirmMovement(): void {
    const product = this.movementProduct();
    if (!product || !this.mQty || this.mQty <= 0) return;

    // Obtener precio de venta y costo desde el servicio unificado
    const prod = this.productService.getProductById(product.id);
    const salePrice = prod ? prod.salePrice : 0;
    const costPrice = prod ? prod.costPrice : product.costPerUnit;

    if (this.movementType() === 'entrada' && this.mReason === 'Compra a proveedor') {
      // Registrar reabastecimiento automático + Flujo de caja
      this.automationService.registerProductPurchase(product.id, this.mQty, costPrice);
      alert(`📥 Compra registrada. Se aumentó el stock y se cargó un egreso por $${(this.mQty * costPrice).toLocaleString('es-CO')}`);
    } else if (this.movementType() === 'salida' && this.mReason === 'Venta') {
      // Registrar venta automática + Flujo de caja
      this.automationService.registerProductSale(product.id, this.mQty, salePrice);
      alert(`📤 Venta registrada. Se disminuyó el stock y se cargó un ingreso por $${(this.mQty * salePrice).toLocaleString('es-CO')}`);
    } else {
      // Registro normal clásico de movimiento sin flujo de caja asociado
      this.inv.registerMovement(product.id, this.movementType(), this.mQty, this.mReason);
    }
    this.movementProduct.set(null);
  }

  getProductSalePrice(id: string): number {
    const prod = this.productService.getProductById(id);
    return prod ? prod.salePrice : 0;
  }

  isAutoMovement(id: string): boolean {
    const mov = this.productService.movements().find((m: any) => m.id === id);
    return mov ? !!mov.autoGenerated : false;
  }
}
