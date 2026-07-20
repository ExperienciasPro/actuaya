import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../../core/services/budget.service';
import { FinanceService } from '../../../core/services/finance.service';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';


@Component({
  selector: 'um-budget-planner',
  standalone: true,
  imports: [FormsModule, CurrencyInputDirective, UmIconComponent],
  template: `
    <div class="budget-page">

      <!-- Header -->
      <div class="bp-header animate-fadeInUp">
        <div class="header-left">
          <h1>💰 Planeación Financiera</h1>
          <p class="header-sub">Capital disponible vs. inversiones proyectadas</p>
        </div>
        <div class="year-actions-wrap">
          <div class="year-selector">
            <button class="year-btn" (click)="changeYear(-1)">‹</button>
            <span class="year-label">{{ selectedYear() }}</span>
            <button class="year-btn" (click)="changeYear(1)">›</button>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-row animate-fadeInUp stagger-1">
        <div class="summary-card income-card">
          <span class="sum-icon">💵</span>
          <div class="sum-info">
            <span class="sum-label">Capital Disponible</span>
            <span class="sum-value">\${{ formatMoney(totalIncome()) }}</span>
          </div>
        </div>
        <div class="summary-card invest-card">
          <span class="sum-icon">📊</span>
          <div class="sum-info">
            <span class="sum-label">Inversiones Proyectadas</span>
            <span class="sum-value">\${{ formatMoney(totalInvestments()) }}</span>
          </div>
        </div>
        <div class="summary-card balance-card" [class.negative]="balance() < 0">
          <span class="sum-icon">{{ balance() >= 0 ? '✅' : '⚠️' }}</span>
          <div class="sum-info">
            <span class="sum-label">Saldo Disponible</span>
            <span class="sum-value">\${{ formatMoney(balance()) }}</span>
          </div>
          <div class="balance-bar">
            <div class="balance-fill" [style.width.%]="usagePercent()"></div>
          </div>
          <span class="balance-pct">{{ usagePercent() }}% comprometido</span>
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="tables-grid animate-fadeInUp stagger-2">

        <!-- Income Table -->
        <div class="table-section">
          <div class="table-header income">
            <h2>💵 Capital Disponible</h2>
            <span class="table-total">\${{ formatMoney(totalIncome()) }}</span>
          </div>
          <div class="table-body">
            <button type="button" class="add-trigger" (click)="startAdd('income')">+ Agregar fuente de capital</button>
            @if (addingIncome()) {
              <div class="table-row add-row">
                <input class="row-input name" [(ngModel)]="newName" placeholder="Ej: Acciones, Bancos, Efectivo..." (keyup.enter)="confirmAdd('income')" (keyup.escape)="cancelAdd()" autofocus />
                <input class="row-input amount" type="text" umCurrencyInput [(ngModel)]="newAmount" placeholder="0" (keyup.enter)="confirmAdd('income')" (keyup.escape)="cancelAdd()" />
                <div class="row-actions">
                  <button type="button" class="action-btn save" (click)="confirmAdd('income')">✓</button>
                  <button type="button" class="action-btn cancel" (click)="cancelAdd()">✕</button>
                </div>
              </div>
            }
            @for (entry of incomeEntries(); track entry.id) {
              <div class="table-row" [class.editing]="editingId() === entry.id">
                @if (editingId() === entry.id) {
                  <input
                    class="row-input name"
                    [(ngModel)]="editName"
                    placeholder="Concepto"
                    (keyup.enter)="saveEdit(entry.id)"
                    (keyup.escape)="cancelEdit()"
                  />
                  <input
                    class="row-input amount"
                    type="text"
                    umCurrencyInput
                    [(ngModel)]="editAmount"
                    placeholder="Monto"
                    (keyup.enter)="saveEdit(entry.id)"
                    (keyup.escape)="cancelEdit()"
                  />
                  <div class="row-actions">
                    <button type="button" class="action-btn save" (click)="saveEdit(entry.id)" title="Guardar">✓</button>
                    <button type="button" class="action-btn cancel" (click)="cancelEdit()" title="Cancelar">✕</button>
                  </div>
                } @else {
                  <span class="row-name" (dblclick)="startEdit(entry)">{{ entry.name }}</span>
                  <span class="row-amount" (dblclick)="startEdit(entry)">\${{ formatMoney(entry.amount) }}</span>
                  <div class="row-actions">
                    <button type="button" class="action-btn edit" (click)="startEdit(entry)" title="Editar">✏️</button>
                    <button type="button" class="action-btn del" (click)="deleteEntry(entry.id)" title="Eliminar"><um-icon name="trash" [size]="16"></um-icon></button>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Investment Table -->
        <div class="table-section">
          <div class="table-header invest">
            <h2>📊 Inversiones Proyectadas</h2>
            <span class="table-total">\${{ formatMoney(totalInvestments()) }}</span>
          </div>
          <div class="table-body">
            <button type="button" class="add-trigger" (click)="startAdd('investment')">+ Agregar inversión</button>
            @if (addingInvestment()) {
              <div class="table-row add-row">
                <input class="row-input name" [(ngModel)]="newName" placeholder="Ej: Casa, Apartamento, Vehículo..." (keyup.enter)="confirmAdd('investment')" (keyup.escape)="cancelAdd()" autofocus />
                <input class="row-input amount" type="text" umCurrencyInput [(ngModel)]="newAmount" placeholder="0" (keyup.enter)="confirmAdd('investment')" (keyup.escape)="cancelAdd()" />
                <div class="row-actions">
                  <button type="button" class="action-btn save" (click)="confirmAdd('investment')">✓</button>
                  <button type="button" class="action-btn cancel" (click)="cancelAdd()">✕</button>
                </div>
              </div>
            }
            @for (entry of investmentEntries(); track entry.id) {
              <div class="table-row" [class.editing]="editingId() === entry.id">
                @if (editingId() === entry.id) {
                  <input
                    class="row-input name"
                    [(ngModel)]="editName"
                    placeholder="Concepto"
                    (keyup.enter)="saveEdit(entry.id)"
                    (keyup.escape)="cancelEdit()"
                  />
                  <input
                    class="row-input amount"
                    type="text"
                    umCurrencyInput
                    [(ngModel)]="editAmount"
                    placeholder="Monto"
                    (keyup.enter)="saveEdit(entry.id)"
                    (keyup.escape)="cancelEdit()"
                  />
                  <div class="row-actions">
                    <button type="button" class="action-btn save" (click)="saveEdit(entry.id)" title="Guardar">✓</button>
                    <button type="button" class="action-btn cancel" (click)="cancelEdit()" title="Cancelar">✕</button>
                  </div>
                } @else {
                  <span class="row-name" (dblclick)="startEdit(entry)">{{ entry.name }}</span>
                  <span class="row-amount" (dblclick)="startEdit(entry)">\${{ formatMoney(entry.amount) }}</span>
                  <div class="row-actions">
                    <button type="button" class="action-btn edit" (click)="startEdit(entry)" title="Editar">✏️</button>
                    <button type="button" class="action-btn del" (click)="deleteEntry(entry.id)" title="Eliminar"><um-icon name="trash" [size]="16"></um-icon></button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Visual Breakdown -->
      @if (incomeEntries().length) {
        <div class="breakdown-section animate-fadeInUp stagger-3">
          <h2>Composición del Capital</h2>
          <div class="stacked-bar">
            @for (seg of incomeSegments(); track seg.id) {
              <div
                class="stacked-segment"
                [style.width.%]="seg.pct"
                [style.background]="seg.color"
                [title]="seg.name + ': $' + formatMoney(seg.amount)"
              ></div>
            }
          </div>
          <div class="breakdown-legend">
            @for (seg of incomeSegments(); track seg.id) {
              <div class="legend-chip">
                <span class="chip-dot" [style.background]="seg.color"></span>
                <span class="chip-name">{{ seg.name }}</span>
                <span class="chip-pct">{{ seg.pct }}%</span>
              </div>
            }
          </div>
        </div>
      }
      <!-- Toast -->
      @if (toast()) {
        <div class="toast animate-fadeInUp">{{ toast() }}</div>
      }
    </div>
  `,
  styleUrl: 'budget-planner.scss',
})
export class BudgetPlannerComponent {
  private budgetService = inject(BudgetService);
  private financeService = inject(FinanceService);

