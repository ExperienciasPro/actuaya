import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CurrencyInputDirective } from '../../../../shared/directives/currency-input.directive';
import {
  FinanceService, InvestmentRecord, INVESTMENT_TYPES, InvestmentType,
} from '../../../../core/services/finance.service';

@Component({
  selector: 'um-admin-investments',
  standalone: true,
  imports: [FormsModule, DecimalPipe, CurrencyInputDirective],
  template: `
    <div class="admin-page">
      <div class="page-header animate-fadeInUp">
        <div>
          <h1>📈 Inversiones</h1>
          <p class="subtitle">Gestiona tu portafolio de inversiones.</p>
        </div>
        <div class="header-totals">
          <div class="total-badge blue">
            <span class="total-label">Invertido</span>
            <span class="total-value">\${{ finance.totalInvested() | number:'1.0-0' }} COP</span>
            <span class="total-sub">US\${{ totalInvestedUSD() | number:'1.0-2' }}</span>
          </div>
          <div class="total-badge green">
            <span class="total-label">Valor Actual</span>
            <span class="total-value">\${{ finance.totalCurrentValue() | number:'1.0-0' }} COP</span>
            <span class="total-sub">US\${{ totalCurrentValueUSD() | number:'1.0-2' }}</span>
          </div>
        </div>
      </div>

      <!-- Dollar Rate -->
      <div class="dollar-card animate-fadeInUp stagger-1">
        <div class="dollar-info">
          <span class="dollar-flag">🇺🇸</span>
          <div class="dollar-data">
            <span class="dollar-label">Dólar USD/COP (TRM)</span>
            @if (dollarRate()) {
              <span class="dollar-value">\${{ dollarRate() | number:'1.2-2' }} COP</span>
            } @else {
              <span class="dollar-loading">Cargando...</span>
            }
          </div>
        </div>
        <button class="btn-refresh" (click)="fetchDollarRate()">↻ Actualizar</button>
      </div>

      <!-- Add Form -->
      <div class="form-card animate-fadeInUp stagger-2">
        <h3>Nueva Inversión</h3>
        <form class="inline-form grid-investments" (ngSubmit)="addInvestment()">
          <div class="form-field">
            <label>Tipo</label>
            <select [(ngModel)]="newType" name="type">
              <option value="">Seleccionar...</option>
              @for (t of investmentTypes; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </div>
          @if (newType === 'custom') {
            <div class="form-field">
              <label>Nombre de la Inversión</label>
              <input type="text" [(ngModel)]="customTypeName" name="customName" placeholder="Ej. Criptomonedas" />
            </div>
          }
          <div class="form-field">
            <label>Descripción</label>
            <input type="text" [(ngModel)]="newDescription" name="description" placeholder="Ej: Apartamento Bogotá, CDT Bancolombia" />
          </div>
          <div class="form-field select-currency-field">
            <label>Moneda</label>
            <select [(ngModel)]="newCurrency" name="currency">
              <option value="COP">COP ($)</option>
              <option value="USD">USD (US$)</option>
            </select>
          </div>
          <div class="form-field">
            <label>Monto Invertido</label>
            <input umCurrencyInput [(ngModel)]="newAmount" name="amount" placeholder="0" />
          </div>
          <div class="form-field">
            <label>Valor Actual</label>
            <input umCurrencyInput [(ngModel)]="newCurrentValue" name="currentValue" placeholder="0" />
          </div>
          <button type="submit" class="btn-add" [disabled]="!canSubmit">+ Agregar</button>
        </form>
      </div>

      <!-- Portfolio Summary -->
      @if (finance.investments().length) {
        <div class="portfolio-grid animate-fadeInUp stagger-3">
          @for (type of portfolioSummary(); track type.type) {
            <div class="portfolio-card">
              <span class="port-icon">{{ type.icon }}</span>
              <span class="port-label">{{ type.label }}</span>
              <span class="port-value">\${{ type.total | number:'1.0-0' }}</span>
              <div class="port-bar">
                <div class="port-fill" [style.width.%]="type.pct" [style.background]="type.color"></div>
              </div>
              <span class="port-pct">{{ type.pct | number:'1.1-1' }}%</span>
            </div>
          }
        </div>
      }

      <!-- Table -->
      <div class="table-wrap animate-fadeInUp stagger-3">
        @if (finance.investments().length) {
          <table class="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descripción</th>
                <th class="right">Invertido</th>
                <th class="right">Valor Actual</th>
                <th class="right">Retorno</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (inv of finance.investments(); track inv.id) {
                @if (editingId === inv.id) {
                  <tr class="editing-row">
                    <td><span class="type-tag" [class]="inv.type === 'custom' ? 'other' : inv.type">{{ inv.name }}</span></td>
                    <td><input type="text" [(ngModel)]="editDescription" name="editDesc" class="inline-input desc-input" /></td>
                    <td class="right"><input umCurrencyInput [(ngModel)]="editAmount" name="editAmt" class="inline-input" /></td>
                    <td class="right"><input umCurrencyInput [(ngModel)]="editCurrentValue" name="editVal" class="inline-input" /></td>
                    <td class="right">—</td>
                    <td class="actions-cell">
                      <button class="btn-save" (click)="saveEdit(inv.id)">✓</button>
                      <button class="btn-cancel" (click)="cancelEdit()">✕</button>
                    </td>
                  </tr>
                } @else {
                  <tr>
                    <td><span class="type-tag" [class]="inv.type === 'custom' ? 'other' : inv.type">{{ inv.name }}</span></td>
                    <td class="desc-cell">{{ inv.description || '—' }}</td>
                    <td class="right mono">
                      {{ inv.currency === 'USD' ? 'US' : '' }}\${{ inv.amount | number:'1.0-0' }}
                    </td>
                    <td class="right mono">
                      {{ inv.currency === 'USD' ? 'US' : '' }}\${{ inv.currentValue | number:'1.0-0' }}
                    </td>
                    <td class="right" [class.positive]="inv.currentValue >= inv.amount" [class.negative]="inv.currentValue < inv.amount">
                      {{ getReturn(inv) }}%
                    </td>
                    <td class="actions-cell">
                      <button class="btn-edit" (click)="startEdit(inv)">✎</button>
                      <button class="btn-delete" (click)="delete(inv.id)">✕</button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        } @else {
          <div class="empty">Sin inversiones registradas. Agrega la primera ☝️</div>
        }
      </div>
    </div>
  `,
  styleUrl: 'investments.scss',
})
export class AdminInvestmentsComponent implements OnInit {
  finance = inject(FinanceService);
  investmentTypes = INVESTMENT_TYPES;

