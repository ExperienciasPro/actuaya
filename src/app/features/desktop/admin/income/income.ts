import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CurrencyInputDirective } from '../../../../shared/directives/currency-input.directive';
import { FinanceService, COMPANIES, DIVIDEND_COMPANIES } from '../../../../core/services/finance.service';

@Component({
  selector: 'um-admin-income',
  standalone: true,
  imports: [FormsModule, DecimalPipe, CurrencyInputDirective],
  template: `
    <div class="admin-page">
      <div class="page-header animate-fadeInUp">
        <div>
          <h1>💰 Ingresos</h1>
          <p class="subtitle">Registra y consulta tus ingresos.</p>
        </div>
        <div class="header-totals">
          <div class="years-scroller">
            @for (yTotal of incomeTotalsByYear(); track yTotal.year) {
              <div class="total-badge green" (click)="filterYear.set(yTotal.year)" [style.cursor]="'pointer'" [style.opacity]="filterYear() === yTotal.year ? '1' : '0.6'" [style.border]="filterYear() === yTotal.year ? '2px solid #00b894' : '2px solid transparent'">
                <span class="total-label">Total {{ yTotal.year }}</span>
                <span class="total-value">\${{ yTotal.amount | number:'1.0-0' }}</span>
              </div>
            }
          </div>
          <div class="total-badge blue" (click)="filterYear.set('')" [style.cursor]="'pointer'" [style.border]="filterYear() === '' ? '2px solid #6c5ce7' : '2px solid transparent'" [style.opacity]="filterYear() === '' ? '1' : '0.7'">
            <span class="total-label">Todos los años</span>
            <span class="total-value">\${{ finance.totalIncome() | number:'1.0-0' }}</span>
          </div>
        </div>
      </div>

      <!-- ═══ INCOME SECTION ═══ -->
      <div class="form-card animate-fadeInUp stagger-1">
        <h3 class="section-title">
          <span class="title-icon income-icon">💰</span> 
          {{ editingId ? 'Editar Ingreso' : 'Nuevo Ingreso' }}
        </h3>
        <form class="inline-form" (ngSubmit)="addIncome()">
          <div class="form-field">
            <label>Empresa</label>
            <select [(ngModel)]="newCompany" name="company" (ngModelChange)="onCompanyChange()">
              <option value="">Seleccionar...</option>
              @for (c of companies; track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label>Concepto</label>
            @if (isDividendCompany()) {
              <input type="text" [value]="'Dividendos'" disabled />
            } @else {
              <input type="text" [(ngModel)]="newConcept" name="concept" placeholder="Ej: Proyecto web, Asesoría" />
            }
          </div>
          <div class="form-field">
            <label>Fecha</label>
            <input type="date" [(ngModel)]="newDate" name="date" />
          </div>
          <div class="form-field">
            <label>Monto (COP)</label>
            <input umCurrencyInput [(ngModel)]="newAmount" name="amount" placeholder="0" />
          </div>
          <div class="form-actions-inline">
            <button type="submit" class="btn-add" [disabled]="!canSubmit()">
              {{ editingId ? 'Guardar' : '+ Agregar' }}
            </button>
            @if (editingId) {
              <button type="button" class="btn-cancel-edit" (click)="cancelEdit()">Cancelar</button>
            }
          </div>
        </form>
      </div>

      <!-- Filter -->
      <div class="filter-bar animate-fadeInUp stagger-2">
        <div class="filter-controls">
          <select [(ngModel)]="filterCompany" name="filter">
            <option value="">Todas las empresas</option>
            @for (c of companies; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>
        <span class="result-count">{{ filteredIncomes().length }} registros</span>
      </div>

      <!-- Income Table -->
      <div class="table-wrap animate-fadeInUp stagger-2">
        @if (filteredIncomes().length) {
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empresa</th>
                <th>Concepto</th>
                <th class="right">Monto</th>
                <th class="right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (inc of filteredIncomes(); track inc.id) {
                <tr [class.editing-row]="editingId === inc.id">
                  <td>{{ inc.date }}</td>
                  <td><span class="company-tag">{{ inc.company }}</span></td>
                  <td>{{ inc.concept }}</td>
                  <td class="right mono">\${{ inc.amount | number:'1.0-0' }}</td>
                  <td class="right actions-cell">
                    <button class="btn-edit" (click)="edit(inc)" title="Editar">✏️</button>
                    <button class="btn-delete" (click)="delete(inc.id)" title="Eliminar">✕</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="empty">Sin ingresos registrados. Agrega el primero arriba ☝️</div>
        }
      </div>
    </div>
  `,
  styleUrl: 'income.scss',
})
export class AdminIncomeComponent {
  finance = inject(FinanceService);
  companies = COMPANIES;

