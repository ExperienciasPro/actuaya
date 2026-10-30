import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';

import {
  CatalogItem,
  QuoteLineItem,
  QuoteAttachment,
  QUOTE_IMAGE_LIMITS,
  QuoteTemplate,
  DEFAULT_QUOTE_TEMPLATE,
  QUOTE_COLOR_PRESETS,
  QUOTE_FONT_OPTIONS,
} from '../../../core/models/catalog.model';
import { optimizeQuoteImage, formatFileSize } from '../../../core/utils/quote-image-optimizer';
import { CatalogService } from '../../../core/services/catalog.service';
import { BusinessAutomationService } from '../../../core/services/business-automation.service';

type Tab = 'quote' | 'history' | 'format';

@Component({
  selector: 'um-catalog',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, RouterLink, UmIconComponent],
  template: `
    <div class="catalog-page">

      <!-- ═══ Header ═══ -->
      <header class="page-header">
        <div class="header-top header-top-row">
          <div>
            <h1>Cotizaciones</h1>
            <p class="header-subtitle">Arma y descarga tus cotizaciones en PDF con tus productos y servicios configurados.</p>
          </div>
          <a class="btn-manage-products" routerLink="/d/sales/products">
            📦 Productos y Servicios ({{ cat.activeItems().length }})
          </a>
        </div>

        <!-- Tabs -->
        <div class="tab-bar">
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

      <!-- ═══════════════ TAB: COTIZADOR ═══════════════ -->
      @if (activeTab() === 'quote') {
        <div class="quote-section">

          <!-- Client info -->
          <div class="client-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <h3 style="margin: 0;">👤 Datos del cliente</h3>
              @if (editingQuoteId() || quoteItems().length > 0 || clientName.trim()) {
                <button type="button" class="btn-clear-filters" (click)="startNewQuote()">
                  ➕ Nueva cotización
                </button>
              }
            </div>
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

          <!-- Quick-add from unified Productos y Servicios -->
          <div class="quick-add-card">
            <div class="quick-add-header">
              <h3 style="margin: 0;">⚡ Seleccionar Productos y Servicios</h3>
              <a class="link-manage-inline" routerLink="/d/sales/products">
                ⚙️ Administrar catálogo →
              </a>
            </div>

            @if (cat.activeItems().length > 0) {
              <div class="search-filter-bar" style="margin-top: 12px; margin-bottom: 14px;">
                <div class="search-wrap">
                  <span class="search-icon">🔍</span>
                  <input
                    type="text"
                    class="search-input"
                    placeholder="Buscar producto, servicio, código SKU o categoría..."
                    [ngModel]="catalogSearch()"
                    (ngModelChange)="catalogSearch.set($event)"
                  />
                  @if (catalogSearch()) {
                    <button type="button" class="clear-search" (click)="catalogSearch.set('')">✕</button>
                  }
                </div>

                @if (categories().length > 1) {
                  <div class="filter-chips">
                    <button
                      type="button"
                      class="filter-chip"
                      [class.active]="!catalogCategory()"
                      (click)="catalogCategory.set('')">
                      Todos ({{ cat.activeItems().length }})
                    </button>
                    @for (c of categories(); track c) {
                      <button
                        type="button"
                        class="filter-chip"
                        [class.active]="catalogCategory() === c"
                        (click)="catalogCategory.set(catalogCategory() === c ? '' : c)">
                        {{ c }} ({{ categoryCount(c) }})
                      </button>
                    }
                  </div>
                }
              </div>

              @if (filteredActiveItems().length > 0) {
                <div class="quick-items">
                  @for (item of filteredActiveItems(); track item.id) {
                    <button
                      type="button"
                      class="quick-chip"
                      (click)="addToQuote(item)"
                      [class.in-quote]="isInQuote(item.id)"
                    >
                      <span>{{ isInQuote(item.id) ? '✓' : (item.icon || '📦') }}</span>
                      <span>{{ item.name }}</span>
                      @if (item.sku) {
                        <span class="chip-sku">[{{ item.sku }}]</span>
                      }
                      <span class="chip-price">
                        · {{ item.price | currency:(item.currency || 'COP'):'symbol-narrow':'1.0-0' }}/{{ item.unit }}
                      </span>
                      @if (item.trackInventory) {
                        <span class="chip-stock" [class.low]="(item.currentStock ?? 0) <= 2">
                          (Stock: {{ item.currentStock ?? 0 }})
                        </span>
                      }
                    </button>
                  }
                </div>
              } @else {
                <p class="no-items-hint">
                  No se encontraron productos o servicios activos para "{{ catalogSearch() }}".
                </p>
              }
            } @else {
              <div class="empty-products-cta">
                <p class="no-items-hint">
                  Aún no tienes productos ni servicios activos configurados. Créalos en el módulo de <strong>Productos y Servicios</strong> para cotizarlos aquí.
                </p>
                <a class="btn-sm link-cta-btn" routerLink="/d/sales/products">
                  ➕ Ir a Productos y Servicios
                </a>
              </div>
            }
          </div>

          <!-- Quote line items -->
          <div class="quote-items-card">
            <h3>🧾 Ítems de la cotización</h3>

            @if (quoteItems().length === 0) {
              <div class="empty-state small">
                <p>Selecciona productos o servicios arriba para armar tu cotización.</p>
              </div>
            }

            @for (item of quoteItems(); track item.catalogId; let i = $index) {
              <div class="quote-line">
                <div class="line-info">
                  <strong>
                    {{ item.name }}
                    @if (item.sku) {
                      <span class="line-sku">({{ item.sku }})</span>
                    }
                  </strong>
                  <span class="line-unit">{{ item.unitPrice | currency:'COP':'symbol-narrow':'1.0-0' }} / {{ item.unit }}</span>
                  @if (item.description || item.includesOrDeliverables || item.deliveryTime) {
                    <div class="line-submeta">
                      @if (item.description) {
                        <span>{{ item.description }}</span>
                      }
                      @if (item.includesOrDeliverables) {
                        <span>· 📋 {{ item.includesOrDeliverables }}</span>
                      }
                      @if (item.deliveryTime) {
                        <span>· ⏱️ {{ item.deliveryTime }}</span>
                      }
                    </div>
                  }
                </div>
                <div class="line-qty">
                  <button class="qty-btn" (click)="changeQty(i, -1)">−</button>
                  <input type="number" [ngModel]="item.quantity" (ngModelChange)="setQty(i, $event)" min="1" class="qty-input" />
                  <button class="qty-btn" (click)="changeQty(i, 1)">+</button>
                </div>
                <div class="line-total">
                  {{ item.quantity * item.unitPrice | currency:'COP':'symbol-narrow':'1.0-0' }}
                </div>
                <button class="btn-remove-line" (click)="removeLine(i)"><um-icon name="trash" [size]="14"></um-icon></button>
              </div>
            }

            @if (quoteItems().length > 0) {
              <div class="quote-total-row">
                <span>TOTAL</span>
                <strong>{{ quoteTotal() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
              </div>
            }
          </div>

          <!-- Image Attachments with Smart Weight Management -->
          <div class="attachments-card">
            <div class="attachments-header">
              <h3>🖼️ Imágenes adjuntas (opcional)</h3>
              <div class="attachments-header-right">
                <span
                  class="weight-badge"
                  [class.warning]="attachmentsBudgetPercent() >= 70 && attachmentsBudgetPercent() < 90"
                  [class.near-limit]="attachmentsBudgetPercent() >= 90"
                >
                  {{ quoteAttachments().length }}/{{ imageLimits.maxImagesPerQuote }} imágenes ·
                  {{ formatBytes(totalAttachmentsBytes()) }} / {{ formatBytes(imageLimits.maxQuoteTotalBytes) }}
                </span>
                @if (quoteAttachments().length > 0) {
                  <button type="button" class="btn-clear-filters" (click)="clearAllAttachments()">
                    Quitar todas
                  </button>
                }
              </div>
            </div>

            <div class="weight-progress-track">
              <div
                class="weight-progress-fill"
                [style.width.%]="attachmentsBudgetPercent()"
                [class.warning]="attachmentsBudgetPercent() >= 70 && attachmentsBudgetPercent() < 90"
                [class.near-limit]="attachmentsBudgetPercent() >= 90"
              ></div>
            </div>

            <p class="weight-helper-text">
              Optimización automática activa: puedes adjuntar hasta {{ imageLimits.maxImagesPerQuote }} imágenes (JPG, PNG o WEBP de máx. 5 MB c/u). El sistema reduce dimensiones y comprime su peso automáticamente para mantener la cotización ligera.
            </p>

            @if (attachmentNotice()) {
              <div
                class="attachment-notice"
                [class.error]="attachmentNoticeType() === 'error'"
                [class.info]="attachmentNoticeType() === 'info'"
              >
                <span>{{ attachmentNotice() }}</span>
                <button type="button" class="notice-close" (click)="attachmentNotice.set('')">✕</button>
              </div>
            }

            @if (canAddMoreAttachments()) {
              <label
                class="attachments-dropzone"
                [class.drag-over]="isDragOverAttachments()"
                [class.disabled]="isProcessingImages()"
                (dragover)="onAttachmentDragOver($event)"
                (dragleave)="isDragOverAttachments.set(false)"
                (drop)="onAttachmentDrop($event)"
              >
                <span class="dropzone-icon">{{ isProcessingImages() ? '⏳' : '📷' }}</span>
                <span class="dropzone-title">
                  {{ isProcessingImages() ? 'Optimizando y comprimiendo imágenes...' : 'Haz clic o arrastra imágenes aquí para adjuntarlas' }}
                </span>
                <span class="dropzone-sub">
                  Formatos: JPG, PNG, WEBP · Espacio disponible: {{ formatBytes(remainingAttachmentsBudget()) }}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  class="hidden-file"
                  [disabled]="isProcessingImages()"
                  (change)="onAttachmentInputChange($event)"
                />
              </label>
            }

            @if (quoteAttachments().length > 0) {
              <div class="attachments-grid">
                @for (att of quoteAttachments(); track att.id) {
                  <div class="attachment-item-card">
                    <div class="attachment-thumb-wrap">
                      <img [src]="att.dataUrl" [alt]="att.caption || att.name" />
                      <button
                        type="button"
                        class="btn-remove-attachment"
                        title="Eliminar imagen"
                        (click)="removeAttachment(att.id)"
                      >
                        ✕
                      </button>
                    </div>
                    <div class="attachment-meta-body">
                      <div class="attachment-file-row">
                        <span class="attachment-filename" [title]="att.name">{{ att.name }}</span>
                        <span class="attachment-size-pill" [title]="'Original: ' + formatBytes(att.originalBytes)">
                          {{ formatBytes(att.sizeBytes) }}
                          @if (getCompressionSavingsPercent(att) > 0) {
                            (-{{ getCompressionSavingsPercent(att) }}%)
                          }
                        </span>
                      </div>
                      <input
                        type="text"
                        class="attachment-caption-input"
                        maxlength="90"
                        placeholder="Descripción o pie de imagen (opcional)..."
                        [ngModel]="att.caption || ''"
                        (ngModelChange)="updateAttachmentCaption(att.id, $event)"
                      />
                    </div>
                  </div>
                }
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
              type="button"
              class="btn-save-quote"
              [disabled]="quoteItems().length === 0 || isDownloadingPdf() || isProcessingImages()"
              (click)="downloadQuotePDF()">
              {{ isDownloadingPdf() ? '⏳ Generando PDF...' : '📄 Descargar Cotización en PDF' }}
            </button>
          </div>
        </div>
      }

      <!-- ═══════════════ TAB: HISTORIAL ═══════════════ -->
      @if (activeTab() === 'history') {
        <div class="history-section">

          <!-- History search & filters -->
          @if (cat.quotes().length > 0) {
            <div class="history-filter-panel">
              <!-- Row 1: Search bar + Quick Status Chips -->
              <div class="history-top-bar">
                <div class="search-wrap" style="flex: 1;">
                  <span class="search-icon">🔍</span>
                  <input
                    type="text"
                    class="search-input"
                    placeholder="Buscar por cliente, teléfono, email, producto o nota..."
                    [ngModel]="historySearch()"
                    (ngModelChange)="historySearch.set($event)"
                  />
                  @if (historySearch()) {
                    <button type="button" class="clear-search" (click)="historySearch.set('')">✕</button>
                  }
                </div>

                <div class="filter-chips">
                  <button
                    type="button"
                    class="filter-chip"
                    [class.active]="historyStatusFilter() === 'all'"
                    (click)="historyStatusFilter.set('all')">
                    Todas ({{ cat.quotes().length }})
                  </button>
                  <button
                    type="button"
                    class="filter-chip"
                    [class.active]="historyStatusFilter() === 'pending'"
                    (click)="historyStatusFilter.set('pending')">
                    ⏳ Pendientes ({{ pendingQuotesCount() }})
                  </button>
                  <button
                    type="button"
                    class="filter-chip"
                    [class.active]="historyStatusFilter() === 'sold'"
                    (click)="historyStatusFilter.set('sold')">
                    ✅ Vendidas ({{ soldQuotesCount() }})
                  </button>
                </div>
              </div>

              <!-- Row 2: Detailed Filters (Cliente, Periodo, Desde, Hasta, Producto, Ordenar) -->
              <div class="history-filters-grid">
                <div class="form-field">
                  <label>👤 Cliente</label>
                  <select [ngModel]="historyClientFilter()" (ngModelChange)="historyClientFilter.set($event)">
                    <option value="">Todos los clientes</option>
                    @for (client of uniqueHistoryClients(); track client) {
                      <option [value]="client">{{ client }}</option>
                    }
                  </select>
                </div>

                <div class="form-field">
                  <label>📅 Periodo</label>
                  <select [ngModel]="historyPeriodFilter()" (ngModelChange)="onHistoryPeriodChange($event)">
                    <option value="all">Todas las fechas</option>
                    <option value="today">Hoy</option>
                    <option value="week">Últimos 7 días</option>
                    <option value="month">Este mes</option>
                    <option value="year">Este año</option>
                    <option value="custom">Rango personalizado</option>
                  </select>
                </div>

                <div class="form-field">
                  <label>📆 Desde</label>
                  <input
                    type="date"
                    [ngModel]="historyDateFrom()"
                    (ngModelChange)="onDateRangeChange('from', $event)"
                  />
                </div>

                <div class="form-field">
                  <label>📆 Hasta</label>
                  <input
                    type="date"
                    [ngModel]="historyDateTo()"
                    (ngModelChange)="onDateRangeChange('to', $event)"
                  />
                </div>

                <div class="form-field">
                  <label>📦 Producto / Servicio</label>
                  <select [ngModel]="historyProductFilter()" (ngModelChange)="historyProductFilter.set($event)">
                    <option value="">Todos los ítems</option>
                    @for (prod of uniqueQuotedProducts(); track prod) {
                      <option [value]="prod">{{ prod }}</option>
                    }
                  </select>
                </div>

                <div class="form-field">
                  <label>↕️ Ordenar por</label>
                  <select [ngModel]="historySortBy()" (ngModelChange)="historySortBy.set($event)">
                    <option value="date_desc">Más recientes primero</option>
                    <option value="date_asc">Más antiguas primero</option>
                    <option value="total_desc">Mayor valor ($)</option>
                    <option value="total_asc">Menor valor ($)</option>
                    <option value="client_asc">Cliente (A - Z)</option>
                  </select>
                </div>
              </div>

              <!-- Row 3: Summary & Clear Filters -->
              <div class="history-summary-bar">
                <div class="summary-metrics">
                  <span class="summary-pill">
                    📋 Mostrando <strong>{{ filteredQuotes().length }}</strong> de {{ cat.quotes().length }}
                  </span>
                  <span class="summary-pill">
                    💰 Total filtrado: <strong>{{ filteredQuotesTotal() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
                  </span>
                  @if (filteredSoldTotal() > 0) {
                    <span class="summary-pill sold">
                      ✅ Vendido: <strong>{{ filteredSoldTotal() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
                    </span>
                  }
                </div>

                @if (hasActiveHistoryFilters()) {
                  <button type="button" class="btn-clear-filters" (click)="clearHistoryFilters()">
                    🔄 Limpiar filtros
                  </button>
                }
              </div>
            </div>
          }

          @if (filteredQuotes().length === 0 && cat.quotes().length > 0) {
            <div class="empty-state">
              <span class="empty-icon">🔍</span>
              <p>No se encontraron cotizaciones con los filtros seleccionados.</p>
              <button type="button" class="btn-sm" (click)="clearHistoryFilters()">Limpiar todos los filtros</button>
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
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <h4>{{ q.clientName }}</h4>
                  @if (q.status === 'sold') {
                    <span class="status-badge sold">✅ Vendida</span>
                  } @else {
                    <span class="status-badge pending">⏳ Pendiente</span>
                  }
                </div>
                <p class="history-meta">
                  {{ (q.updatedAt || q.createdAt) | date:'d MMM yyyy, HH:mm' }} · {{ q.items.length }} ítems
                  @if ((q.attachments?.length || 0) > 0) {
                    · <span>🖼️ {{ q.attachments!.length }} {{ q.attachments!.length === 1 ? 'imagen' : 'imágenes' }}</span>
                  }
                  @if (getQuoteItemsSummary(q)) {
                    · <span>{{ getQuoteItemsSummary(q) }}</span>
                  }
                </p>
              </div>
              <div class="history-total">
                {{ getTotal(q) | currency:'COP':'symbol-narrow':'1.0-0' }}
              </div>
              <div class="history-actions">
                @if (q.status !== 'sold') {
                  <button class="btn-icon success-btn" title="Marcar como vendida" (click)="markAsSold(q.id)">✅</button>
                  <button class="btn-icon" title="Editar" (click)="editQuote(q)">✏️</button>
                }
                <button class="btn-icon" title="Descargar PDF" [disabled]="isDownloadingPdf()" (click)="reprintQuote(q)">📄</button>
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
  private automationService = inject(BusinessAutomationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  colorPresets = QUOTE_COLOR_PRESETS;
  fontOptions = QUOTE_FONT_OPTIONS;

  activeTab = signal<Tab>('quote');

  // ─── Search & Filter ───────────────────
  catalogSearch = signal('');
  catalogCategory = signal('');
  historySearch = signal('');
  historyStatusFilter = signal<'all' | 'pending' | 'sold'>('all');
  historyClientFilter = signal('');
  historyPeriodFilter = signal<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  historyDateFrom = signal('');
  historyDateTo = signal('');
  historyProductFilter = signal('');
  historySortBy = signal<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc' | 'client_asc'>('date_desc');

  /** Unique categories from active products & services */
  categories = computed(() => {
    const cats = new Set(this.cat.activeItems().map(i => i.category).filter(c => !!c));
    return Array.from(cats).sort();
  });

  /** Count active items per category */
  categoryCount(cat: string): number {
    return this.cat.activeItems().filter(i => i.category === cat).length;
  }

  /** Filtered active products & services for the quote selector */
  filteredActiveItems = computed(() => {
    let items = this.cat.activeItems();
    const q = this.catalogSearch().toLowerCase().trim();
    const cat = this.catalogCategory();
    if (q) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.sku || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    }
    if (cat) {
      items = items.filter(i => i.category === cat);
    }
    return items;
  });

  /** Counts by status for History chips */
  pendingQuotesCount = computed(() =>
    this.cat.quotes().filter(q => q.status !== 'sold').length
  );

  soldQuotesCount = computed(() =>
    this.cat.quotes().filter(q => q.status === 'sold').length
  );

  /** Unique client names in History */
  uniqueHistoryClients = computed(() => {
    const map = new Map<string, string>();
    for (const q of this.cat.quotes()) {
      const name = (q.clientName || '').trim();
      if (name) {
        const key = name.toLowerCase();
        if (!map.has(key)) map.set(key, name);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'es'));
  });

  /** Unique product/service names quoted in History */
  uniqueQuotedProducts = computed(() => {
    const set = new Set<string>();
    for (const q of this.cat.quotes()) {
      for (const item of q.items || []) {
        const name = (item.name || '').trim();
        if (name) set.add(name);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  });

  hasActiveHistoryFilters = computed(() => {
    return Boolean(
      this.historySearch().trim() ||
      this.historyStatusFilter() !== 'all' ||
      this.historyClientFilter() ||
      this.historyPeriodFilter() !== 'all' ||
      this.historyDateFrom() ||
      this.historyDateTo() ||
      this.historyProductFilter() ||
      this.historySortBy() !== 'date_desc'
    );
  });

  /** Filtered & sorted history quotes */
  filteredQuotes = computed(() => {
    let list = [...this.cat.quotes()];
    const q = this.historySearch().toLowerCase().trim();
    const status = this.historyStatusFilter();
    const client = this.historyClientFilter().toLowerCase().trim();
    const product = this.historyProductFilter().toLowerCase().trim();
    const dateFrom = this.historyDateFrom();
    const dateTo = this.historyDateTo();
    const sortBy = this.historySortBy();

    if (q) {
      list = list.filter(quote => {
        const inClient = (quote.clientName || '').toLowerCase().includes(q);
        const inEmail = (quote.clientEmail || '').toLowerCase().includes(q);
        const inPhone = (quote.clientPhone || '').toLowerCase().includes(q);
        const inNotes = (quote.notes || '').toLowerCase().includes(q);
        const inItems = (quote.items || []).some(it => (it.name || '').toLowerCase().includes(q));
        return inClient || inEmail || inPhone || inNotes || inItems;
      });
    }

    if (status === 'pending') {
      list = list.filter(quote => quote.status !== 'sold');
    } else if (status === 'sold') {
      list = list.filter(quote => quote.status === 'sold');
    }

    if (client) {
      list = list.filter(quote => (quote.clientName || '').trim().toLowerCase() === client);
    }

    if (product) {
      list = list.filter(quote =>
        (quote.items || []).some(it => (it.name || '').trim().toLowerCase() === product)
      );
    }

    if (dateFrom) {
      const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
      if (!isNaN(fromTime)) {
        list = list.filter(quote => {
          const qt = new Date(quote.updatedAt || quote.createdAt).getTime();
          return qt >= fromTime;
        });
      }
    }

    if (dateTo) {
      const toTime = new Date(`${dateTo}T23:59:59.999`).getTime();
      if (!isNaN(toTime)) {
        list = list.filter(quote => {
          const qt = new Date(quote.updatedAt || quote.createdAt).getTime();
          return qt <= toTime;
        });
      }
    }

    list.sort((a, b) => {
      if (sortBy === 'date_asc') {
        return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
      }
      if (sortBy === 'total_desc') {
        return this.getTotal(b) - this.getTotal(a);
      }
      if (sortBy === 'total_asc') {
        return this.getTotal(a) - this.getTotal(b);
      }
      if (sortBy === 'client_asc') {
        return (a.clientName || '').localeCompare(b.clientName || '', 'es');
      }
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

    return list;
  });

  filteredQuotesTotal = computed(() =>
    this.filteredQuotes().reduce((sum, q) => sum + this.getTotal(q), 0)
  );

  filteredSoldTotal = computed(() =>
    this.filteredQuotes()
      .filter(q => q.status === 'sold')
      .reduce((sum, q) => sum + this.getTotal(q), 0)
  );

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const addId = params.get('add');
      if (addId) {
        const found = this.cat.activeItems().find(it => it.id === addId);
        if (found) {
          this.addToQuote(found);
        }
        this.router.navigate([], {
          queryParams: { add: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  onHistoryPeriodChange(period: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'): void {
    this.historyPeriodFilter.set(period);
    const now = new Date();
    const toIsoDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (period === 'all') {
      this.historyDateFrom.set('');
      this.historyDateTo.set('');
    } else if (period === 'today') {
      const today = toIsoDate(now);
      this.historyDateFrom.set(today);
      this.historyDateTo.set(today);
    } else if (period === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      this.historyDateFrom.set(toIsoDate(start));
      this.historyDateTo.set(toIsoDate(now));
    } else if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      this.historyDateFrom.set(toIsoDate(start));
      this.historyDateTo.set(toIsoDate(now));
    } else if (period === 'year') {
      const start = new Date(now.getFullYear(), 0, 1);
      this.historyDateFrom.set(toIsoDate(start));
      this.historyDateTo.set(toIsoDate(now));
    }
  }

  onDateRangeChange(bound: 'from' | 'to', value: string): void {
    if (bound === 'from') {
      this.historyDateFrom.set(value || '');
    } else {
      this.historyDateTo.set(value || '');
    }
    this.historyPeriodFilter.set(
      this.historyDateFrom() || this.historyDateTo() ? 'custom' : 'all'
    );
  }

  clearHistoryFilters(): void {
    this.historySearch.set('');
    this.historyStatusFilter.set('all');
    this.historyClientFilter.set('');
    this.historyPeriodFilter.set('all');
    this.historyDateFrom.set('');
    this.historyDateTo.set('');
    this.historyProductFilter.set('');
    this.historySortBy.set('date_desc');
  }

  getQuoteItemsSummary(q: any): string {
    const items = q?.items || [];
    if (items.length === 0) return '';
    const names = items.slice(0, 2).map((it: any) => `${it.name} (x${it.quantity})`);
    return items.length > 2 ? `${names.join(', ')} +${items.length - 2} más` : names.join(', ');
  }

  // ─── Quote builder ──────────────────────
  readonly imageLimits = QUOTE_IMAGE_LIMITS;
  readonly formatBytes = formatFileSize;

  quoteItems = signal<QuoteLineItem[]>([]);
  quoteAttachments = signal<QuoteAttachment[]>([]);
  isProcessingImages = signal(false);
  isDragOverAttachments = signal(false);
  attachmentNotice = signal('');
  attachmentNoticeType = signal<'info' | 'error'>('info');

  editingQuoteId = signal<string | null>(null);
  isDownloadingPdf = signal(false);
  clientName = '';
  clientPhone = '';
  clientEmail = '';
  quoteNotes = '';
  validDays = 15;

  quoteTotal = computed(() =>
    this.quoteItems().reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  );

  totalAttachmentsBytes = computed(() =>
    this.quoteAttachments().reduce((acc, att) => acc + (att.sizeBytes || 0), 0)
  );

  remainingAttachmentsBudget = computed(() =>
    Math.max(0, this.imageLimits.maxQuoteTotalBytes - this.totalAttachmentsBytes())
  );

  attachmentsBudgetPercent = computed(() => {
    const pct = (this.totalAttachmentsBytes() / this.imageLimits.maxQuoteTotalBytes) * 100;
    return Math.min(100, Math.round(pct));
  });

  canAddMoreAttachments = computed(() =>
    this.quoteAttachments().length < this.imageLimits.maxImagesPerQuote &&
    this.remainingAttachmentsBudget() >= 18 * 1024
  );

  // ─── Quote template ────────────────────
  private readonly TPL_KEY = 'um_quote_template';
  tpl: QuoteTemplate = this.loadTemplate();

  // ─── Quote actions ──────────────────────

  startNewQuote(): void {
    this.editingQuoteId.set(null);
    this.quoteItems.set([]);
    this.quoteAttachments.set([]);
    this.attachmentNotice.set('');
    this.clientName = '';
    this.clientPhone = '';
    this.clientEmail = '';
    this.quoteNotes = '';
    this.validDays = 15;
  }

  getCompressionSavingsPercent(att: QuoteAttachment): number {
    if (!att.originalBytes || att.originalBytes <= att.sizeBytes) return 0;
    return Math.max(0, Math.round(((att.originalBytes - att.sizeBytes) / att.originalBytes) * 100));
  }

  onAttachmentDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isProcessingImages() && this.canAddMoreAttachments()) {
      this.isDragOverAttachments.set(true);
    }
  }

  async onAttachmentDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverAttachments.set(false);
    if (this.isProcessingImages() || !this.canAddMoreAttachments()) return;

    const files = Array.from(event.dataTransfer?.files || []);
    await this.processAttachmentFiles(files);
  }

  async onAttachmentInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    await this.processAttachmentFiles(files);
  }

  private async processAttachmentFiles(files: File[]): Promise<void> {
    if (!files.length || this.isProcessingImages()) return;

    this.attachmentNotice.set('');
    const currentList = [...this.quoteAttachments()];
    const availableSlots = this.imageLimits.maxImagesPerQuote - currentList.length;

    if (availableSlots <= 0) {
      this.attachmentNoticeType.set('error');
      this.attachmentNotice.set(
        `Solo puedes adjuntar hasta ${this.imageLimits.maxImagesPerQuote} imágenes por cotización.`,
      );
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    const errors: string[] = [];
    if (files.length > availableSlots) {
      errors.push(
        `Se omitieron ${files.length - availableSlots} archivo(s) porque el límite es de ${this.imageLimits.maxImagesPerQuote} imágenes por cotización.`,
      );
    }

    this.isProcessingImages.set(true);
    let addedCount = 0;
    let totalOriginal = 0;
    let totalOptimized = 0;

    try {
      for (const file of filesToProcess) {
        const usedBytes = currentList.reduce((acc, a) => acc + (a.sizeBytes || 0), 0);
        const remainingBudget = this.imageLimits.maxQuoteTotalBytes - usedBytes;

        if (remainingBudget < 18 * 1024) {
          errors.push(
            `Se alcanzó el presupuesto máximo de peso por cotización (${this.formatBytes(this.imageLimits.maxQuoteTotalBytes)}).`,
          );
          break;
        }

        try {
          const optimized = await optimizeQuoteImage(file, remainingBudget);
          currentList.push(optimized);
          addedCount++;
          totalOriginal += optimized.originalBytes;
          totalOptimized += optimized.sizeBytes;
        } catch (err: any) {
          errors.push(err?.message || `No se pudo procesar "${file.name}".`);
        }
      }

      this.quoteAttachments.set(currentList);

      if (errors.length > 0) {
        this.attachmentNoticeType.set('error');
        this.attachmentNotice.set(errors.join(' '));
      } else if (addedCount > 0) {
        this.attachmentNoticeType.set('info');
        this.attachmentNotice.set(
          `✅ ${addedCount} ${addedCount === 1 ? 'imagen optimizada' : 'imágenes optimizadas'} (${this.formatBytes(totalOriginal)} → ${this.formatBytes(totalOptimized)}).`,
        );
      }
    } finally {
      this.isProcessingImages.set(false);
    }
  }

  updateAttachmentCaption(id: string, caption: string): void {
    this.quoteAttachments.update(list =>
      list.map(att => (att.id === id ? { ...att, caption } : att))
    );
  }

  removeAttachment(id: string): void {
    this.quoteAttachments.update(list => list.filter(att => att.id !== id));
    this.attachmentNotice.set('');
  }

  clearAllAttachments(): void {
    this.quoteAttachments.set([]);
    this.attachmentNotice.set('');
  }

  addToQuote(item: CatalogItem): void {
    if (this.isInQuote(item.id)) return;
    this.quoteItems.update(list => [
      ...list,
      {
        catalogId: item.id,
        name: item.name,
        description: item.description || '',
        sku: item.sku || '',
        deliveryTime: item.deliveryTime || '',
        includesOrDeliverables: item.includesOrDeliverables || '',
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

  editQuote(q: any): void {
    this.editingQuoteId.set(q.id || null);
    this.clientName = q.clientName;
    this.clientPhone = q.clientPhone || '';
    this.clientEmail = q.clientEmail || '';
    this.quoteNotes = q.notes || '';
    this.validDays = q.validDays || 15;
    this.quoteItems.set((q.items || []).map((it: any) => ({ ...it })));
    this.quoteAttachments.set((q.attachments || []).map((att: any) => ({ ...att })));
    this.attachmentNotice.set('');
    this.activeTab.set('quote');
  }

  async downloadQuotePDF(): Promise<void> {
    if (this.quoteItems().length === 0 || this.isDownloadingPdf() || this.isProcessingImages()) return;

    const now = new Date();
    const clientLabel = this.clientName.trim() || 'Cliente';

    // Guardar o actualizar primero en el historial conservando únicamente la versión más reciente
    const quote = this.buildQuote();
    const saved = this.cat.saveQuote(quote, this.editingQuoteId());
    this.editingQuoteId.set(saved.id);

    await this.promptAndSaveQuotePdf(
      clientLabel,
      this.clientEmail.trim(),
      this.clientPhone.trim(),
      this.quoteItems(),
      this.quoteTotal(),
      this.quoteNotes.trim(),
      this.validDays,
      now,
      this.quoteAttachments(),
    );
  }

  async reprintQuote(q: any): Promise<void> {
    if (this.isDownloadingPdf()) return;
    const total = this.cat.getQuoteTotal(q);
    await this.promptAndSaveQuotePdf(
      q.clientName || 'Cliente',
      q.clientEmail || '',
      q.clientPhone || '',
      q.items || [],
      total,
      q.notes || '',
      q.validDays || 15,
      new Date(q.createdAt || new Date()),
      q.attachments || [],
    );
  }

  private async promptAndSaveQuotePdf(
    clientName: string,
    clientEmail: string,
    clientPhone: string,
    items: QuoteLineItem[],
    total: number,
    notes: string,
    validDays: number,
    date: Date,
    attachments: QuoteAttachment[] = [],
  ): Promise<boolean> {
    const safeClient = (clientName || 'Cliente')
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s_-]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'Cliente';
    const dateStr = date.toISOString().split('T')[0];
    const fileName = `Cotizacion_${safeClient}_${dateStr}.pdf`;

    // 1. Consultar carpeta/ubicación al usuario inmediatamente en el gesto de clic
    let fileHandle: any = null;
    const win = window as any;
    if (typeof win.showSaveFilePicker === 'function') {
      try {
        fileHandle = await win.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Documento PDF',
              accept: { 'application/pdf': ['.pdf'] },
            },
          ],
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return false; // Usuario canceló el diálogo de selección de carpeta
        }
        console.warn('No se pudo usar showSaveFilePicker, usando descarga directa:', err);
      }
    }

    this.isDownloadingPdf.set(true);
    try {
      const pdfBlob = await this.generateQuotePdfBlob(
        clientName,
        clientEmail,
        clientPhone,
        items,
        total,
        notes,
        validDays,
        date,
        attachments,
      );

      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();
      } else {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }
      return true;
    } catch (err) {
      console.error('Error generando PDF de cotización:', err);
      alert('Ocurrió un error al generar el archivo PDF de la cotización.');
      return false;
    } finally {
      this.isDownloadingPdf.set(false);
    }
  }

  private async generateQuotePdfBlob(
    clientName: string,
    clientEmail: string,
    clientPhone: string,
    items: QuoteLineItem[],
    total: number,
    notes: string,
    validDays: number,
    date: Date,
    attachments: QuoteAttachment[] = [],
  ): Promise<Blob> {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.style.zIndex = '-9999';
    container.style.fontFamily = `'${this.tpl.fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    container.style.color = '#1e293b';
    container.innerHTML = this.generateQuoteDocBodyHTML(
      clientName,
      clientEmail,
      clientPhone,
      items,
      total,
      notes,
      validDays,
      date,
      attachments,
    );

    document.body.appendChild(container);

    try {
      const images = Array.from(container.querySelectorAll('img'));
      await Promise.all(
        images.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
        )
      );

      const [jspdfModule, html2canvasModule] = await Promise.all([
        import('jspdf') as Promise<any>,
        import('html2canvas') as Promise<any>,
      ]);
      const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
      const html2canvas = html2canvasModule.default || html2canvasModule;

      const canvas: HTMLCanvasElement = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
        windowWidth: 800,
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return doc.output('blob');
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }

  getTotal(q: any): number {
    return this.cat.getQuoteTotal(q);
  }

  private buildQuote() {
    const attachments = this.quoteAttachments().map(att => ({
      ...att,
      caption: (att.caption || '').trim(),
    }));
    return {
      clientName: this.clientName.trim() || 'Cliente',
      clientPhone: this.clientPhone.trim(),
      clientEmail: this.clientEmail.trim(),
      items: this.quoteItems(),
      attachments: attachments.length > 0 ? attachments : undefined,
      notes: this.quoteNotes.trim(),
      validDays: this.validDays,
      status: 'draft' as any,
    };
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

  private escapeHtml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private generateQuoteDocBodyHTML(
    clientName: string,
    clientEmail: string,
    clientPhone: string,
    items: QuoteLineItem[],
    total: number,
    notes: string,
    validDays: number,
    date: Date,
    attachments: QuoteAttachment[] = [],
  ): string {
    const t = this.tpl;
    const accent = t.primaryColor || '#6c5ce7';
    const dateStr = date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const quoteNum = 'COT-' + date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0') + '-' + Math.floor(Math.random() * 900 + 100);

    const logoHtml = t.showLogo && t.logoDataUrl
      ? `<img src="${t.logoDataUrl}" alt="Logo" style="width:${t.logoWidth}px;height:auto;object-fit:contain;" />`
      : '';

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
          <div style="font-size:32px; font-weight:900; color:${accent}; letter-spacing:-0.02em; line-height:1;">COTIZACIÓN</div>
          <div style="font-size:14px; color:#64748b; margin-top:8px; font-weight:600;">${quoteNum}</div>
          <div style="font-size:14px; color:#64748b; font-weight:500;">${dateStr}</div>
        </div>
      </div>
      <hr style="border:none; border-top:3px solid ${accent}; margin:0 48px;" />
    `;

    const contactParts = [t.companyPhone, t.companyEmail, t.companyAddress, t.companyWebsite].filter(Boolean);
    const contactHtml = contactParts.length > 0 && t.headerStyle === 'modern'
      ? `<div style="background:${t.secondaryColor};padding:10px 32px;font-size:12px;color:#475569;display:flex;gap:20px;flex-wrap:wrap;">
           ${t.companyPhone ? `<span>📞 ${t.companyPhone}</span>` : ''}
           ${t.companyEmail ? `<span>✉️ ${t.companyEmail}</span>` : ''}
           ${t.companyAddress ? `<span>📍 ${t.companyAddress}</span>` : ''}
           ${t.companyWebsite ? `<span>🌐 ${t.companyWebsite}</span>` : ''}
         </div>`
      : '';

    const clientHtml = `
      <div style="padding:30px 48px 20px;">
        <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; font-weight:800; margin-bottom:12px;">COTIZACIÓN PARA</div>
        <div style="font-size:18px; font-weight:800; color:#1e293b;">${clientName}</div>
        <div style="display:flex; gap:24px; margin-top:4px;">
          ${clientEmail ? `<div style="font-size:13px; color:#64748b;">✉️ ${clientEmail}</div>` : ''}
          ${clientPhone ? `<div style="font-size:13px; color:#64748b;">📞 ${clientPhone}</div>` : ''}
        </div>
      </div>`;

    const rowsHtml = items.map((item, i) => {
      const details: string[] = [];
      if (item.description) details.push(`<div>${item.description}</div>`);
      if (item.includesOrDeliverables) details.push(`<div><strong>Incluye:</strong> ${item.includesOrDeliverables}</div>`);
      if (item.deliveryTime) details.push(`<div><strong>Entrega:</strong> ${item.deliveryTime}</div>`);
      const skuBadge = item.sku
        ? `<span style="font-size:11px; font-weight:600; color:#64748b; margin-left:6px;">(${item.sku})</span>`
        : '';
      const detailsHtml = details.length > 0
        ? `<div style="font-size:12px; font-weight:400; color:#64748b; margin-top:4px; line-height:1.45;">${details.join('')}</div>`
        : '';

      return `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:16px 12px; font-size:14px; color:#64748b; text-align:center; vertical-align:top;">${i + 1}</td>
        <td style="padding:16px 12px; font-size:14px; font-weight:700; color:#1e293b; vertical-align:top;">
          <div>${item.name}${skuBadge}</div>
          ${detailsHtml}
        </td>
        <td style="padding:16px 12px; font-size:14px; color:#64748b; text-align:center; vertical-align:top;">${item.quantity}</td>
        <td style="padding:16px 12px; font-size:14px; color:#64748b; text-align:center; vertical-align:top;">${item.unit}</td>
        <td style="padding:16px 12px; font-size:14px; color:#475569; text-align:right; vertical-align:top;">${this.fmtCurrency(item.unitPrice)}</td>
        <td style="padding:16px 12px; font-size:14px; font-weight:800; color:#1e293b; text-align:right; vertical-align:top;">${this.fmtCurrency(item.quantity * item.unitPrice)}</td>
      </tr>
    `;
    }).join('');

    const tableHtml = `
      <div style="padding:0 48px;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:${accent}; font-weight:800; text-align:center; width:40px;">#</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:${accent}; font-weight:800; text-align:left;">DESCRIPCIÓN</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:${accent}; font-weight:800; text-align:center; width:70px;">CANT.</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:${accent}; font-weight:800; text-align:center; width:80px;">UNIDAD</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:${accent}; font-weight:800; text-align:right; width:120px;">PRECIO UNIT.</th>
              <th style="padding:12px; font-size:11px; text-transform:uppercase; color:${accent}; font-weight:800; text-align:right; width:130px;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${this.buildTotalBlock(t, total)}
      </div>`;

    const validAttachments = (attachments || []).filter(
      att => att?.dataUrl && att.dataUrl.startsWith('data:image/')
    );
    let attachmentsHtml = '';
    if (validAttachments.length > 0) {
      const isSingle = validAttachments.length === 1;
      const boxHeight = isSingle ? '240px' : '185px';
      const imgMaxHeight = isSingle ? '216px' : '161px';
      const cardsHtml = validAttachments.map(att => {
        const captionText = (att.caption || '').trim();
        const safeAlt = this.escapeHtml(captionText || att.name || 'Imagen adjunta');
        return `
          <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; background:#ffffff;">
            <div style="background:#f8fafc; padding:12px; height:${boxHeight}; display:flex; align-items:center; justify-content:center;">
              <img src="${att.dataUrl}" alt="${safeAlt}" style="max-width:100%; max-height:${imgMaxHeight}; width:auto; height:auto; object-fit:contain; border-radius:6px; display:block;" />
            </div>
            ${captionText ? `<div style="padding:8px 12px; font-size:12px; color:#475569; border-top:1px solid #f1f5f9; line-height:1.4;">${this.escapeHtml(captionText)}</div>` : ''}
          </div>`;
      }).join('');

      attachmentsHtml = `
        <div style="padding:24px 48px 10px;">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; font-weight:800; margin-bottom:12px;">IMÁGENES ADJUNTAS / REFERENCIA VISUAL</div>
          <div style="display:grid; grid-template-columns:${isSingle ? '1fr' : 'repeat(2, 1fr)'}; gap:16px;">
            ${cardsHtml}
          </div>
        </div>`;
    }

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

    const quoterHtml = this.buildQuoterBlock(t);

    const footerHtml = t.showFooterNotes && t.footerText
      ? `<div style="border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
           <div style="font-size:11px;color:#94a3b8;line-height:1.5;">${t.footerText}</div>
         </div>`
      : '';

    return `
      <div class="quote-doc" style="--accent:${accent}; background:#ffffff;">
        ${headerHtml}
        ${contactHtml}
        ${clientHtml}
        ${tableHtml}
        ${attachmentsHtml}
        ${notesHtml}
        ${quoterHtml}
        ${footerHtml}
      </div>`;
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
    attachments: QuoteAttachment[] = [],
  ): string {
    const t = this.tpl;
    const bodyContent = this.generateQuoteDocBodyHTML(
      clientName,
      clientEmail,
      clientPhone,
      items,
      total,
      notes,
      validDays,
      date,
      attachments,
    );

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
      ${bodyContent}
    </body></html>`;
  }

  // ─── IVA total block ────────────────────
  private buildTotalBlock(t: QuoteTemplate, subtotal: number): string {
    const accent = t.primaryColor || '#6c5ce7';
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
              <span style="font-size:36px; font-weight:900; color:${accent}; line-height:1;">${this.fmtCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>`;
    } else if (t.ivaMode === 'included') {
      return `
        <div style="display:flex; justify-content:flex-end; padding:24px 0 0;">
          <div style="text-align:right;">
            <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; font-weight:800;">TOTAL (IVA INCLUIDO)</span>
            <div style="font-size:36px; font-weight:900; color:${accent}; line-height:1; margin-top:4px;">${this.fmtCurrency(subtotal)}</div>
          </div>
        </div>`;
    } else {
      return `
        <div style="display:flex; justify-content:flex-end; padding:24px 0 0;">
          <div style="text-align:right;">
            <span style="font-size:12px; text-transform:uppercase; letter-spacing:0.1em; color:#94a3b8; font-weight:800;">TOTAL (EXENTO)</span>
            <div style="font-size:36px; font-weight:900; color:${accent}; line-height:1; margin-top:4px;">${this.fmtCurrency(subtotal)}</div>
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
