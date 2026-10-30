import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductCatalogService } from '../../../../core/services/product-catalog.service';
import { Product, ProductOfferType } from '../../../../core/models/product.model';
import { UNIT_OPTIONS } from '../../../../core/models/catalog.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';

interface ProductFormState {
  name: string;
  sku: string;
  itemType: ProductOfferType;
  category: string;
  description: string;
  includesOrDeliverables: string;
  deliveryTime: string;
  salePrice: number | null;
  costPrice: number | null;
  unit: string;
  currency: 'COP' | 'USD';
  taxRate: number | null;
  icon: string;
  color: string;
  active: boolean;
  trackInventory: boolean;
  currentStock: number;
  minStock: number;
}

@Component({
  selector: 'um-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EmptyStateComponent,
    ConfirmDialogComponent,
    RouterLink,
    UmIconComponent,
  ],
  template: `
    <div class="products-page">
      <!-- ═══ Header ═══ -->
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <h1>Productos y Servicios</h1>
          <p class="header-subtitle">
            Catálogo único para tus cotizaciones, embudos de venta e inventario.
          </p>
        </div>
        <div class="header-actions">
          <a class="btn-secondary link-btn" routerLink="/d/catalog">
            📝 Ir al Cotizador
          </a>
          <button type="button" class="btn-primary" (click)="openCreate()">
            + Nuevo Producto o Servicio
          </button>
        </div>
      </div>

      <!-- ═══ KPI Strip ═══ -->
      @if (products().length > 0) {
        <div class="kpi-strip animate-fadeInUp">
          <div class="kpi-card">
            <span class="kpi-icon">📚</span>
            <div>
              <div class="kpi-value">{{ products().length }}</div>
              <div class="kpi-label">Total ({{ activeCount() }} activos)</div>
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">📦</span>
            <div>
              <div class="kpi-value">{{ physicalCount() }}</div>
              <div class="kpi-label">Productos físicos</div>
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">✨</span>
            <div>
              <div class="kpi-value">{{ servicesCount() }}</div>
              <div class="kpi-label">Servicios y digitales</div>
            </div>
          </div>
          <div class="kpi-card" [class.alert]="criticalStockCount() > 0">
            <span class="kpi-icon">{{ criticalStockCount() > 0 ? '⚠️' : '✅' }}</span>
            <div>
              <div class="kpi-value">{{ criticalStockCount() }}</div>
              <div class="kpi-label">Stock en alerta</div>
            </div>
          </div>
        </div>

        <!-- ═══ Search & Filter Bar ═══ -->
        <div class="filter-panel animate-fadeInUp">
          <div class="filter-top-row">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Buscar por nombre, código SKU, categoría o descripción..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
              />
              @if (searchQuery()) {
                <button type="button" class="clear-btn" (click)="searchQuery.set('')">✕</button>
              }
            </div>

            <div class="filter-selects">
              @if (categories().length > 1) {
                <select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)">
                  <option value="">Todas las categorías</option>
                  @for (cat of categories(); track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              }

              <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
                <option value="all">Todos los estados</option>
                <option value="active">Disponibles para cotizar</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>

          <div class="type-chips">
            @for (opt of offerTypeFilters; track opt.value) {
              <button
                type="button"
                class="type-chip"
                [class.active]="typeFilter() === opt.value"
                (click)="typeFilter.set(opt.value)"
              >
                {{ opt.icon }} {{ opt.label }}
              </button>
            }

            @if (hasActiveFilters()) {
              <button type="button" class="reset-filters-btn" (click)="clearFilters()">
                🔄 Limpiar filtros
              </button>
            }
          </div>
        </div>
      }

      <!-- ═══ Listing ═══ -->
      @if (filteredProducts().length > 0) {
        <div class="products-grid animate-fadeInUp stagger-1">
          @for (product of filteredProducts(); track product.id) {
            <div class="product-card" [class.inactive]="!product.active">
              <div class="card-header">
                <div class="product-icon" [style.background]="product.color || '#6366f1'">
                  {{ product.icon || getDefaultIcon(getResolvedType(product)) }}
                </div>
                <div class="product-info">
                  <div class="title-row">
                    <h3>{{ product.name }}</h3>
                    @if (!product.active) {
                      <span class="status-pill inactive-pill">Inactivo</span>
                    }
                  </div>
                  <div class="badges-row">
                    <span class="type-badge">{{ getOfferTypeLabel(getResolvedType(product)) }}</span>
                    @if (product.category) {
                      <span class="category-badge">{{ product.category }}</span>
                    }
                    @if (product.sku) {
                      <span class="sku-badge">SKU: {{ product.sku }}</span>
                    }
                  </div>
                </div>
              </div>

              <div class="card-body">
                @if (product.description) {
                  <p class="description">{{ product.description }}</p>
                }

                @if (product.includesOrDeliverables || product.deliveryTime || product.taxRate !== undefined) {
                  <div class="extra-meta-list">
                    @if (product.includesOrDeliverables) {
                      <div class="meta-line">
                        <span class="meta-icon">📋</span>
                        <span>{{ product.includesOrDeliverables }}</span>
                      </div>
                    }
                    <div class="meta-pills">
                      @if (product.deliveryTime) {
                        <span class="mini-pill">⏱️ {{ product.deliveryTime }}</span>
                      }
                      @if (product.taxRate !== undefined && product.taxRate !== null) {
                        <span class="mini-pill">
                          🧾 {{ product.taxRate === 0 ? 'Exento IVA' : 'IVA ' + product.taxRate + '%' }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <div class="pricing-box">
                  <div class="price-main">
                    <span class="label">Precio de venta</span>
                    <div class="value-wrap">
                      <span class="value">
                        {{ product.salePrice | currency:(product.currency || 'COP'):'symbol-narrow':'1.0-0' }}
                      </span>
                      <span class="unit-label">/ {{ product.unit || 'unidad' }}</span>
                    </div>
                  </div>

                  <div class="sub-metrics">
                    @if (product.costPrice > 0 && product.salePrice > 0) {
                      <span class="margin-tag" [class.positive]="getMarginPercent(product.salePrice, product.costPrice) > 0">
                        Margen: {{ getMarginPercent(product.salePrice, product.costPrice) }}%
                      </span>
                    }

                    @if (product.trackInventory) {
                      <span
                        class="stock-tag"
                        [class.critical]="product.currentStock <= product.minStock"
                      >
                        {{ product.currentStock <= product.minStock ? '⚠️' : '📦' }}
                        Stock: {{ product.currentStock }} {{ product.unit }}
                      </span>
                    } @else {
                      <span class="stock-tag service-stock">♾️ Disponible sin stock</span>
                    }
                  </div>
                </div>
              </div>

              <div class="card-actions">
                @if (product.active) {
                  <a
                    class="btn-quote-quick"
                    [routerLink]="['/d/catalog']"
                    [queryParams]="{ add: product.id }"
                    title="Crear o agregar a cotización"
                  >
                    📝 Cotizar
                  </a>
                } @else {
                  <span class="inactive-hint">Actívalo para cotizar</span>
                }

                <div class="icon-actions">
                  <button type="button" class="btn-icon" title="Editar" (click)="openEdit(product)">
                    ✏️
                  </button>
                  <button
                    type="button"
                    class="btn-icon"
                    [title]="product.active ? 'Pausar / Desactivar' : 'Activar para cotizar'"
                    (click)="toggleActive(product)"
                  >
                    {{ product.active ? '⏸️' : '▶️' }}
                  </button>
                  <button
                    type="button"
                    class="btn-icon danger"
                    title="Eliminar"
                    (click)="confirmDelete(product)"
                  >
                    <um-icon name="trash" [size]="16"></um-icon>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      } @else if (products().length > 0) {
        <um-empty-state
          icon="🔍"
          title="Sin resultados para tu búsqueda"
          subtitle="Prueba ajustando el texto de búsqueda o limpiando los filtros activos."
        >
          <button type="button" class="btn-secondary" (click)="clearFilters()">Limpiar filtros</button>
        </um-empty-state>
      } @else {
        <um-empty-state
          icon="📦"
          title="Sin productos ni servicios configurados"
          subtitle="Crea aquí tus productos o servicios una sola vez y úsalos directamente en el Cotizador, Embudos de Venta e Inventario."
        >
          <button type="button" class="btn-primary" (click)="openCreate()">
            + Crear primer producto o servicio
          </button>
        </um-empty-state>
      }

      <!-- ═══ Slide Panel Create / Edit ═══ -->
      @if (panelMode() !== 'closed') {
        <div class="panel-backdrop" (click)="closePanel()"></div>
        <div class="slide-panel">
          <div class="panel-header">
            <div>
              <h2>
                {{ panelMode() === 'create' ? 'Nuevo Producto o Servicio' : 'Editar Producto o Servicio' }}
              </h2>
              <p class="panel-subtitle">
                Esta información se usará automáticamente al generar cotizaciones.
              </p>
            </div>
            <button type="button" class="btn-close" (click)="closePanel()">✕</button>
          </div>

          <div class="panel-body">
            <!-- SECCIÓN 1: CLASIFICACIÓN E IDENTIDAD -->
            <div class="form-section">
              <div class="section-title">1. Clasificación e Identificación</div>

              <div class="form-group">
                <label>Tipo de oferta *</label>
                <div class="offer-type-grid">
                  @for (opt of offerTypes; track opt.value) {
                    <button
                      type="button"
                      class="offer-type-option"
                      [class.selected]="form().itemType === opt.value"
                      (click)="onSelectOfferType(opt.value)"
                    >
                      <span class="opt-icon">{{ opt.icon }}</span>
                      <span class="opt-label">{{ opt.label }}</span>
                    </button>
                  }
                </div>
              </div>

              <div class="form-group">
                <label>Nombre comercial del producto o servicio *</label>
                <input
                  type="text"
                  [ngModel]="form().name"
                  (ngModelChange)="updateForm('name', $event)"
                  placeholder="Ej: Mantenimiento Preventivo Industrial / Licencia Anual"
                />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Código / SKU (Opcional)</label>
                  <div class="input-with-action">
                    <input
                      type="text"
                      [ngModel]="form().sku"
                      (ngModelChange)="updateForm('sku', $event)"
                      placeholder="Ej: SRV-001"
                    />
                    <button
                      type="button"
                      class="mini-action-btn"
                      title="Autogenerar código SKU"
                      (click)="generateSku()"
                    >
                      ⚡ Auto
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label>Categoría / Línea comercial</label>
                  <input
                    type="text"
                    list="commercial-categories-list"
                    [ngModel]="form().category"
                    (ngModelChange)="updateForm('category', $event)"
                    placeholder="Ej: Consultoría, Equipos, Software..."
                  />
                  <datalist id="commercial-categories-list">
                    @for (cat of suggestedCategories(); track cat) {
                      <option [value]="cat"></option>
                    }
                  </datalist>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Ícono visual (Emoji)</label>
                  <div class="emoji-row">
                    <input
                      type="text"
                      class="emoji-input"
                      maxlength="4"
                      [ngModel]="form().icon"
                      (ngModelChange)="updateForm('icon', $event)"
                    />
                    <div class="emoji-presets">
                      @for (em of quickEmojis; track em) {
                        <button
                          type="button"
                          class="emoji-chip"
                          [class.active]="form().icon === em"
                          (click)="updateForm('icon', em)"
                        >
                          {{ em }}
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <div class="form-group" style="max-width: 110px;">
                  <label>Color</label>
                  <input
                    type="color"
                    class="color-input"
                    [ngModel]="form().color"
                    (ngModelChange)="updateForm('color', $event)"
                  />
                </div>
              </div>
            </div>

            <!-- SECCIÓN 2: PRECIOS, COSTOS Y UNIDAD -->
            <div class="form-section">
              <div class="section-title">2. Precio, Costo y Unidad de Cotización</div>

              <div class="form-row">
                <div class="form-group" style="flex: 1.4;">
                  <label>Precio de venta *</label>
                  <input
                    type="number"
                    min="0"
                    [ngModel]="form().salePrice"
                    (ngModelChange)="updateForm('salePrice', $event)"
                    placeholder="0"
                  />
                </div>

                <div class="form-group" style="flex: 0.8;">
                  <label>Moneda</label>
                  <select
                    [ngModel]="form().currency"
                    (ngModelChange)="updateForm('currency', $event)"
                  >
                    <option value="COP">COP ($)</option>
                    <option value="USD">USD (US$)</option>
                  </select>
                </div>

                <div class="form-group" style="flex: 1;">
                  <label>Unidad de medida *</label>
                  <select
                    [ngModel]="form().unit"
                    (ngModelChange)="updateForm('unit', $event)"
                  >
                    @for (u of unitOptions; track u.value) {
                      <option [value]="u.value">{{ u.label }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Costo unitario / base (Opcional)</label>
                  <input
                    type="number"
                    min="0"
                    [ngModel]="form().costPrice"
                    (ngModelChange)="updateForm('costPrice', $event)"
                    placeholder="0 (Para calcular margen)"
                  />
                </div>

                <div class="form-group">
                  <label>IVA referencial del ítem</label>
                  <select
                    [ngModel]="form().taxRate"
                    (ngModelChange)="updateForm('taxRate', $event === '' || $event === null ? null : +$event)"
                  >
                    <option [ngValue]="null">Según formato de cotización</option>
                    <option [ngValue]="19">19% (Tarifa general)</option>
                    <option [ngValue]="5">5% (Tarifa reducida)</option>
                    <option [ngValue]="0">0% (Exento / Excluido)</option>
                  </select>
                </div>
              </div>

              @if ((form().salePrice || 0) > 0 && (form().costPrice || 0) > 0) {
                <div
                  class="margin-preview"
                  [class.negative]="(form().salePrice || 0) < (form().costPrice || 0)"
                >
                  <span>
                    💡 Utilidad estimada:
                    <strong>
                      {{ ((form().salePrice || 0) - (form().costPrice || 0)) | currency:form().currency:'symbol-narrow':'1.0-0' }}
                    </strong>
                  </span>
                  <span>
                    Margen bruto:
                    <strong>
                      {{ getMarginPercent(form().salePrice || 0, form().costPrice || 0) }}%
                    </strong>
                  </span>
                </div>
              }
            </div>

            <!-- SECCIÓN 3: DETALLE PARA COTIZACIONES -->
            <div class="form-section">
              <div class="section-title">3. Detalle Comercial para Cotizaciones</div>

              <div class="form-group">
                <label>Descripción comercial (aparece en la cotización PDF)</label>
                <textarea
                  rows="3"
                  [ngModel]="form().description"
                  (ngModelChange)="updateForm('description', $event)"
                  placeholder="Describe características técnicas, beneficios o detalle de lo que recibe el cliente..."
                ></textarea>
              </div>

              <div class="form-group">
                <label>Alcance, entregables o garantía (Opcional)</label>
                <input
                  type="text"
                  [ngModel]="form().includesOrDeliverables"
                  (ngModelChange)="updateForm('includesOrDeliverables', $event)"
                  placeholder="Ej: Incluye instalación, soporte 30 días y garantía de 1 año"
                />
              </div>

              <div class="form-group">
                <label>Tiempo estimado de entrega o ejecución (Opcional)</label>
                <input
                  type="text"
                  [ngModel]="form().deliveryTime"
                  (ngModelChange)="updateForm('deliveryTime', $event)"
                  placeholder="Ej: Entrega inmediata / 5 días hábiles / 2 semanas"
                />
              </div>
            </div>

            <!-- SECCIÓN 4: INVENTARIO Y DISPONIBILIDAD -->
            <div class="form-section">
              <div class="section-title">4. Disponibilidad e Inventario</div>

              <label class="toggle-card">
                <input
                  type="checkbox"
                  [ngModel]="form().active"
                  (ngModelChange)="updateForm('active', $event)"
                />
                <div>
                  <div class="toggle-title">Disponible para cotizar y vender</div>
                  <div class="toggle-desc">
                    Aparecerá activo en el Cotizador, Embudos de Venta y POS.
                  </div>
                </div>
              </label>

              <label class="toggle-card">
                <input
                  type="checkbox"
                  [ngModel]="form().trackInventory"
                  (ngModelChange)="updateForm('trackInventory', $event)"
                />
                <div>
                  <div class="toggle-title">Controlar existencias en inventario</div>
                  <div class="toggle-desc">
                    Actívalo para productos físicos con stock limitado. Desactívalo para servicios.
                  </div>
                </div>
              </label>

              @if (form().trackInventory) {
                <div class="form-row stock-inputs">
                  <div class="form-group">
                    <label>
                      {{ panelMode() === 'create' ? 'Stock inicial' : 'Stock actual' }}
                    </label>
                    <input
                      type="number"
                      min="0"
                      [ngModel]="form().currentStock"
                      (ngModelChange)="updateForm('currentStock', $event)"
                    />
                  </div>
                  <div class="form-group">
                    <label>Stock mínimo (alerta)</label>
                    <input
                      type="number"
                      min="0"
                      [ngModel]="form().minStock"
                      (ngModelChange)="updateForm('minStock', $event)"
                    />
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="panel-footer">
            <button type="button" class="btn-secondary" (click)="closePanel()">Cancelar</button>
            <button
              type="button"
              class="btn-primary"
              (click)="saveProduct()"
              [disabled]="!canSave()"
            >
              {{ panelMode() === 'create' ? 'Guardar Producto / Servicio' : 'Guardar Cambios' }}
            </button>
          </div>
        </div>
      }

      <um-confirm-dialog
        [open]="showDeleteDialog()"
        title="Eliminar producto o servicio"
        message="¿Estás seguro de eliminar este ítem? Ya no aparecerá disponible en el Cotizador ni en los Embudos de Venta."
        icon="🗑️"
        confirmLabel="Eliminar"
        variant="danger"
        (confirmed)="executeDelete()"
        (cancelled)="showDeleteDialog.set(false)"
      />
    </div>
  `,
  styles: [`
    .products-page { padding: 24px 28px; max-width: 1240px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .header-left h1 { margin: 0 0 6px 0; font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
    .header-subtitle { margin: 0; color: #64748b; font-size: 14.5px; }
    .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .link-btn { text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }

    /* KPI Strip */
    .kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 2px 8px rgba(15,23,42,0.02); }
    .kpi-card.alert { border-color: #fed7aa; background: #fffbeb; }
    .kpi-icon { font-size: 24px; width: 42px; height: 42px; border-radius: 10px; background: #f8fafc; display: flex; align-items: center; justify-content: center; }
    .kpi-value { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.1; }
    .kpi-label { font-size: 12.5px; color: #64748b; margin-top: 2px; font-weight: 500; }

    /* Search & Filter Panel */
    .filter-panel { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px; }
    .filter-top-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .search-box { flex: 1; min-width: 240px; position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 12px; font-size: 14px; color: #94a3b8; pointer-events: none; }
    .search-box input { width: 100%; padding: 10px 34px 10px 36px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; }
    .clear-btn { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px; }
    .filter-selects { display: flex; gap: 10px; flex-wrap: wrap; }
    .filter-selects select { padding: 10px 12px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 13.5px; background: white; color: #1e293b; }

    .type-chips { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .type-chip { padding: 6px 13px; border-radius: 999px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
    .type-chip:hover { border-color: #cbd5e1; color: #0f172a; }
    .type-chip.active { background: #eff6ff; border-color: #3b82f6; color: #1d4ed8; }
    .reset-filters-btn { margin-left: auto; background: none; border: none; color: #2563eb; font-size: 12.5px; font-weight: 600; cursor: pointer; }

    /* Product Cards Grid */
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
    .product-card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 14px rgba(15,23,42,0.03); border: 1px solid #e2e8f0; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; }
    .product-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,23,42,0.06); }
    .product-card.inactive { opacity: 0.65; background: #f8fafc; }

    .card-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
    .product-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; flex-shrink: 0; }
    .product-info { flex: 1; min-width: 0; }
    .title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .product-info h3 { margin: 0; font-size: 17px; font-weight: 700; color: #0f172a; line-height: 1.25; }
    .status-pill { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .inactive-pill { background: #e2e8f0; color: #475569; }

    .badges-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .type-badge { padding: 3px 8px; border-radius: 6px; background: #eef2ff; color: #4338ca; font-size: 11.5px; font-weight: 600; }
    .category-badge { padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #475569; font-size: 11.5px; font-weight: 500; }
    .sku-badge { padding: 3px 8px; border-radius: 6px; background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; font-size: 11px; font-family: monospace; }

    .card-body { flex: 1; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .description { margin: 0; color: #475569; font-size: 13.5px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .extra-meta-list { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #64748b; }
    .meta-line { display: flex; gap: 6px; align-items: flex-start; line-height: 1.35; }
    .meta-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .mini-pill { background: #f8fafc; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; color: #475569; }

    .pricing-box { margin-top: auto; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
    .price-main { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .price-main .label { font-size: 12px; color: #64748b; font-weight: 500; }
    .value-wrap { display: flex; align-items: baseline; gap: 4px; }
    .price-main .value { font-size: 18px; font-weight: 800; color: #0f172a; }
    .unit-label { font-size: 12px; color: #64748b; }

    .sub-metrics { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    .margin-tag { font-size: 11.5px; font-weight: 700; color: #64748b; }
    .margin-tag.positive { color: #059669; }
    .stock-tag { font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: #ecfdf5; color: #047857; }
    .stock-tag.critical { background: #fef2f2; color: #dc2626; }
    .stock-tag.service-stock { background: #f1f5f9; color: #64748b; }

    .card-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-top: 14px; border-top: 1px solid #f1f5f9; }
    .btn-quote-quick { text-decoration: none; padding: 7px 14px; border-radius: 8px; background: #eff6ff; color: #1d4ed8; font-size: 13px; font-weight: 700; transition: all 0.15s; }
    .btn-quote-quick:hover { background: #dbeafe; }
    .inactive-hint { font-size: 12px; color: #94a3b8; font-style: italic; }
    .icon-actions { display: flex; gap: 6px; }
    .btn-icon { width: 34px; height: 34px; border-radius: 8px; border: none; background: #f8fafc; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
    .btn-icon:hover { background: #e2e8f0; }
    .btn-icon.danger:hover { background: #fee2e2; color: #ef4444; }

    /* Slide Panel */
    .panel-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.35); backdrop-filter: blur(2px); z-index: 100; animation: fadeIn 0.2s; }
    .slide-panel { position: fixed; top: 0; right: 0; bottom: 0; width: min(560px, 100vw); background: white; z-index: 101; box-shadow: -8px 0 32px rgba(15,23,42,0.14); display: flex; flex-direction: column; animation: slideIn 0.25s cubic-bezier(0.16,1,0.3,1); }
    .panel-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
    .panel-header h2 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; color: #0f172a; }
    .panel-subtitle { margin: 0; font-size: 13px; color: #64748b; }
    .btn-close { background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer; padding: 4px; }
    .panel-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 22px; }
    .panel-footer { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc; }

    /* Form Sections */
    .form-section { display: flex; flex-direction: column; gap: 14px; padding-bottom: 18px; border-bottom: 1px solid #f1f5f9; }
    .form-section:last-child { border-bottom: none; padding-bottom: 0; }
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #3b82f6; }

    .offer-type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .offer-type-option { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 10px; border: 1px solid #cbd5e1; background: white; cursor: pointer; font-size: 12.5px; font-weight: 600; color: #334155; transition: all 0.15s; text-align: left; }
    .offer-type-option:hover { border-color: #94a3b8; background: #f8fafc; }
    .offer-type-option.selected { border-color: #3b82f6; background: #eff6ff; color: #1d4ed8; box-shadow: 0 0 0 2px rgba(59,130,246,0.12); }
    .opt-icon { font-size: 16px; }

    .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
    .form-row { display: flex; gap: 12px; flex-wrap: wrap; }
    label { font-size: 12.5px; font-weight: 600; color: #475569; }
    input, select, textarea { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 9px; font-size: 14px; color: #0f172a; transition: border-color 0.15s; font-family: inherit; width: 100%; box-sizing: border-box; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

    .input-with-action { display: flex; gap: 6px; }
    .mini-action-btn { padding: 0 10px; border-radius: 9px; border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .mini-action-btn:hover { background: #e2e8f0; }

    .emoji-row { display: flex; gap: 8px; align-items: center; }
    .emoji-input { width: 54px !important; text-align: center; font-size: 18px; padding: 8px !important; flex-shrink: 0; }
    .emoji-presets { display: flex; gap: 4px; flex-wrap: wrap; }
    .emoji-chip { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; }
    .emoji-chip.active { border-color: #3b82f6; background: #eff6ff; }
    .color-input { padding: 4px !important; height: 40px; cursor: pointer; }

    .margin-preview { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 10px 14px; border-radius: 10px; font-size: 13px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    .margin-preview.negative { background: #fef2f2; border-color: #fecaca; color: #991b1b; }

    .toggle-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; cursor: pointer; }
    .toggle-card input[type="checkbox"] { width: 18px; height: 18px; margin-top: 2px; cursor: pointer; }
    .toggle-title { font-size: 13.5px; font-weight: 700; color: #0f172a; }
    .toggle-desc { font-size: 12px; color: #64748b; margin-top: 2px; }
    .stock-inputs { background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px dashed #cbd5e1; }

    .btn-primary { background: #3b82f6; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.15s; }
    .btn-primary:hover:not(:disabled) { background: #2563eb; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: white; color: #334155; border: 1px solid #cbd5e1; padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.15s; }
    .btn-secondary:hover { background: #f8fafc; border-color: #94a3b8; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

    @media (max-width: 640px) {
      .offer-type-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class ProductsComponent {
  private catalogService = inject(ProductCatalogService);

  products = this.catalogService.products;
  categories = this.catalogService.categories;
  unitOptions = UNIT_OPTIONS;

  readonly offerTypes: { value: ProductOfferType; label: string; icon: string }[] = [
    { value: 'producto', label: 'Producto Físico', icon: '📦' },
    { value: 'servicio', label: 'Servicio', icon: '✨' },
    { value: 'consultoria', label: 'Consultoría', icon: '💼' },
    { value: 'suscripcion', label: 'Suscripción', icon: '🔄' },
    { value: 'curso', label: 'Curso / Digital', icon: '🎓' },
    { value: 'otro', label: 'Otro', icon: '🏷️' },
  ];

  readonly offerTypeFilters: { value: 'all' | ProductOfferType; label: string; icon: string }[] = [
    { value: 'all', label: 'Todos', icon: '📚' },
    { value: 'producto', label: 'Productos', icon: '📦' },
    { value: 'servicio', label: 'Servicios', icon: '✨' },
    { value: 'consultoria', label: 'Consultoría', icon: '💼' },
    { value: 'suscripcion', label: 'Suscripciones', icon: '🔄' },
    { value: 'curso', label: 'Cursos / Digital', icon: '🎓' },
  ];

  readonly quickEmojis = ['📦', '✨', '💼', '🛠️', '💻', '🔄', '🎓', '🚀'];

  // Filters
  searchQuery = signal('');
  typeFilter = signal<'all' | ProductOfferType>('all');
  categoryFilter = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // KPI metrics
  activeCount = computed(() => this.products().filter(p => p.active).length);
  physicalCount = computed(() =>
    this.products().filter(p => this.getResolvedType(p) === 'producto').length
  );
  servicesCount = computed(() =>
    this.products().filter(p => this.getResolvedType(p) !== 'producto').length
  );
  criticalStockCount = computed(() => this.catalogService.criticalStockProducts().length);

  suggestedCategories = computed(() => {
    const defaults = [
      'Servicios Profesionales',
      'Consultoría',
      'Mantenimiento y Soporte',
      'Software y Licencias',
      'Equipos e Insumos',
      'Productos',
    ];
    return Array.from(new Set([...this.categories(), ...defaults])).sort();
  });

  hasActiveFilters = computed(() =>
    Boolean(
      this.searchQuery().trim() ||
      this.typeFilter() !== 'all' ||
      this.categoryFilter() ||
      this.statusFilter() !== 'all'
    )
  );

  filteredProducts = computed(() => {
    let list = this.products();
    const q = this.searchQuery().toLowerCase().trim();
    const t = this.typeFilter();
    const cat = this.categoryFilter();
    const st = this.statusFilter();

    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.includesOrDeliverables || '').toLowerCase().includes(q)
      );
    }

    if (t !== 'all') {
      list = list.filter(p => this.getResolvedType(p) === t);
    }

    if (cat) {
      list = list.filter(p => (p.category || '').trim() === cat);
    }

    if (st === 'active') {
      list = list.filter(p => p.active);
    } else if (st === 'inactive') {
      list = list.filter(p => !p.active);
    }

    return list;
  });

  // Panel & Delete state
  panelMode = signal<'closed' | 'create' | 'edit'>('closed');
  editingId = signal<string | null>(null);
  showDeleteDialog = signal(false);
  deletingId = signal<string | null>(null);

  form = signal<ProductFormState>(this.createEmptyForm());

  canSave = computed(() => {
    const f = this.form();
    return Boolean(f.name.trim()) && f.salePrice !== null && Number(f.salePrice) >= 0;
  });

  private createEmptyForm(): ProductFormState {
    return {
      name: '',
      sku: '',
      itemType: 'servicio',
      category: 'Servicios Profesionales',
      description: '',
      includesOrDeliverables: '',
      deliveryTime: '',
      salePrice: null,
      costPrice: null,
      unit: 'servicio',
      currency: 'COP',
      taxRate: null,
      icon: '✨',
      color: '#6366f1',
      active: true,
      trackInventory: false,
      currentStock: 0,
      minStock: 0,
    };
  }

  getResolvedType(product: Product): ProductOfferType {
    return product.itemType || (product.trackInventory ? 'producto' : 'servicio');
  }

  getOfferTypeLabel(type: ProductOfferType): string {
    const found = this.offerTypes.find(o => o.value === type);
    return found ? found.label : 'General';
  }

  getDefaultIcon(type: ProductOfferType): string {
    const found = this.offerTypes.find(o => o.value === type);
    return found ? found.icon : '📦';
  }

  getMarginPercent(salePrice: number, costPrice: number): number {
    if (!salePrice || salePrice <= 0) return 0;
    return Math.round(((salePrice - costPrice) / salePrice) * 100);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.typeFilter.set('all');
    this.categoryFilter.set('');
    this.statusFilter.set('all');
  }

  updateForm<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]): void {
    this.form.update(prev => ({ ...prev, [key]: value }));
  }

  onSelectOfferType(type: ProductOfferType): void {
    const isCreate = this.panelMode() === 'create';
    const defaultUnits: Record<ProductOfferType, string> = {
      producto: 'unidad',
      servicio: 'servicio',
      consultoria: 'hora',
      suscripcion: 'mes',
      curso: 'unidad',
      otro: 'unidad',
    };
    const defaultCategories: Record<ProductOfferType, string> = {
      producto: 'Productos',
      servicio: 'Servicios Profesionales',
      consultoria: 'Consultoría',
      suscripcion: 'Suscripciones',
      curso: 'Cursos y Digital',
      otro: 'General',
    };

    this.form.update(prev => ({
      ...prev,
      itemType: type,
      icon: isCreate ? this.getDefaultIcon(type) : prev.icon,
      unit: isCreate ? defaultUnits[type] : prev.unit,
      category: isCreate || !prev.category.trim() ? defaultCategories[type] : prev.category,
      trackInventory: isCreate ? type === 'producto' : prev.trackInventory,
    }));
  }

  generateSku(): void {
    const f = this.form();
    const prefixes: Record<ProductOfferType, string> = {
      producto: 'PRD',
      servicio: 'SRV',
      consultoria: 'CNS',
      suscripcion: 'SUB',
      curso: 'CRS',
      otro: 'ITM',
    };
    const prefix = prefixes[f.itemType] || 'ITM';
    const nextNum = String(this.products().length + 1).padStart(3, '0');
    this.updateForm('sku', `${prefix}-${nextNum}`);
  }

  openCreate(): void {
    this.form.set(this.createEmptyForm());
    this.editingId.set(null);
    this.panelMode.set('create');
  }

  openEdit(product: Product): void {
    const resolvedType = this.getResolvedType(product);
    this.form.set({
      name: product.name,
      sku: product.sku || '',
      itemType: resolvedType,
      category: product.category || 'General',
      description: product.description || '',
      includesOrDeliverables: product.includesOrDeliverables || '',
      deliveryTime: product.deliveryTime || '',
      salePrice: product.salePrice,
      costPrice: product.costPrice || null,
      unit: product.unit || 'unidad',
      currency: product.currency || 'COP',
      taxRate: product.taxRate !== undefined ? product.taxRate : null,
      icon: product.icon || this.getDefaultIcon(resolvedType),
      color: product.color || '#6366f1',
      active: product.active,
      trackInventory: product.trackInventory,
      currentStock: product.currentStock || 0,
      minStock: product.minStock || 0,
    });
    this.editingId.set(product.id);
    this.panelMode.set('edit');
  }

  closePanel(): void {
    this.panelMode.set('closed');
    this.editingId.set(null);
  }

  saveProduct(): void {
    const f = this.form();
    if (!f.name.trim() || f.salePrice === null) return;

    const payload: Partial<Product> = {
      name: f.name.trim(),
      sku: f.sku.trim(),
      itemType: f.itemType,
      category: f.category.trim() || this.getOfferTypeLabel(f.itemType),
      description: f.description.trim(),
      includesOrDeliverables: f.includesOrDeliverables.trim(),
      deliveryTime: f.deliveryTime.trim(),
      salePrice: Math.max(0, Number(f.salePrice) || 0),
      costPrice: Math.max(0, Number(f.costPrice) || 0),
      unit: f.unit || 'unidad',
      currency: f.currency,
      taxRate: f.taxRate !== null && f.taxRate !== undefined ? Number(f.taxRate) : undefined,
      icon: f.icon.trim() || this.getDefaultIcon(f.itemType),
      color: f.color || '#6366f1',
      active: f.active,
      trackInventory: f.trackInventory,
      currentStock: f.trackInventory ? Math.max(0, Number(f.currentStock) || 0) : 0,
      minStock: f.trackInventory ? Math.max(0, Number(f.minStock) || 0) : 0,
    };

    if (this.panelMode() === 'edit' && this.editingId()) {
      this.catalogService.updateProduct(this.editingId()!, payload);
    } else {
      this.catalogService.addProduct(payload);
    }

    this.closePanel();
  }

  toggleActive(product: Product): void {
    this.catalogService.updateProduct(product.id, { active: !product.active });
  }

  confirmDelete(product: Product): void {
    this.deletingId.set(product.id);
    this.showDeleteDialog.set(true);
  }

  executeDelete(): void {
    const id = this.deletingId();
    if (id) {
      this.catalogService.deleteProduct(id);
    }
    this.showDeleteDialog.set(false);
    this.deletingId.set(null);
  }
}