  newType = '';
  newDate = new Date().toISOString().substring(0, 10);
  newAmount: number | null = null;
  newCurrentValue: number | null = null;
  newCurrency: 'COP' | 'USD' = 'COP';
  customTypeName = '';
  newDescription = '';

  dollarRate = signal<number | null>(null);

  totalInvestedUSD = computed(() => {
    const rate = this.dollarRate() || 4000;
    return this.finance.investments().reduce((sum, inv) => {
      const usdVal = inv.currency === 'USD' ? inv.amount : inv.amount / rate;
      return sum + usdVal;
    }, 0);
  });

  totalCurrentValueUSD = computed(() => {
    const rate = this.dollarRate() || 4000;
    return this.finance.investments().reduce((sum, inv) => {
      const usdVal = inv.currency === 'USD' ? inv.currentValue : inv.currentValue / rate;
      return sum + usdVal;
    }, 0);
  });

  get canSubmit(): boolean {
    return !!this.newType && 
      (this.newType !== 'custom' || this.customTypeName.trim() !== '') &&
      (this.newCurrentValue ?? 0) > 0;
  }

  portfolioSummary = computed(() => {
    const byType = this.finance.investmentsByType();
    const total = this.finance.totalCurrentValue();
    const icons: Record<string, string> = { stocks: '📊', fixed_income: '🏦', real_estate: '🏠', other: '💼', custom: '⚡' };
    const colors: Record<string, string> = { stocks: '#6c5ce7', fixed_income: '#00cec9', real_estate: '#e84393', other: '#feca57', custom: '#a29bfe' };
    return INVESTMENT_TYPES.map(t => ({
      type: t.value,
      label: t.label,
      icon: icons[t.value],
      total: byType.get(t.value) || 0,
      pct: total > 0 ? ((byType.get(t.value) || 0) / total) * 100 : 0,
      color: colors[t.value],
    })).filter(t => t.total > 0);
  });

  ngOnInit(): void {
    this.fetchDollarRate();
  }

  async fetchDollarRate(): Promise<void> {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      const rate = data.rates?.COP || null;
      this.dollarRate.set(rate);
      if (rate) {
        this.finance.dollarRate.set(rate);
      }
    } catch {
      // Fallback
      this.dollarRate.set(null);
    }
  }

  addInvestment(): void {
    if (!this.canSubmit) return;
    this.finance.addInvestment({
      name: this.newType === 'custom' ? this.customTypeName.trim() : this.getTypeLabel(this.newType),
      type: this.newType as InvestmentType,
      purchaseDate: this.newDate,
      amount: this.newAmount || 0,
      currentValue: this.newCurrentValue!,
      currency: this.newCurrency,
      description: this.newDescription.trim(),
    });
    this.newType = '';
    this.customTypeName = '';
    this.newDescription = '';
    this.newAmount = null;
    this.newCurrentValue = null;
  }

  getTypeLabel(type: string): string {
    return INVESTMENT_TYPES.find(t => t.value === type)?.label || type;
  }

  getReturn(inv: InvestmentRecord): string {
    if (!inv.amount) return '0';
    return (((inv.currentValue - inv.amount) / inv.amount) * 100).toFixed(1);
  }

  delete(id: string): void {
    this.finance.deleteInvestment(id);
  }

  // — Inline editing —
  editingId: string | null = null;
  editAmount: number | null = null;
  editCurrentValue: number | null = null;
  editDescription = '';

  startEdit(inv: InvestmentRecord): void {
    this.editingId = inv.id;
    this.editAmount = inv.amount;
    this.editCurrentValue = inv.currentValue;
    this.editDescription = inv.description || '';
  }

  saveEdit(id: string): void {
    this.finance.updateInvestment(id, {
      amount: this.editAmount || 0,
      currentValue: this.editCurrentValue || 0,
      description: this.editDescription.trim(),
    });
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editAmount = null;
    this.editCurrentValue = null;
    this.editDescription = '';
  }
}