  selectedYear = signal(new Date().getFullYear());
  toast = signal('');

  // Reactive data
  incomeEntries = computed(() => {
    this.budgetService.budgets(); // trigger reactivity
    return this.budgetService.getIncomeEntries(this.selectedYear());
  });
  investmentEntries = computed(() => {
    this.budgetService.budgets();
    return this.budgetService.getInvestmentEntries(this.selectedYear());
  });
  totalIncome = computed(() => {
    this.budgetService.budgets();
    return this.budgetService.totalIncome(this.selectedYear());
  });
  totalInvestments = computed(() => {
    this.budgetService.budgets();
    return this.budgetService.totalInvestments(this.selectedYear());
  });
  balance = computed(() => this.totalIncome() - this.totalInvestments());
  usagePercent = computed(() => {
    const inc = this.totalIncome();
    if (!inc) return 0;
    return Math.min(100, Math.round((this.totalInvestments() / inc) * 100));
  });

  // Add state
  addingIncome = signal(false);
  addingInvestment = signal(false);
  newName = '';
  newAmount: number | null = null;

  // Edit state
  editingId = signal<string | null>(null);
  editName = '';
  editAmount: number | null = null;

  private readonly COLORS = [
    '#6c5ce7', '#00cec9', '#54a0ff', '#feca57', '#fd79a8',
    '#e17055', '#00b894', '#a29bfe', '#fdcb6e', '#74b9ff',
    '#55efc4', '#fab1a0', '#81ecec', '#dfe6e9',
  ];

