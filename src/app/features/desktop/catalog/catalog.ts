import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';

import { CatalogItem, QuoteLineItem, QuoteTemplate, DEFAULT_QUOTE_TEMPLATE, QUOTE_COLOR_PRESETS, QUOTE_FONT_OPTIONS, UNIT_OPTIONS } from '../../../core/models/catalog.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { ProductCatalogService } from '../../../core/services/product-catalog.service';
import { BusinessAutomationService } from '../../../core/services/business-automation.service';

type Tab = 'catalog' | 'quote' | 'history' | 'format';

@Component({
  selector: 'um-catalog',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, UmIconComponent],
  template: `
    <div class="catalog-page">

      <!-- ═══ Header ═══ -->
      <header class="page-header">
        <div class="header-top">
          <div>
            <h1>Catálogo & Cotizador</h1>
            <p class="header-subtitle">Tus productos y servicios listos para cotizar en menos de 1 minuto.</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tab-bar">
          <button class="tab" [class.active]="activeTab() === 'catalog'" (click)="activeTab.set('catalog')">
            📦 Catálogo ({{ cat.items().length }})
          </button>
          <button class="tab" [class.active]="activeTab() === 'quote'" (click)="activeTab.set('quote')">
            📝 Cotizador
            @if (quoteItems().length > 0) {
              <span class="tab-badge">{{ quoteItems().length }}</span>
            }
          </button>
          <button class="tab" [class.active]="activeTab() === 'history'" (click)="activeTab.set('history')">
            📋 Historial ({{ cat.quotes().length }})
          </button>
          <button class="tab" [class.active]="activeTab() === 'format'" (click)="activeTab.set('format')">
            🎨 Formato
          </button>
        </div>
      </header>

      <!-- ═══════════════ TAB: CATÁLOGO ═══════════════ -->
      @if (activeTab() === 'catalog') {
        <div class="catalog-section">

          <!-- Search & Filter Bar -->
          <div class="search-filter-bar">
            <div class="search-wrap">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                class="search-input"
                placeholder="Buscar productos o servicios..."
                [ngModel]="catalogSearch()"
                (ngModelChange)="catalogSearch.set($event)"
              />
              @if (catalogSearch()) {
                <button class="clear-search" (click)="catalogSearch.set('')">✕</button>
              }
            </div>
            @if (categories().length > 1) {
              <div class="filter-chips">
                <button
                  class="filter-chip"
                  [class.active]="!catalogCategory()"
                  (click)="catalogCategory.set('')">
                  Todas ({{ cat.items().length }})
                </button>
                @for (c of categories(); track c) {
                  <button
                    class="filter-chip"
                    [class.active]="catalogCategory() === c"
                    (click)="catalogCategory.set(catalogCategory() === c ? '' : c)">
                    {{ c }} ({{ categoryCount(c) }})
                  </button>
                }
              </div>
            }
          </div>

          <!-- Add product form -->
          <div class="add-form-card">
            <h3>{{ editingId() ? '✏️ Editar producto' : '➕ Agregar producto o servicio' }}</h3>
            <div class="form-row-3">
              <div class="form-field">
                <label>Nombre</label>
                <input type="text" [(ngModel)]="formName" placeholder="Ej: Consultoría estratégica" />
              </div>
              <div class="form-field">
                <label>Precio</label>
                <div class="price-wrap">
                  <span class="prefix">$</span>
                  <input type="number" [(ngModel)]="formPrice" placeholder="0" min="0" />
                </div>
              </div>
              <div class="form-field">
                <label>Unidad</label>
                <select [(ngModel)]="formUnit">
                  @for (u of unitOptions; track u.value) {
                    <option [value]="u.value">{{ u.label }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-field">
                <label>Descripción (opcional)</label>
                <input type="text" [(ngModel)]="formDesc" placeholder="Breve descripción" />
              </div>
              <div class="form-field">
                <label>Categoría</label>
                <input type="text" [(ngModel)]="formCategory" placeholder="Ej: Consultoría" />
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-save" [disabled]="!formName.trim() || !formPrice" (click)="saveItem()">
                {{ editingId() ? 'Actualizar' : 'Agregar al catálogo' }}
              </button>
              @if (editingId()) {
                <button class="btn-cancel" (click)="cancelEdit()">Cancelar</button>
              }
            </div>
          </div>

          <!-- Product list -->
          @if (filteredItems().length === 0 && cat.items().length > 0) {
            <div class="empty-state">
              <span class="empty-icon">🔍</span>
              <p>No se encontraron productos para "{{ catalogSearch() }}"</p>
              <button class="btn-sm" (click)="catalogSearch.set(''); catalogCategory.set('')">Limpiar filtros</button>
            </div>
          } @else if (cat.items().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📦</span>
              <p>Tu catálogo está vacío.</p>
              <p class="empty-hint">Agrega tu primer producto o servicio arriba.</p>
            </div>
          }

          @for (item of filteredItems(); track item.id) {
            <div class="product-row" [class.inactive]="!item.active">
              <div class="product-info">
                <h4>{{ item.name }}</h4>
                <p class="product-meta">
                  <span class="meta-tag">{{ item.category }}</span>
                  @if (item.description) { · {{ item.description }} }
                  · <span class="stock-badge" [class.low-stock]="getProductStock(item.id) <= 2">Stock: {{ getProductStock(item.id) }} {{ item.unit }}</span>
                </p>
              </div>
              <div class="product-price">
                {{ item.price | currency:'COP':'symbol-narrow':'1.0-0' }}
                <span class="price-unit">/ {{ item.unit }}</span>
              </div>
              <div class="product-actions">
                <button class="btn-icon" title="Agregar a cotización" (click)="addToQuote(item)">📝</button>
                <button class="btn-icon" title="Editar" (click)="editItem(item)">✏️</button>
                <button class="btn-icon danger" title="Eliminar" (click)="cat.removeItem(item.id)"><um-icon name="trash" [size]="16"></um-icon></button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ═══════════════ TAB: COTIZADOR ═══════════════ -->
      @if (activeTab() === 'quote') {
        <div class="quote-section">

          <!-- Client info -->
          <div class="client-card">
            <h3>👤 Datos del cliente</h3>
            <div class="form-row-3">
              <div class="form-field">
                <label>Nombre</label>
                <input type="text" [(ngModel)]="clientName" placeholder="Nombre del cliente" />
              </div>
              <div class="form-field">
                <label>WhatsApp</label>
                <input type="tel" [(ngModel)]="clientPhone" placeholder="+57 300 123 4567" />
              </div>
              <div class="form-field">
                <label>Email (opcional)</label>
                <input type="email" [(ngModel)]="clientEmail" placeholder="cliente&#64;correo.com" />
              </div>
            </div>
          </div>

          <!-- IVA -->
          <div class="client-card" style="margin-top: 16px;">
            <h3>💰 IVA / Impuestos</h3>
            <div class="form-row-2">
              <div class="form-field">
                <label>Manejo del IVA</label>
                <select [(ngModel)]="tpl.ivaMode" (ngModelChange)="saveTemplate()">
                  <option value="included">Precios incluyen IVA</option>
                  <option value="excluded">Precios NO incluyen IVA (se suma al total)</option>
                  <option value="exempt">Exento de IVA</option>
                </select>
              </div>
              <div class="form-field">
                <label>Porcentaje IVA (%)</label>
                <input type="number" [(ngModel)]="tpl.ivaRate" (ngModelChange)="saveTemplate()" min="0" max="100" [disabled]="tpl.ivaMode === 'exempt'" />
              </div>
            </div>
            <p class="iva-hint">
              @if (tpl.ivaMode === 'included') {
                Los precios mostrados ya incluyen el {{ tpl.ivaRate }}% de IVA.
              } @else if (tpl.ivaMode === 'excluded') {
                Se agregará {{ tpl.ivaRate }}% de IVA al subtotal en la cotización.
              } @else {
                La cotización aparecerá marcada como exenta de IVA.
              }
            </p>
          </div>

          <!-- Quick-add from catalog -->
          <div class="quick-add-card">
            <h3>⚡ Agregar del catálogo</h3>
            <div class="quick-items">
              @for (item of cat.activeItems(); track item.id) {
                <button class="quick-chip" (click)="addToQuote(item)" [class.in-quote]="isInQuote(item.id)">
                  {{ item.name }} (Stock: {{ getProductStock(item.id) }}) · {{ item.price | currency:'COP':'symbol-narrow':'1.0-0' }}
                </button>
              }
              @if (cat.activeItems().length === 0) {
                <p class="no-items-hint">No hay productos en el catálogo. Ve a la pestaña Catálogo para agregar.</p>
              }
            </div>
          </div>

          <!-- Quote line items -->
          <div class="quote-items-card">
            <h3>🧾 Ítems de la cotización</h3>

            @if (quoteItems().length === 0) {
              <div class="empty-state small">
                <p>Agrega productos del catálogo para armar tu cotización.</p>
              </div>
            }

            @for (item of quoteItems(); track item.catalogId; let i = $index) {
              <div class="quote-line">
                <div class="line-info">
                  <strong>{{ item.name }}</strong>
                  <span class="line-unit">{{ item.unitPrice | currency:'COP':'symbol-narrow':'1.0-0' }} / {{ item.unit }}</span>
                </div>
                <div class="line-qty">
                  <button class="qty-btn" (click)="changeQty(i, -1)">−</button>
                  <input type="number" [ngModel]="item.quantity" (ngModelChange)="setQty(i, $event)" min="1" class="qty-input" />
                  <button class="qty-btn" (click)="changeQty(i, 1)">+</button>
                </div>
                <div class="line-total">
                  {{ item.quantity * item.unitPrice | currency:'COP':'symbol-narrow':'1.0-0' }}
                </div>
                <button class="btn-remove-line" (click)="removeLine(i)">✕</button>
              </div>
            }

            @if (quoteItems().length > 0) {
              <div class="quote-total-row">
                <span>TOTAL</span>
                <strong>{{ quoteTotal() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
              </div>
            }
          </div>

          <!-- Notes & Validity -->
          <div class="notes-card">
            <div class="form-row-2">
              <div class="form-field">
                <label>Notas (opcional)</label>
                <textarea [(ngModel)]="quoteNotes" rows="2" placeholder="Condiciones de pago, entrega, etc."></textarea>
              </div>
              <div class="form-field">
                <label>Validez (días)</label>
                <input type="number" [(ngModel)]="validDays" min="1" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="send-actions">
            <button
              class="btn-whatsapp"
              [disabled]="quoteItems().length === 0 || !clientName.trim()"
              (click)="sendWhatsApp()">
              <span class="wa-icon">📱</span> Enviar por WhatsApp
            </button>
            <button
              class="btn-print"
              [disabled]="quoteItems().length === 0"
              (click)="printQuote()">
              🖨️ Imprimir / PDF
            </button>
            <button
              class="btn-email"
              [disabled]="quoteItems().length === 0 || !clientEmail.trim()"
              (click)="sendEmail()">
              ✉️ Enviar por Email
            </button>
            <button
              class="btn-copy"
              [disabled]="quoteItems().length === 0"
              (click)="copyQuoteHTML()">
              📋 Copiar Formato HTML
            </button>
            <button
              class="btn-save-quote"
              [disabled]="quoteItems().length === 0"
              (click)="saveAndClear()">
              💾 Guardar
            </button>
          </div>
        </div>
      }

      <!-- ═══════════════ TAB: HISTORIAL ═══════════════ -->
      @if (activeTab() === 'history') {
        <div class="history-section">

          <!-- History search -->
          @if (cat.quotes().length > 0) {
            <div class="search-filter-bar">
              <div class="search-wrap">
                <span class="search-icon">🔍</span>
                <input
                  type="text"
                  class="search-input"
                  placeholder="Buscar cotizaciones por cliente..."
                  [ngModel]="historySearch()"
                  (ngModelChange)="historySearch.set($event)"
                />
                @if (historySearch()) {
                  <button class="clear-search" (click)="historySearch.set('')">✕</button>
                }
              </div>
            </div>
          }

          @if (filteredQuotes().length === 0 && cat.quotes().length > 0) {
            <div class="empty-state">
              <span class="empty-icon">🔍</span>
              <p>No se encontraron cotizaciones para "{{ historySearch() }}"</p>
              <button class="btn-sm" (click)="historySearch.set('')">Limpiar búsqueda</button>
            </div>
          } @else if (cat.quotes().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📋</span>
              <p>No tienes cotizaciones guardadas.</p>
            </div>
          }

          @for (q of filteredQuotes(); track q.id) {
            <div class="history-row" [class.sold-row]="q.status === 'sold'">
              <div class="history-info">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h4>{{ q.clientName }}</h4>
                  @if (q.status === 'sold') {
                    <span class="status-badge sold">✅ Vendida</span>
                  } @else {
                    <span class="status-badge pending">⏳ Pendiente</span>
                  }
                </div>
                <p class="history-meta">{{ q.createdAt | date:'d MMM yyyy, HH:mm' }} · {{ q.items.length }} ítems</p>
              </div>
              <div class="history-total">
                {{ getTotal(q) | currency:'COP':'symbol-narrow':'1.0-0' }}
              </div>
              <div class="history-actions">
                @if (q.status !== 'sold') {
                  <button class="btn-icon success-btn" title="Marcar como vendida" (click)="markAsSold(q.id)">✅</button>
                  <button class="btn-icon" title="Editar" (click)="editQuote(q)">✏️</button>
                }
                <button class="btn-icon" title="Reimprimir" (click)="reprintQuote(q)">🖨️</button>
                <button class="btn-icon" title="Reenviar por WhatsApp" (click)="resendWhatsApp(q)">📱</button>
                <button class="btn-icon" title="Reenviar por Email" (click)="resendEmail(q)">✉️</button>
                <button class="btn-icon danger" title="Eliminar" (click)="cat.removeQuote(q.id)"><um-icon name="trash" [size]="16"></um-icon></button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ═══════════════ TAB: FORMATO ═══════════════ -->
      @if (activeTab() === 'format') {
        <div class="format-section">

          <!-- Company info -->
          <div class="format-card">
            <h3>🏢 Datos de tu empresa</h3>
            <div class="form-row-2">
              <div class="form-field">
                <label>Nombre de la empresa</label>
                <input type="text" [(ngModel)]="tpl.companyName" (ngModelChange)="saveTemplate()" placeholder="Mi Empresa S.A.S." />
              </div>
              <div class="form-field">
                <label>NIT / ID Fiscal</label>
                <input type="text" [(ngModel)]="tpl.companyNIT" (ngModelChange)="saveTemplate()" placeholder="900.123.456-7" />
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-field">
                <label>Teléfono</label>
                <input type="tel" [(ngModel)]="tpl.companyPhone" (ngModelChange)="saveTemplate()" placeholder="+57 300 123 4567" />
              </div>
              <div class="form-field">
                <label>Email</label>
                <input type="email" [(ngModel)]="tpl.companyEmail" (ngModelChange)="saveTemplate()" placeholder="info&#64;miempresa.com" />
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-field">
                <label>Dirección</label>
                <input type="text" [(ngModel)]="tpl.companyAddress" (ngModelChange)="saveTemplate()" placeholder="Cra 45 #67-89, Bogotá" />
              </div>
              <div class="form-field">
                <label>Sitio web</label>
                <input type="url" [(ngModel)]="tpl.companyWebsite" (ngModelChange)="saveTemplate()" placeholder="www.miempresa.com" />
              </div>
            </div>
          </div>

          <!-- Logo -->
          <div class="format-card">
            <h3>🖼️ Logo</h3>
            <div class="logo-section">
              <div class="logo-preview-area">
                @if (tpl.logoDataUrl) {
                  <img [src]="tpl.logoDataUrl" alt="Logo" class="logo-preview" />
                } @else {
                  <div class="logo-placeholder">
                    <span>📷</span>
                    <p>Sin logo</p>
                  </div>
                }
              </div>
              <div class="logo-controls">
                <label class="btn-upload">
                  📁 Subir logo
                  <input type="file" accept="image/*" (change)="onLogoUpload($event)" class="hidden-file" />
                </label>
                @if (tpl.logoDataUrl) {
                  <button class="btn-remove-logo" (click)="removeLogo()"><um-icon name="trash" [size]="16"></um-icon> Quitar logo</button>
                }
                <label class="toggle-row">
                  <input type="checkbox" [(ngModel)]="tpl.showLogo" (ngModelChange)="saveTemplate()" />
                  Mostrar logo en la cotización
                </label>
                @if (tpl.showLogo) {
                  <div class="form-field" style="margin-top: 12px;">
                    <label>Tamaño del logo ({{ tpl.logoWidth }}px)</label>
                    <input type="range" [(ngModel)]="tpl.logoWidth" (ngModelChange)="saveTemplate()" min="50" max="400" step="5" />
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Colors -->
          <div class="format-card">
            <h3>🎨 Colores</h3>
            <div class="color-presets">
              @for (preset of colorPresets; track preset.name) {
                <button
                  class="color-preset-btn"
                  [class.active]="tpl.primaryColor === preset.primary"
                  [style.--preset-color]="preset.primary"
                  (click)="applyColorPreset(preset)">
                  <span class="preset-swatch" [style.background]="preset.primary"></span>
                  {{ preset.name }}
                </button>
              }
            </div>
            <div class="form-row-2" style="margin-top: 16px;">
              <div class="form-field">
                <label>Color principal</label>
                <div class="color-input-row">
                  <input type="color" [ngModel]="tpl.primaryColor" (ngModelChange)="tpl.primaryColor = $event; saveTemplate()" class="color-picker" />
                  <input type="text" [ngModel]="tpl.primaryColor" (ngModelChange)="tpl.primaryColor = $event; saveTemplate()" class="color-hex" />
                </div>
              </div>
              <div class="form-field">
                <label>Color secundario (fondo)</label>
                <div class="color-input-row">
                  <input type="color" [ngModel]="tpl.secondaryColor" (ngModelChange)="tpl.secondaryColor = $event; saveTemplate()" class="color-picker" />
                  <input type="text" [ngModel]="tpl.secondaryColor" (ngModelChange)="tpl.secondaryColor = $event; saveTemplate()" class="color-hex" />
                </div>
              </div>
            </div>
          </div>

          <!-- Typography & Style -->
          <div class="format-card">
            <h3>✍️ Tipografía y estilo</h3>
            <div class="form-row-2">
              <div class="form-field">
                <label>Fuente</label>
                <select [(ngModel)]="tpl.fontFamily" (ngModelChange)="saveTemplate()">
                  @for (font of fontOptions; track font) {
                    <option [value]="font">{{ font }}</option>
                  }
                </select>
              </div>
              <div class="form-field">
                <label>Estilo de encabezado</label>
                <select [(ngModel)]="tpl.headerStyle" (ngModelChange)="saveTemplate()">
                  <option value="modern">Moderno</option>
                  <option value="classic">Clásico</option>
                  <option value="minimal">Minimalista</option>
                </select>
              </div>
            </div>
          </div>


          <!-- Quoter / Rep -->
          <div class="format-card">
            <h3>👤 Datos del cotizante</h3>
            <p class="section-hint">Persona responsable de emitir la cotización.</p>
            <div class="form-row-2">
              <div class="form-field">
                <label>Nombre completo</label>
                <input type="text" [(ngModel)]="tpl.quoterName" (ngModelChange)="saveTemplate()" placeholder="Juan Pérez" />
              </div>
              <div class="form-field">
                <label>Cargo / Rol</label>
                <input type="text" [(ngModel)]="tpl.quoterRole" (ngModelChange)="saveTemplate()" placeholder="Asesor Comercial" />
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-field">
                <label>Teléfono de contacto</label>
                <input type="tel" [(ngModel)]="tpl.quoterPhone" (ngModelChange)="saveTemplate()" placeholder="+57 310 456 7890" />
              </div>
              <div class="form-field">
                <label>Email de contacto</label>
                <input type="email" [(ngModel)]="tpl.quoterEmail" (ngModelChange)="saveTemplate()" placeholder="juan&#64;miempresa.com" />
              </div>
            </div>
            
            <div class="form-field" style="margin-top: 16px;">
              <label>Firma digital (Opcional)</label>
              <div style="display:flex; gap:12px; align-items:center;">
                @if (tpl.quoterSignatureDataUrl) {
                  <img [src]="tpl.quoterSignatureDataUrl" style="max-height: 48px; max-width: 160px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px;" />
                  <button class="btn btn-outline small" (click)="removeQuoterSignature()">Eliminar firma</button>
                } @else {
                  <input type="file" accept="image/*" (change)="onQuoterSignatureUpload($event)" style="font-size:13px;" />
                }
              </div>
              <p style="font-size:12px; color:#64748b; margin-top:4px;">Se mostrará en la sección "Elaborado por" al final de la cotización.</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="format-card">
            <h3>📝 Pie de página</h3>
            <label class="toggle-row" style="margin-bottom: 12px;">
              <input type="checkbox" [(ngModel)]="tpl.showFooterNotes" (ngModelChange)="saveTemplate()" />
              Incluir pie de página en la cotización
            </label>
            @if (tpl.showFooterNotes) {
              <div class="form-field">
                <label>Texto del pie de página</label>
                <textarea [(ngModel)]="tpl.footerText" (ngModelChange)="saveTemplate()" rows="2" placeholder="Gracias por su preferencia..."></textarea>
              </div>
            }
          </div>

          <!-- Preview button -->
          <div class="send-actions">
            <button class="btn-save" (click)="previewTemplate()">
              👁️ Vista previa del formato
            </button>
            <button class="btn-cancel" (click)="resetTemplate()">
              🔄 Restablecer valores
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'catalog.scss',
})
export class CatalogComponent {
  cat = inject(CatalogService);
  private productService = inject(ProductCatalogService);
  private automationService = inject(BusinessAutomationService);

  unitOptions = UNIT_OPTIONS;
  colorPresets = QUOTE_COLOR_PRESETS;
  fontOptions = QUOTE_FONT_OPTIONS;

  activeTab = signal<Tab>('catalog');

  // ─── Search & Filter ───────────────────
  catalogSearch = signal('');
  catalogCategory = signal('');
  historySearch = signal('');

  /** Unique categories from catalog items */
  categories = computed(() => {
    const cats = new Set(this.cat.items().map(i => i.category).filter(c => !!c));
    return Array.from(cats).sort();
  });

  /** Count items per category */
  categoryCount(cat: string): number {
    return this.cat.items().filter(i => i.category === cat).length;
  }

  /** Filtered catalog items */
  filteredItems = computed(() => {
    let items = this.cat.items();
    const q = this.catalogSearch().toLowerCase().trim();
    const cat = this.catalogCategory();
    if (q) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    }
    if (cat) {
      items = items.filter(i => i.category === cat);
    }
    return items;
  });

  /** Filtered history quotes */
  filteredQuotes = computed(() => {
    const q = this.historySearch().toLowerCase().trim();
    if (!q) return this.cat.quotes();
    return this.cat.quotes().filter(quote =>
      quote.clientName.toLowerCase().includes(q) ||
      (quote.clientEmail || '').toLowerCase().includes(q) ||
      (quote.clientPhone || '').toLowerCase().includes(q)
    );
  });

  // ─── Catalog form ───────────────────────
  formName = '';
  formDesc = '';
  formPrice: number | null = null;
  formUnit = 'unidad';
  formCategory = '';
  editingId = signal<string | null>(null);

  // ─── Quote builder ──────────────────────
  quoteItems = signal<QuoteLineItem[]>([]);
  clientName = '';
  clientPhone = '';
  clientEmail = '';
  quoteNotes = '';
  validDays = 15;

  quoteTotal = computed(() =>
    this.quoteItems().reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  );

  // ─── Quote template ────────────────────
  private readonly TPL_KEY = 'um_quote_template';
  tpl: QuoteTemplate = this.loadTemplate();

  // ─── Catalog actions ────────────────────

  saveItem(): void {
    if (!this.formName.trim() || !this.formPrice) return;

    if (this.editingId()) {
      this.cat.updateItem(this.editingId()!, {
        name: this.formName.trim(),
        description: this.formDesc.trim(),
        price: this.formPrice,
        unit: this.formUnit,
        category: this.formCategory.trim(),
      });
      this.editingId.set(null);
    } else {
      this.cat.addItem({
        name: this.formName.trim(),
        description: this.formDesc.trim(),
        price: this.formPrice,
        unit: this.formUnit,
        category: this.formCategory.trim(),
      });
    }
    this.resetForm();
  }

  editItem(item: CatalogItem): void {
    this.formName = item.name;
    this.formDesc = item.description;
    this.formPrice = item.price;
    this.formUnit = item.unit;
    this.formCategory = item.category;
    this.editingId.set(item.id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.resetForm();
  }

  private resetForm(): void {
    this.formName = '';
    this.formDesc = '';
    this.formPrice = null;
    this.formUnit = 'unidad';
    this.formCategory = '';
  }

  // ─── Quote actions ──────────────────────

  addToQuote(item: CatalogItem): void {
    if (this.isInQuote(item.id)) return;
    this.quoteItems.update(list => [
      ...list,
      {
        catalogId: item.id,
        name: item.name,
        description: item.description,
        unitPrice: item.price,
        quantity: 1,
        unit: item.unit,
      },
    ]);
    this.activeTab.set('quote');
  }

  isInQuote(id: string): boolean {
    return this.quoteItems().some(i => i.catalogId === id);
  }

  changeQty(index: number, delta: number): void {
    this.quoteItems.update(list => {
      const updated = [...list];
      updated[index] = { ...updated[index], quantity: Math.max(1, updated[index].quantity + delta) };
      return updated;
    });
  }

  setQty(index: number, val: number): void {
    this.quoteItems.update(list => {
      const updated = [...list];
      updated[index] = { ...updated[index], quantity: Math.max(1, val || 1) };
      return updated;
    });
  }

  removeLine(index: number): void {
    this.quoteItems.update(list => list.filter((_, i) => i !== index));
  }

  sendWhatsApp(): void {
    const quote = this.buildQuote();
    const saved = this.cat.saveQuote(quote);
    const link = this.cat.generateWhatsAppLink(saved);
    window.open(link, '_blank');
  }

  async sendEmail(): Promise<void> {
    const quote = this.buildQuote();
    const saved = this.cat.saveQuote(quote);

    // Prepare HTML and copy it automatically
    await this.copyQuoteHTML(false); // Silent copy without alert

    const link = this.cat.generateEmailLink(saved);
    window.open(link, '_blank');
  }

  async copyQuoteHTML(showAlert: boolean = true): Promise<void> {
    const items = this.quoteItems();
    const total = this.quoteTotal();
    const html = this.generatePrintHTML(
      this.clientName,
      this.clientEmail,
      this.clientPhone,
      items,
      total,
      this.quoteNotes,
      this.validDays,
      new Date()
    );

    try {
      const blob = new Blob([html], { type: 'text/html' });
      const data = [new ClipboardItem({ 'text/html': blob })];
      await navigator.clipboard.write(data);
      if (showAlert) {
        alert('Formato copiado. Ahora puedes pegarlo directamente en tu correo (Gmail, Outlook, etc.)');
      }
    } catch (err) {
      console.error('Error copying HTML: ', err);
      if (showAlert) {
        alert('No se pudo copiar el formato automáticamente. Intenta usar la opción de Imprimir/PDF.');
      }
    }
  }

  resendWhatsApp(q: any): void {
    const link = this.cat.generateWhatsAppLink(q);
    window.open(link, '_blank');
  }

  resendEmail(q: any): void {
    const link = this.cat.generateEmailLink(q);
    window.open(link, '_blank');
  }

  editQuote(q: any): void {
    this.clientName = q.clientName;
    this.clientPhone = q.clientPhone || '';
    this.clientEmail = q.clientEmail || '';
    this.quoteNotes = q.notes || '';
    this.validDays = q.validDays || 15;
    this.quoteItems.set(q.items.map((it: any) => ({ ...it })));
    this.activeTab.set('quote');
  }

  printQuote(): void {
    const items = this.quoteItems();
    const total = this.quoteTotal();
    const now = new Date();
    const html = this.generatePrintHTML(
      this.clientName || 'Cliente',
      this.clientEmail,
      this.clientPhone,
      items,
      total,
      this.quoteNotes,
      this.validDays,
      now,
    );
    this.openPrintWindow(html);
  }

  reprintQuote(q: any): void {
    const total = this.cat.getQuoteTotal(q);
    const html = this.generatePrintHTML(
      q.clientName,
      q.clientEmail || '',
      q.clientPhone || '',
      q.items,
      total,
      q.notes || '',
      q.validDays || 15,
      new Date(q.createdAt),
    );
    this.openPrintWindow(html);
  }

  saveAndClear(): void {
    const quote = this.buildQuote();
    this.cat.saveQuote(quote);
    this.quoteItems.set([]);
    this.clientName = '';
    this.clientPhone = '';
    this.clientEmail = '';
    this.quoteNotes = '';
    this.activeTab.set('history');
  }

  getTotal(q: any): number {
    return this.cat.getQuoteTotal(q);
  }

  private buildQuote() {
    return {
      clientName: this.clientName.trim(),
      clientPhone: this.clientPhone.trim(),
      clientEmail: this.clientEmail.trim(),
      items: this.quoteItems(),
      notes: this.quoteNotes.trim(),
      validDays: this.validDays,
      status: 'draft' as any,
    };
  }

  getProductStock(id: string): number {
    const prod = this.productService.getProductById(id);
    return prod ? prod.currentStock : 0;
  }

  markAsSold(quoteId: string): void {
    if (confirm('¿Confirmar esta cotización como VENDIDA? Se descontará el inventario correspondiente y se creará una transacción de ingreso.')) {
      const ok = this.automationService.confirmQuoteSale(quoteId);
      if (ok) {
        alert('🎉 Cotización confirmada como vendida exitosamente!');
      } else {
        alert('Ocurrió un problema o la cotización ya estaba marcada como vendida.');
      }
    }
  }

  // ─── Template management ────────────────

  private loadTemplate(): QuoteTemplate {
    try {
      const raw = localStorage.getItem(this.TPL_KEY);
      if (raw) return { ...DEFAULT_QUOTE_TEMPLATE, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULT_QUOTE_TEMPLATE };
  }

  saveTemplate(): void {
    localStorage.setItem(this.TPL_KEY, JSON.stringify(this.tpl));
  }

  resetTemplate(): void {
    this.tpl = { ...DEFAULT_QUOTE_TEMPLATE };
    this.saveTemplate();
  }

  applyColorPreset(preset: { primary: string; secondary: string }): void {
    this.tpl.primaryColor = preset.primary;
    this.tpl.secondaryColor = preset.secondary;
    this.saveTemplate();
  }

  onLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.tpl.logoDataUrl = reader.result as string;
      this.saveTemplate();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeLogo(): void {
    this.tpl.logoDataUrl = '';
    this.saveTemplate();
  }

  onQuoterSignatureUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.tpl.quoterSignatureDataUrl = reader.result as string;
      this.saveTemplate();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeQuoterSignature(): void {
    this.tpl.quoterSignatureDataUrl = '';
    this.saveTemplate();
  }

  previewTemplate(): void {
    const sampleItems: QuoteLineItem[] = [
      { catalogId: '1', name: 'Servicio de ejemplo', description: '', unitPrice: 500000, quantity: 2, unit: 'hora' },
      { catalogId: '2', name: 'Producto demo', description: '', unitPrice: 150000, quantity: 3, unit: 'unidad' },
    ];
    const total = sampleItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const html = this.generatePrintHTML(
      'Cliente de Prueba',
      'cliente@correo.com',
      '+57 300 123 4567',
      sampleItems,
      total,
      'Esta es una vista previa. Los datos son ficticios.',
      15,
      new Date(),
    );
    this.openPrintWindow(html);
  }

  // ─── Print HTML Generator ──────────────

  private openPrintWindow(html: string): void {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  }

  private fmtCurrency(value: number): string {
    return '$' + value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  private generatePrintHTML(
    clientName: string,
    clientEmail: string,
    clientPhone: string,
    items: QuoteLineItem[],
    total: number,
    notes: string,
    validDays: number,
    date: Date,
  ): string {
    const t = this.tpl;
    const dateStr = date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const quoteNum = 'COT-' + date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0') + '-' + Math.floor(Math.random() * 900 + 100);

    const logoHtml = t.showLogo && t.logoDataUrl
      ? `<img src="${t.logoDataUrl}" alt="Logo" style="width:${t.logoWidth}px;height:auto;object-fit:contain;" />`
      : '';


    // Image-inspired Header
    const headerHtml = `
      <div style="padding:40px 48px 30px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          ${logoHtml ? `<div style="margin-bottom:12px;">${logoHtml}</div>` : `<div style="font-size:24px; font-weight:800; color:#1e293b; margin-bottom:8px;">${t.companyName}</div>`}
          <div style="font-size:12px; color:#64748b; line-height:1.5;">
            ${t.companyNIT ? `<div>NIT: ${t.companyNIT}</div>` : ''}
            ${t.companyAddress ? `<div>${t.companyAddress}</div>` : ''}
            ${t.companyWebsite ? `<div>${t.companyWebsite}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:32px; font-weight:900; color:var(--accent); letter-spacing:-0.02em; line-height:1;">COTIZACIÓN</div>
          <div style="font-size:14px; color:#64748b; margin-top:8px; font-weight:600;">${quoteNum}</div>
          <div style="font-size:14px; color:#64748b; font-weight:500;">${dateStr}</div>
        </div>
      </div>
      <hr style="border:none; border-top:3px solid var(--accent); margin:0 48px;" />
    `;

    // Company contact details
    const contactParts = [t.companyPhone, t.companyEmail, t.companyAddress, t.companyWebsite].filter(Boolean);
    const contactHtml = contactParts.length > 0 && t.headerStyle === 'modern'
      ? `<div style="background:${t.secondaryColor};padding:10px 32px;font-size:12px;color:#475569;display:flex;gap:20px;flex-wrap:wrap;">
           ${t.companyPhone ? `<span>📞 ${t.companyPhone}</span>` : ''}
           ${t.companyEmail ? `<span>✉️ ${t.companyEmail}</span>` : ''}
           ${t.companyAddress ? `<span>📍 ${t.companyAddress}</span>` : ''}
           ${t.companyWebsite ? `<span>🌐 ${t.companyWebsite}</span>` : ''}
         </div>`
      : '';

    // Client section
    const clientHtml = `
      <div style="padding:30px 48px 20px;">
        <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; font-weight:800; margin-bottom:12px;">COTIZACIÓN PARA</div>
        <div style="font-size:18px; font-weight:800; color:#1e293b;">${clientName}</div>
        <div style="display:flex; gap:24px; margin-top:4px;">
          ${clientEmail ? `<div style="font-size:13px; color:#64748b;">✉️ ${clientEmail}</div>` : ''}
          ${clientPhone ? `<div style="font-size:13px; color:#64748b;">📞 ${clientPhone}</div>` : ''}
        </div>
      </div>`;

    // Items table
    const rowsHtml = items.map((item, i) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:16px 12px; font-size:14px; color:#64748b; text-align:center;">${i + 1}</td>
        <td style="padding:16px 12px; font-size:14px; font-weight:700; color:#1e293b;">${item.name}</td>
        <td style="padding:16px 12px; font-size:14px; color:#64748b; text-align:center;">${item.quantity}</td>
        <td style="padding:16px 12px; font-size:14px; color:#64748b; text-align:center;">${item.unit}</td>
        <td style="padding:16px 12px; font-size:14px; color:#475569; text-align:right;">${this.fmtCurrency(item.unitPrice)}</td>
        <td style="padding:16px 12px; font-size:14px; font-weight:800; color:#1e293b; text-align:right;">${this.fmtCurrency(item.quantity * item.unitPrice)}</td>
      </tr>
    `).join('');

    const tableHtml = `
      <div style="padding:0 48px;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:var(--accent); font-weight:800; text-align:center; width:40px;">#</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:var(--accent); font-weight:800; text-align:left;">DESCRIPCIÓN</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:var(--accent); font-weight:800; text-align:center; width:70px;">CANT.</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:var(--accent); font-weight:800; text-align:center; width:80px;">UNIDAD</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:var(--accent); font-weight:800; text-align:right; width:120px;">PRECIO UNIT.</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:var(--accent); font-weight:800; text-align:right; width:130px;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${this.buildTotalBlock(t, total)}
      </div>`;

    // Notes and validity
    let notesHtml = '';
    if (notes || validDays) {
      notesHtml = `
        <div style="padding:20px 48px 30px;">
          <div style="background:#eff6ff; border-radius:10px; padding:18px; color:#1e40af; font-size:14px;">
            ${notes ? `<div style="margin-bottom:${validDays ? '12px' : '0'};">${notes}</div>` : ''}
            ${validDays ? `<div style="font-weight:600; display:flex; align-items:center; gap:8px;">⏱️ Vigencia: ${validDays} días a partir de la fecha de emisión.</div>` : ''}
          </div>
        </div>`;
    }

    // Quoter section
    const quoterHtml = this.buildQuoterBlock(t);

    // Footer
    const footerHtml = t.showFooterNotes && t.footerText
      ? `<div style="border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
           <div style="font-size:11px;color:#94a3b8;line-height:1.5;">${t.footerText}</div>
         </div>`
      : '';

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8" />
      <title>Cotización - ${clientName}</title>
      <link href="https://fonts.googleapis.com/css2?family=${t.fontFamily.replace(/ /g, '+')}:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: '${t.fontFamily}', sans-serif; background: #f8fafc; padding: 24px; }
        .quote-doc { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; }
        @media print {
          body { background: white; padding: 0; }
          .quote-doc { box-shadow: none; border-radius: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head><body>
      <div class="no-print" style="text-align:center;margin-bottom:16px;">
        <button onclick="window.print()" style="padding:10px 28px;border-radius:24px;background:${t.primaryColor};color:white;border:none;font-size:14px;font-weight:700;cursor:pointer;font-family:'${t.fontFamily}',sans-serif;">🖨️ Imprimir / Guardar como PDF</button>
      </div>
      <div class="quote-doc">
        ${headerHtml}
        ${contactHtml}
        ${clientHtml}
        ${tableHtml}
        ${notesHtml}
        ${quoterHtml}
        ${footerHtml}
      </div>
    </body></html>`;
  }

  // ─── IVA total block ────────────────────
  private buildTotalBlock(t: QuoteTemplate, subtotal: number): string {
    if (t.ivaMode === 'excluded') {
      const ivaAmount = Math.round(subtotal * t.ivaRate / 100);
      const grandTotal = subtotal + ivaAmount;
      return `
        <div style="display:flex; justify-content:flex-end; padding:24px 0 0;">
          <div style="min-width:240px; text-align:right;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; color:#64748b;">
              <span style="font-weight:600;">Subtotal</span>
              <span style="font-weight:700; color:#1e293b;">${this.fmtCurrency(subtotal)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px; color:#64748b;">
              <span style="font-weight:600;">IVA (${t.ivaRate}%)</span>
              <span style="font-weight:700; color:#1e293b;">${this.fmtCurrency(ivaAmount)}</span>
            </div>
            <hr style="border:none; border-top:2px solid #e2e8f0; margin:8px 0;" />
            <div style="display:flex; justify-content:space-between; align-items:flex-end; padding-top:12px;">
              <span style="font-size:13px; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; font-weight:800; padding-bottom:6px;">TOTAL</span>
              <span style="font-size:36px; font-weight:900; color:var(--accent); line-height:1;">${this.fmtCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>`;
    } else if (t.ivaMode === 'included') {
      return `
        <div style="display:flex; justify-content:flex-end; padding:24px 0 0;">
          <div style="text-align:right;">
            <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; font-weight:800;">TOTAL (IVA INCLUIDO)</span>
            <div style="font-size:36px; font-weight:900; color:var(--accent); line-height:1; margin-top:4px;">${this.fmtCurrency(subtotal)}</div>
          </div>
        </div>`;
    } else {
      return `
        <div style="display:flex; justify-content:flex-end; padding:24px 0 0;">
          <div style="text-align:right;">
            <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; font-weight:800;">TOTAL (EXENTO)</span>
            <div style="font-size:36px; font-weight:900; color:var(--accent); line-height:1; margin-top:4px;">${this.fmtCurrency(subtotal)}</div>
          </div>
        </div>`;
    }
  }

  // ─── Quoter block ────────────────────────
  private buildQuoterBlock(t: QuoteTemplate): string {
    if (!t.quoterName && !t.quoterRole && !t.quoterPhone && !t.quoterEmail) return '';
    const parts: string[] = [];
    if (t.quoterName) parts.push(`<div style="font-size:14px;font-weight:700;color:#1e293b;">${t.quoterName}</div>`);
    if (t.quoterRole) parts.push(`<div style="font-size:12px;color:#64748b;margin-top:1px;">${t.quoterRole}</div>`);
    if (t.quoterPhone) parts.push(`<div style="font-size:12px;color:#64748b;margin-top:4px;">📞 ${t.quoterPhone}</div>`);
    if (t.quoterEmail) parts.push(`<div style="font-size:12px;color:#64748b;">✉️ ${t.quoterEmail}</div>`);
    return `
      <div style="padding:10px 48px 40px;">
        <div style="display:flex; gap:60px; align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; font-weight:800; margin-bottom:12px;">ELABORADO POR</div>
            <div style="font-size:15px; font-weight:800; color:#1e293b;">${t.quoterName || 'Responsable'}</div>
            <div style="font-size:13px; color:#64748b; margin-top:2px;">${t.quoterRole || ''}</div>
            <div style="margin-top:6px; font-size:13px; color:#64748b;">
              ${t.quoterPhone ? `<div>📞 ${t.quoterPhone}</div>` : ''}
              ${t.quoterEmail ? `<div>✉️ ${t.quoterEmail}</div>` : ''}
            </div>
            <div style="margin-top:16px; min-height:60px; display:flex; align-items:flex-end;">
              ${t.quoterSignatureDataUrl ? `<img src="${t.quoterSignatureDataUrl}" style="max-height:70px; max-width:180px; object-fit:contain;" />` : ''}
            </div>
            <div style="border-top:1px solid #cbd5e1; width:200px; margin-top:4px; padding-top:6px;">
              <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; font-weight:600;">Firma y Sello</div>
            </div>
          </div>
          <div style="flex:1;">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; font-weight:800; margin-bottom:12px;">ACEPTADA POR</div>
            <div style="border-top:1px solid #cbd5e1; width:220px; margin-top:90px; padding-top:6px;">
              <div style="font-size:10px; color:#94a3b8; text-transform:uppercase; font-weight:600;">Firma del cliente</div>
            </div>
          </div>
        </div>
      </div>`;
  }
}