  // ─── Income form ───
  newCompany = '';
  newConcept = '';
  newDate = new Date().toISOString().substring(0, 10);
  newAmount: number | null = null;
  filterCompany = '';
  filterYear = signal('');
  editingId = '';

  isDividendCompany(): boolean {
    return DIVIDEND_COMPANIES.includes(this.newCompany);
  }

  canSubmit(): boolean {
    return !!(this.newCompany && this.newDate && (this.newAmount ?? 0) > 0 &&
      (this.isDividendCompany() || this.newConcept.trim()));
  }

  availableYears = computed(() => {
    const recordYears = this.finance.incomes().map(i => i.date.substring(0, 4));
    const historicalYears = this.finance.historicalYears().map(h => String(h.year));
    const allYears = new Set([...recordYears, ...historicalYears, '2027']);
    return [...allYears].sort((a, b) => b.localeCompare(a));
  });

  incomeTotalsByYear = computed(() => {
    const totalsMap = new Map<string, number>();
    
    // Año 2027 por defecto
    totalsMap.set('2027', 0);

    // Primero añadimos los años históricos
    for (const h of this.finance.historicalYears()) {
      totalsMap.set(String(h.year), h.grossIncome);
    }
    
    // Si hay registros detallados para ese año, estos reemplazan/sobreescriben el valor del histórico simple
    const recordYears = new Set(this.finance.incomes().map(i => i.date.substring(0, 4)));
    for (const inc of this.finance.incomes()) {
      const year = inc.date.substring(0, 4);
      if (recordYears.has(year)) {
        // Inicializamos a 0 la primera vez que vemos un registro detallado para este año
        if (!totalsMap.has(year) || totalsMap.get(year) === this.finance.historicalYears().find(h => String(h.year) === year)?.grossIncome) {
          totalsMap.set(year, 0);
        }
        totalsMap.set(year, totalsMap.get(year)! + inc.amount);
      }
    }

    return Array.from(totalsMap.entries())
      .map(([year, amount]) => ({ year, amount }))
      .filter(item => item.amount > 0 || item.year === '2027')
      .sort((a, b) => b.year.localeCompare(a.year));
  });

  filteredIncomes = computed(() => {
    const f = this.filterCompany;
    const y = this.filterYear();
    let all = this.finance.incomes();
    if (f) all = all.filter(i => i.company === f);
    if (y) all = all.filter(i => i.date.startsWith(y));
    return all;
  });

  onCompanyChange(): void {
    if (this.isDividendCompany()) {
      this.newConcept = 'Dividendos';
    } else {
      if (this.newConcept === 'Dividendos') {
        this.newConcept = '';
      }
    }
  }

  edit(inc: any): void {
    this.editingId = inc.id;
    this.newCompany = inc.company;
    this.newConcept = inc.concept;
    this.newDate = inc.date;
    this.newAmount = inc.amount;
  }

  cancelEdit(): void {
    this.editingId = '';
    this.newCompany = '';
    this.newConcept = '';
    this.newAmount = null;
    this.newDate = new Date().toISOString().substring(0, 10);
  }

  addIncome(): void {
    if (!this.canSubmit()) return;
    
    if (this.editingId) {
      this.finance.updateIncome(this.editingId, {
        company: this.newCompany,
        concept: this.isDividendCompany() ? 'Dividendos' : this.newConcept.trim(),
        date: this.newDate,
        amount: this.newAmount!,
      });
      this.editingId = '';
    } else {
      this.finance.addIncome({
        company: this.newCompany,
        concept: this.isDividendCompany() ? 'Dividendos' : this.newConcept.trim(),
        date: this.newDate,
        amount: this.newAmount!,
      });
    }

    this.newCompany = '';
    this.newConcept = '';
    this.newAmount = null;
    this.newDate = new Date().toISOString().substring(0, 10);
  }

  delete(id: string): void {
    if (this.editingId === id) {
      this.cancelEdit();
    }
    this.finance.deleteIncome(id);
  }
}