  incomeSegments = computed(() => {
    const entries = this.incomeEntries();
    const total = this.totalIncome();
    if (!total) return [];
    return entries.map((e, i) => ({
      id: e.id,
      name: e.name,
      amount: e.amount,
      pct: Math.round((e.amount / total) * 100),
      color: this.COLORS[i % this.COLORS.length],
    }));
  });

  changeYear(delta: number): void {
    this.selectedYear.update(y => y + delta);
    this.budgetService.ensureYear(this.selectedYear());
    this.cancelEdit();
    this.cancelAdd();
  }

  // ─── Add ─────────────────────────────
  startAdd(category: 'income' | 'investment'): void {
    this.cancelEdit();
    this.newName = '';
    this.newAmount = null;
    if (category === 'income') {
      this.addingIncome.set(true);
      this.addingInvestment.set(false);
    } else {
      this.addingInvestment.set(true);
      this.addingIncome.set(false);
    }
  }

  confirmAdd(category: 'income' | 'investment'): void {
    const name = this.newName.trim();
    const amount = this.newAmount || 0;
    if (!name) return;
    this.budgetService.addEntry(this.selectedYear(), name, amount, category);
    this.cancelAdd();
  }

  cancelAdd(): void {
    this.addingIncome.set(false);
    this.addingInvestment.set(false);
    this.newName = '';
    this.newAmount = null;
  }

  // ─── Edit ────────────────────────────
  startEdit(entry: { id: string; name: string; amount: number }): void {
    this.cancelAdd();
    this.editingId.set(entry.id);
    this.editName = entry.name;
    this.editAmount = entry.amount;
  }

  saveEdit(entryId: string): void {
    const name = this.editName.trim();
    const amount = this.editAmount || 0;
    if (!name) return;
    this.budgetService.updateEntry(this.selectedYear(), entryId, { name, amount });
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editName = '';
    this.editAmount = null;
  }

  // ─── Delete ──────────────────────────
  deleteEntry(entryId: string): void {
    this.budgetService.deleteEntry(this.selectedYear(), entryId);
  }

  // ─── Formatting ──────────────────────
  formatMoney(n: number): string {
    return n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  importFromAccounting(): void {
    const incomes = this.financeService.incomes();
    const investments = this.financeService.investments();

    const { importedIncomes, importedInvestments } = this.budgetService.importFromAccounting(
      this.selectedYear(),
      incomes,
      investments
    );

    if (importedIncomes === 0 && importedInvestments === 0) {
      this.showToast('ℹ️ No hay nuevos datos reales para cargar o ya fueron importados.');
    } else {
      this.showToast(`✅ Cargados: ${importedIncomes} fuentes de capital y ${importedInvestments} inversiones.`);
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }

}
