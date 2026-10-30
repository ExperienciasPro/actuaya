import { Component, computed, inject, signal } from '@angular/core';
import { CashflowService, RecurringMonthStatus } from '../../../core/services/cashflow.service';
import { ProductCatalogService } from '../../../core/services/product-catalog.service';
import {
  TransactionType,
  TransactionCategory,
  CATEGORY_LABELS,
  INGRESO_CATEGORIES,
  EGRESO_CATEGORIES,
  RecurringExpense,
  RecurringPreset,
  RECURRING_EXPENSE_PRESETS,
  RECURRING_EXPENSE_ICONS,
  RECURRING_INCOME_PRESETS,
  RECURRING_INCOME_ICONS,
  getRecurringType,
} from '../../../core/models/cashflow.model';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type CashflowMainTab = 'cashflow' | 'recurring';

@Component({
  selector: 'um-cashflow',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, CurrencyInputDirective, UmIconComponent],
  template: `
    <div class="cashflow-page">

      <!-- ═══ Header ═══ -->
      <header class="page-header">
        <div class="header-top">
          <div>
            <h1>Flujo de Caja</h1>
            <p class="header-subtitle">Lo que entra y lo que sale, simple y claro.</p>
          </div>
          <button class="btn-add" (click)="showForm.set(true)">
            + Registrar movimiento
          </button>
        </div>

        <!-- Main Tabs -->
        <div class="main-tab-bar">
          <button
            type="button"
            class="main-tab"
            [class.active]="mainTab() === 'cashflow'"
            (click)="mainTab.set('cashflow')">
            📊 Flujo de Caja
          </button>
          <button
            type="button"
            class="main-tab"
            [class.active]="mainTab() === 'recurring'"
            (click)="mainTab.set('recurring')">
            🔁 Ingresos & Egresos Básicos
            @if (cf.recurringItems().length > 0) {
              <span class="tab-badge">{{ cf.recurringItems().length }}</span>
            }
          </button>
        </div>

        @if (mainTab() === 'cashflow') {
          <!-- Month Nav -->
          <div class="month-nav">
            <button class="month-arrow" (click)="cf.goToPreviousMonth()">‹</button>
            <span class="month-label">{{ getMonthLabel() }}</span>
            <button class="month-arrow" (click)="cf.goToNextMonth()">›</button>
          </div>
        }
      </header>

      <!-- ═══════════════ TAB 1: FLUJO DE CAJA (MENSUAL) ═══════════════ -->
      @if (mainTab() === 'cashflow') {
        <!-- ═══ Summary Cards ═══ -->
        <div class="summary-row">
          <div class="summary-card ingreso">
            <span class="summary-icon">↗</span>
            <div>
              <p class="summary-label">Ingresos</p>
              <p class="summary-value">{{ cf.summary().totalIngresos | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            </div>
          </div>
          <div class="summary-card egreso">
            <span class="summary-icon">↙</span>
            <div>
              <p class="summary-label">Egresos</p>
              <p class="summary-value">{{ cf.summary().totalEgresos | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            </div>
          </div>
          <div class="summary-card balance" [class.positive]="cf.summary().balance >= 0" [class.negative]="cf.summary().balance < 0">
            <span class="summary-icon">⚖</span>
            <div>
              <p class="summary-label">Balance</p>
              <p class="summary-value">{{ cf.summary().balance | currency:'COP':'symbol-narrow':'1.0-0' }}</p>
            </div>
          </div>
        </div>

        <!-- ═══ Transaction List ═══ -->
        <div class="tx-list">
          <div class="tx-list-header">
            <h2>Movimientos ({{ cf.monthTransactions().length }})</h2>
            <div class="filter-tabs">
              <button [class.active]="filterType() === 'all'" (click)="filterType.set('all')">Todos</button>
              <button [class.active]="filterType() === 'ingreso'" (click)="filterType.set('ingreso')">Ingresos</button>
              <button [class.active]="filterType() === 'egreso'" (click)="filterType.set('egreso')">Egresos</button>
            </div>
          </div>

          @if (filteredTransactions().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📭</span>
              <p>No hay movimientos {{ filterType() !== 'all' ? 'de este tipo ' : '' }}en este mes.</p>
              <p class="empty-hint">Toca "+ Registrar movimiento" para empezar.</p>
            </div>
          }

          @for (tx of filteredTransactions(); track tx.id) {
            <div class="tx-row" [class.ingreso]="tx.type === 'ingreso'" [class.egreso]="tx.type === 'egreso'">
              <div class="tx-indicator">
                <span>{{ tx.type === 'ingreso' ? '↗' : '↙' }}</span>
              </div>
              <div class="tx-info">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <p class="tx-desc">{{ tx.description }}</p>
                  @if (tx.autoGenerated) {
                    <span class="badge-auto">🔗 Auto</span>
                  }
                  @if (tx.recurringExpenseId) {
                    <span class="badge-auto badge-recurring">🔁 Básico</span>
                  }
                </div>
                <p class="tx-meta">{{ getCategoryLabel(tx.category) }} · {{ tx.date | date:'d MMM' }}</p>
              </div>
              <div class="tx-amount" [class.positive]="tx.type === 'ingreso'" [class.negative]="tx.type === 'egreso'">
                {{ tx.type === 'ingreso' ? '+' : '-' }}{{ tx.amount | currency:'COP':'symbol-narrow':'1.0-0' }}
              </div>
              @if (!tx.autoGenerated) {
                <button class="tx-delete" (click)="cf.remove(tx.id)" title="Eliminar"><um-icon name="trash" [size]="14"></um-icon></button>
              } @else {
                <button class="tx-delete disabled" title="Auto-generada (no editable)" style="opacity: 0.3; cursor: not-allowed;"><um-icon name="trash" [size]="14"></um-icon></button>
              }
            </div>
          }
        </div>
      }

      <!-- ═══════════════ TAB 2: INGRESOS & EGRESOS BÁSICOS ═══════════════ -->
      @if (mainTab() === 'recurring') {
        <section class="recurring-panel recurring-panel-tab">
        <div class="recurring-header">
          <div class="recurring-title-wrap">
            <span class="recurring-title-icon">🔁</span>
            <div class="recurring-title-text">
              <h3>Ingresos y egresos básicos mensuales</h3>
              <p>Gestiona aquí tus conceptos fijos repetitivos (arriendos, salud, telefonía, internet, alimentación, transporte, créditos…) para proyectar tus finanzas.</p>
            </div>
          </div>
        </div>

        <!-- Balance básico: siempre visible -->
        <div class="basic-balance">
          <div class="bb-card income">
            <span class="bb-label">Ingresos básicos / mes</span>
            <span class="bb-value">{{ cf.monthlyBasicIncomeTotal() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
          </div>
          <span class="bb-op">−</span>
          <div class="bb-card expense">
            <span class="bb-label">Egresos básicos / mes</span>
            <span class="bb-value">{{ cf.monthlyBasicTotal() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
          </div>
          <span class="bb-op">=</span>
          <div class="bb-card result" [class.deficit]="cf.monthlyBasicGap() > 0" [class.surplus]="cf.monthlyBasicGap() <= 0">
            @if (cf.monthlyBasicGap() > 0) {
              <span class="bb-label">Necesitas conseguir extra / mes</span>
              <span class="bb-value">{{ cf.monthlyBasicGap() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
              <span class="bb-hint">≈ {{ cf.monthlyBasicGap() * 12 | currency:'COP':'symbol-narrow':'1.0-0' }} al año</span>
            } @else {
              <span class="bb-label">Excedente básico / mes</span>
              <span class="bb-value">{{ -cf.monthlyBasicGap() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
              <span class="bb-hint">Tus ingresos fijos cubren lo básico</span>
            }
          </div>
        </div>

        @if (cf.monthlyBasicTotal() > 0) {
          <div class="coverage">
            <div class="coverage-top">
              <span>Tus ingresos básicos cubren <strong>{{ basicCoveragePercent() }}%</strong> de tus gastos básicos</span>
              <span class="coverage-month">
                En {{ getMonthLabel() }} llevas {{ cf.summary().totalIngresos | currency:'COP':'symbol-narrow':'1.0-0' }} de ingresos:
                @if (monthShortfall() > 0) {
                  <strong class="txt-warn">faltan {{ monthShortfall() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong> para cubrir lo básico.
                } @else {
                  <strong class="txt-ok">lo básico del mes ya está cubierto ✓</strong>
                }
              </span>
            </div>
            <div class="coverage-track">
              <div class="coverage-fill" [style.width.%]="basicCoverageBar()" [class.full]="basicCoveragePercent() >= 100"></div>
            </div>
          </div>
        }

          <!-- Pestañas Egresos / Ingresos -->
          <div class="recurring-tabs">
            <button type="button" [class.active]="recurringTab() === 'egreso'" (click)="setRecurringTab('egreso')">
              ↙ Egresos básicos ({{ cf.recurringExpenses().length }})
            </button>
            <button type="button" [class.active]="recurringTab() === 'ingreso'" (click)="setRecurringTab('ingreso')">
              ↗ Ingresos básicos ({{ cf.recurringIncomes().length }})
            </button>
          </div>

          @if (tabItems().length > 0) {
            <div class="tab-progress">
              <div class="tp-text">
                <span>
                  {{ recurringTab() === 'ingreso' ? 'Recibido' : 'Pagado' }} en {{ getMonthLabel() }}:
                  <strong>{{ tabRegisteredTotal() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
                  de {{ tabMonthlyTotal() | currency:'COP':'symbol-narrow':'1.0-0' }}
                </span>
                <span class="tp-pending">
                  Pendiente: {{ tabPendingTotal() | currency:'COP':'symbol-narrow':'1.0-0' }} ({{ tabPendingCount() }})
                </span>
              </div>
              <div class="rk-track">
                <div class="rk-fill" [class.income]="recurringTab() === 'ingreso'" [style.width.%]="tabProgress()"></div>
              </div>
            </div>
          }

          <!-- Sugerencias rápidas -->
          @if (!showRecurringForm()) {
            <div class="recurring-presets">
              <span class="presets-label">Agregar {{ recurringTab() === 'ingreso' ? 'ingreso' : 'egreso' }}:</span>
              @for (p of tabPresets(); track p.name) {
                <button type="button" class="preset-chip" [class.used]="isPresetUsed(p.category)" (click)="openRecurringForm(p)">
                  <span>{{ p.icon }}</span> {{ p.name }}
                </button>
              }
              <button type="button" class="preset-chip custom" (click)="openRecurringForm()">＋ Personalizado</button>
            </div>
          }

          <!-- Formulario crear / editar -->
          @if (showRecurringForm()) {
            <div class="recurring-form" [class.income]="recurringTab() === 'ingreso'">
              <h4>
                {{ editingRecurringId() ? 'Editar' : 'Nuevo' }}
                {{ recurringTab() === 'ingreso' ? 'ingreso básico' : 'egreso básico' }}
              </h4>
              <div class="form-grid">
                <div class="form-field">
                  <label>Concepto</label>
                  <input type="text" [(ngModel)]="recName" maxlength="60"
                    [placeholder]="recurringTab() === 'ingreso' ? 'Ej: Arriendo apto 301, Local comercial' : 'Ej: Plan celular, EPS, Cuota carro'" />
                </div>
                <div class="form-field">
                  <label>Monto mensual (COP)</label>
                  <input umCurrencyInput [(ngModel)]="recAmount" placeholder="0" />
                </div>
                <div class="form-field">
                  <label>Categoría</label>
                  <select [(ngModel)]="recCategory">
                    @for (cat of tabCategories(); track cat) {
                      <option [value]="cat">{{ getCategoryLabel(cat) }}</option>
                    }
                  </select>
                </div>
                <div class="form-field">
                  <label>{{ recurringTab() === 'ingreso' ? 'Día de cobro (1–31)' : 'Día de pago (1–31)' }}</label>
                  <input type="number" min="1" max="31" [(ngModel)]="recDay" />
                </div>
              </div>
              <div class="form-field">
                <label>Ícono</label>
                <div class="icon-picker">
                  @for (ic of tabIcons(); track ic) {
                    <button type="button" class="icon-opt" [class.active]="recIcon === ic" (click)="recIcon = ic">{{ ic }}</button>
                  }
                </div>
              </div>
              <div class="form-field notes-field" style="margin-top: 12px;">
                <label>Notas (opcional)</label>
                <input type="text" [(ngModel)]="recNotes" maxlength="120"
                  [placeholder]="recurringTab() === 'ingreso' ? 'Ej: Inquilino Juan Pérez, consigna en Bancolombia' : 'Ej: Débito automático Bancolombia'" />
              </div>
              <div class="recurring-form-actions">
                <button type="button" class="btn-ghost" (click)="closeRecurringForm()">Cancelar</button>
                <button type="button" class="btn-save inline" [disabled]="!canSaveRecurring()" (click)="saveRecurring()">
                  {{ editingRecurringId() ? 'Guardar cambios' : (recurringTab() === 'ingreso' ? 'Agregar ingreso básico' : 'Agregar egreso básico') }}
                </button>
              </div>
            </div>
          }

          <!-- Lista -->
          @if (tabItems().length === 0 && !showRecurringForm()) {
            <div class="recurring-empty">
              @if (recurringTab() === 'ingreso') {
                Aún no tienes ingresos básicos. Agrega los que recibes fijo cada mes (arriendos, salario, pensión…)
                para saber cuánto te falta conseguir para cubrir tus gastos básicos.
              } @else {
                Aún no tienes egresos básicos. Elige un concepto sugerido arriba (salud, telefonía, internet, alimentación,
                transporte, créditos…) o crea uno personalizado.
              }
            </div>
          }

          @if (tabItems().length > 0) {
            <div class="recurring-list">
              @for (r of tabItems(); track r.id) {
                @let status = cf.getRecurringStatus(r);
                <div class="recurring-row" [class.paused]="!r.active">
                  <span class="rr-icon">{{ r.icon || '🧾' }}</span>
                  <div class="rr-info">
                    <p class="rr-name">{{ r.name }}</p>
                    <p class="rr-meta">
                      {{ getCategoryLabel(r.category) }} · Día {{ r.dayOfMonth }}
                      @if (r.active && tabMonthlyTotal() > 0) {
                        · {{ getSharePercent(r.amount) }}% del total
                      }
                    </p>
                  </div>
                  <span [class]="'rr-status ' + status">{{ getStatusLabel(status) }}</span>
                  <span class="rr-amount" [class.income]="recurringTab() === 'ingreso'">
                    {{ recurringTab() === 'ingreso' ? '+' : '-' }}{{ r.amount | currency:'COP':'symbol-narrow':'1.0-0' }}
                  </span>
                  <div class="rr-actions">
                    @if (r.active && status !== 'registered') {
                      <button type="button" class="rr-btn primary" (click)="registerOne(r.id)" title="Registrar en {{ getMonthLabel() }}">Registrar</button>
                    }
                    <button type="button" class="rr-btn" (click)="editRecurring(r)" title="Editar">✏️</button>
                    <button type="button" class="rr-btn" (click)="toggleRecurringActive(r)" [title]="r.active ? 'Pausar' : 'Activar'">{{ r.active ? '⏸' : '▶' }}</button>
                    <button type="button" class="rr-btn danger" (click)="deleteRecurring(r)" title="Eliminar"><um-icon name="trash" [size]="13"></um-icon></button>
                  </div>
                </div>
              }
            </div>
          }

          @if (cf.recurringItems().length > 0) {
            <div class="recurring-footer">
              <label class="auto-toggle">
                <input type="checkbox" [ngModel]="cf.recurringSettings().autoApply" (ngModelChange)="cf.setRecurringAutoApply($event)" />
                <span>Registrar automáticamente cada mes en su día de pago / cobro</span>
              </label>
              <button type="button" class="btn-register-all" [class.income]="recurringTab() === 'ingreso'"
                [disabled]="tabPendingCount() === 0" (click)="registerAllPending()">
                Registrar {{ recurringTab() === 'ingreso' ? 'ingresos' : 'egresos' }} pendientes de {{ getMonthLabel() }} ({{ tabPendingCount() }})
              </button>
            </div>
          }
        </section>
      }

      <!-- ═══ Quick Add Form (Modal Flotante) ═══ -->
      @if (showForm()) {
        <div class="modal-overlay" (click)="showForm.set(false)">
          <div class="modal-card form-panel" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Nuevo movimiento</h3>
              <button type="button" class="btn-close-modal" (click)="showForm.set(false)" title="Cerrar">✕</button>
            </div>

            <!-- Type toggle -->
            <div class="type-toggle">
              <button
                type="button"
                class="toggle-btn"
                [class.active]="formType() === 'ingreso'"
                (click)="formType.set('ingreso')">
                ↗ Ingreso
              </button>
              <button
                type="button"
                class="toggle-btn"
                [class.active]="formType() === 'egreso'"
                (click)="formType.set('egreso')">
                ↙ Egreso
              </button>
            </div>

            <div class="form-grid">
              <div class="form-field">
                <label>Descripción</label>
                <input type="text" [(ngModel)]="formDesc" placeholder="Ej: Pago cliente Acme" />
              </div>
              <div class="form-field">
                <label>Monto (COP)</label>
                <input umCurrencyInput [(ngModel)]="formAmount" placeholder="0" />
              </div>
              <div class="form-field">
                <label>Categoría</label>
                <select [(ngModel)]="formCategory">
                  @for (cat of getCategories(); track cat) {
                    <option [value]="cat">{{ getCategoryLabel(cat) }}</option>
                  }
                </select>
              </div>
              <div class="form-field">
                <label>Fecha</label>
                <input type="date" [(ngModel)]="formDate" />
              </div>
              <!-- Optional Product Link -->
              <div class="form-field">
                <label>Vincular Producto (Inventario)</label>
                <select [(ngModel)]="formLinkedProductId" (ngModelChange)="onLinkedProductChange()">
                  <option value="">Ninguno</option>
                  @for (p of productService.products(); track p.id) {
                    <option [value]="p.id">{{ p.name }} (Stock: {{ p.currentStock }})</option>
                  }
                </select>
              </div>
              @if (formLinkedProductId) {
                <div class="form-field">
                  <label>Cantidad de Unidades</label>
                  <input type="number" [(ngModel)]="formLinkedQty" min="1" (ngModelChange)="onLinkedQtyChange()" />
                </div>
              }
            </div>

            <div class="form-field notes-field">
              <label>Notas (opcional)</label>
              <textarea [(ngModel)]="formNotes" rows="2" placeholder="Detalle adicional..."></textarea>
            </div>

            <div class="modal-form-actions">
              <button type="button" class="btn-ghost" (click)="showForm.set(false)">Cancelar</button>
              <button type="button" class="btn-save" [disabled]="!canSave()" (click)="save()">
                Guardar {{ formType() === 'ingreso' ? 'ingreso' : 'egreso' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'cashflow.scss',
})
export class CashflowComponent {
  cf = inject(CashflowService);
  productService = inject(ProductCatalogService);

  mainTab = signal<CashflowMainTab>('cashflow');

  showForm = signal(false);
  formType = signal<TransactionType>('ingreso');
  formDesc = '';
  formAmount: number | null = null;
  formCategory: TransactionCategory = 'ventas';
  formDate = new Date().toISOString().split('T')[0];
  formNotes = '';
  filterType = signal<'all' | TransactionType>('all');

  // Enlace a producto
  formLinkedProductId = '';
  formLinkedQty = 1;

  // ─── Ingresos y egresos básicos mensuales ──────────
  showRecurringPanel = signal(true);
  showRecurringForm = signal(false);
  recurringTab = signal<TransactionType>('egreso');
  editingRecurringId = signal<string | null>(null);
  recName = '';
  recAmount: number | null = null;
  recCategory: TransactionCategory = 'otros_egresos';
  recDay = 1;
  recIcon = '🧾';
  recNotes = '';

  tabItems = computed(() =>
    this.recurringTab() === 'ingreso' ? this.cf.recurringIncomes() : this.cf.recurringExpenses()
  );
  tabPresets = computed<RecurringPreset[]>(() =>
    this.recurringTab() === 'ingreso' ? RECURRING_INCOME_PRESETS : RECURRING_EXPENSE_PRESETS
  );
  tabIcons = computed(() =>
    this.recurringTab() === 'ingreso' ? RECURRING_INCOME_ICONS : RECURRING_EXPENSE_ICONS
  );
  tabCategories = computed(() =>
    this.recurringTab() === 'ingreso' ? INGRESO_CATEGORIES : EGRESO_CATEGORIES
  );
  tabMonthlyTotal = computed(() =>
    this.recurringTab() === 'ingreso' ? this.cf.monthlyBasicIncomeTotal() : this.cf.monthlyBasicTotal()
  );
  tabRegisteredTotal = computed(() =>
    this.recurringTab() === 'ingreso' ? this.cf.recurringIncomeRegisteredTotal() : this.cf.recurringRegisteredTotal()
  );

  private tabPending = computed(() => {
    const registered = this.cf.recurringMonthTransactions();
    return this.tabItems().filter(r => r.active && r.amount > 0 && !registered.has(r.id));
  });

  tabPendingCount = computed(() => this.tabPending().length);
  tabPendingTotal = computed(() => this.tabPending().reduce((sum, r) => sum + r.amount, 0));

  tabProgress = computed(() => {
    const total = this.tabMonthlyTotal();
    if (total <= 0) return 0;
    return Math.min(100, Math.round((this.tabRegisteredTotal() / total) * 100));
  });

  /** % de los gastos básicos cubiertos por ingresos básicos fijos */
  basicCoveragePercent = computed(() => {
    const expenses = this.cf.monthlyBasicTotal();
    if (expenses <= 0) return 100;
    return Math.round((this.cf.monthlyBasicIncomeTotal() / expenses) * 100);
  });

  basicCoverageBar = computed(() => Math.min(100, this.basicCoveragePercent()));

  /** Faltante real del mes: gastos básicos − ingresos totales ya registrados en el mes */
  monthShortfall = computed(() =>
    Math.max(0, this.cf.monthlyBasicTotal() - this.cf.summary().totalIngresos)
  );

  filteredTransactions = () => {
    const type = this.filterType();
    const txs = this.cf.monthTransactions();
    if (type === 'all') return txs;
    return txs.filter(t => t.type === type);
  };

  setRecurringTab(tab: TransactionType): void {
    if (this.recurringTab() === tab) return;
    this.recurringTab.set(tab);
    this.closeRecurringForm();
  }

  isPresetUsed(category: TransactionCategory): boolean {
    return this.tabItems().some(r => r.category === category);
  }

  getSharePercent(amount: number): number {
    const total = this.tabMonthlyTotal();
    return total > 0 ? Math.round((amount / total) * 100) : 0;
  }

  getStatusLabel(status: RecurringMonthStatus): string {
    const income = this.recurringTab() === 'ingreso';
    switch (status) {
      case 'registered': return income ? '✓ Recibido' : '✓ Registrado';
      case 'pending': return income ? 'Por recibir' : 'Pendiente';
      case 'scheduled': return 'Programado';
      case 'paused': return 'Pausado';
    }
  }

  openRecurringForm(preset?: RecurringPreset): void {
    const income = this.recurringTab() === 'ingreso';
    this.editingRecurringId.set(null);
    this.recName = preset?.name || '';
    this.recCategory = preset?.category || (income ? 'otros_ingresos' : 'otros_egresos');
    this.recIcon = preset?.icon || (income ? '💰' : '🧾');
    this.recAmount = null;
    this.recDay = Math.min(28, new Date().getDate());
    this.recNotes = '';
    this.showRecurringForm.set(true);
    this.showRecurringPanel.set(true);
  }

  editRecurring(r: RecurringExpense): void {
    this.recurringTab.set(getRecurringType(r));
    this.editingRecurringId.set(r.id);
    this.recName = r.name;
    this.recCategory = r.category;
    this.recIcon = r.icon || '🧾';
    this.recAmount = r.amount;
    this.recDay = r.dayOfMonth;
    this.recNotes = r.notes || '';
    this.showRecurringForm.set(true);
  }

  closeRecurringForm(): void {
    this.showRecurringForm.set(false);
    this.editingRecurringId.set(null);
  }

  canSaveRecurring(): boolean {
    const day = Number(this.recDay);
    return !!(this.recName.trim() && this.recAmount && this.recAmount > 0 && day >= 1 && day <= 31);
  }

  saveRecurring(): void {
    if (!this.canSaveRecurring()) return;
    const data = {
      type: this.recurringTab(),
      name: this.recName.trim(),
      category: this.recCategory,
      icon: this.recIcon,
      amount: this.recAmount!,
      dayOfMonth: Number(this.recDay),
      notes: this.recNotes.trim() || undefined,
    };
    const editingId = this.editingRecurringId();
    if (editingId) {
      this.cf.updateRecurring(editingId, data);
    } else {
      this.cf.addRecurring({ ...data, active: true });
    }
    this.closeRecurringForm();
  }

  toggleRecurringActive(r: RecurringExpense): void {
    this.cf.updateRecurring(r.id, { active: !r.active });
  }

  deleteRecurring(r: RecurringExpense): void {
    const label = getRecurringType(r) === 'ingreso' ? 'ingreso básico' : 'egreso básico';
    if (!confirm(`¿Eliminar el ${label} "${r.name}"? Los movimientos ya registrados en el flujo se conservan.`)) return;
    if (this.editingRecurringId() === r.id) this.closeRecurringForm();
    this.cf.removeRecurring(r.id);
  }

  registerOne(id: string): void {
    this.cf.registerRecurring(id, this.cf.activeMonth());
  }

  registerAllPending(): void {
    const count = this.tabPendingCount();
    if (count === 0) return;
    const label = this.recurringTab() === 'ingreso' ? 'ingreso(s)' : 'egreso(s)';
    if (!confirm(`Se registrarán ${count} ${label} básico(s) en ${this.getMonthLabel()} por ${this.formatCOP(this.tabPendingTotal())}. ¿Continuar?`)) return;
    this.cf.registerAllPendingRecurring(this.cf.activeMonth(), this.recurringTab());
  }

  private formatCOP(value: number): string {
    return '$' + value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  getMonthLabel(): string {
    const [y, m] = this.cf.activeMonth().split('-').map(Number);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${months[m - 1]} ${y}`;
  }

  getCategories(): TransactionCategory[] {
    return this.formType() === 'ingreso' ? INGRESO_CATEGORIES : EGRESO_CATEGORIES;
  }

  getCategoryLabel(cat: TransactionCategory): string {
    return CATEGORY_LABELS[cat] || cat;
  }

  canSave(): boolean {
    return !!(this.formDesc.trim() && this.formAmount && this.formAmount > 0 && this.formDate);
  }

  save(): void {
    if (!this.canSave()) return;

    const txId = crypto.randomUUID();

    // Registrar en Flujo de Caja
    this.cf.add({
      type: this.formType(),
      category: this.formCategory,
      description: this.formDesc.trim(),
      amount: this.formAmount!,
      date: this.formDate,
      notes: this.formNotes.trim() || undefined,
      linkedProductId: this.formLinkedProductId || undefined,
      linkedQuantity: this.formLinkedProductId ? this.formLinkedQty : undefined,
    });

    // Si hay producto vinculado, generar movimiento en inventario correspondiente
    if (this.formLinkedProductId) {
      const type = this.formType() === 'ingreso' ? 'salida' : 'entrada';
      const reason = this.formType() === 'ingreso' ? 'Venta (Flujo de Caja)' : 'Compra (Flujo de Caja)';
      this.productService.registerMovement(
        this.formLinkedProductId,
        type,
        this.formLinkedQty,
        reason,
        true,
        undefined,
        txId
      );
    }

    // Reset
    this.formDesc = '';
    this.formAmount = null;
    this.formNotes = '';
    this.formLinkedProductId = '';
    this.formLinkedQty = 1;
    this.showForm.set(false);
  }

  onLinkedProductChange(): void {
    if (!this.formLinkedProductId) return;
    const prod = this.productService.getProductById(this.formLinkedProductId);
    if (prod) {
      this.formLinkedQty = 1;
      const price = this.formType() === 'ingreso' ? prod.salePrice : prod.costPrice;
      this.formAmount = price;
      if (!this.formDesc.trim()) {
        this.formDesc = this.formType() === 'ingreso' 
          ? `Venta: ${prod.name}` 
          : `Compra: ${prod.name}`;
      }
    }
  }

  onLinkedQtyChange(): void {
    if (!this.formLinkedProductId) return;
    const prod = this.productService.getProductById(this.formLinkedProductId);
    if (prod) {
      const price = this.formType() === 'ingreso' ? prod.salePrice : prod.costPrice;
      this.formAmount = price * Math.max(1, this.formLinkedQty);
    }
  }
}
