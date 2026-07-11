import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CurrencyInputDirective } from '../../../../shared/directives/currency-input.directive';
import {
  FinanceService, COMPANIES, EXPENSE_CATEGORIES, INVESTMENT_TYPES,
  HistoricalYear, InvestmentType,
} from '../../../../core/services/finance.service';
import { StorageService } from '../../../../core/services/storage.service';
import { UserService } from '../../../../core/services/user.service';

type ReportTab = 'income' | 'investments' | 'cashflow' | 'profitability';

@Component({
  selector: 'um-admin-finance-reports',
  standalone: true,
  imports: [FormsModule, DecimalPipe, CurrencyInputDirective],
  template: `
    <div class="admin-page">
      <div class="page-header animate-fadeInUp">
        <h1>📊 Reportes Financieros</h1>
        <p class="subtitle">
          Visualiza los reportes de tus módulos financieros activos.
        </p>
      </div>

      <!-- Dynamic Tabs — only show tabs for active modules -->
      <div class="tabs animate-fadeInUp stagger-1">
        @if (hasIncome()) {
          <button class="tab" [class.active]="activeTab() === 'income'" (click)="activeTab.set('income')">
            💰 Ingresos & Egresos
          </button>
        }
        @if (hasInvestments()) {
          <button class="tab" [class.active]="activeTab() === 'investments'" (click)="activeTab.set('investments')">
            💎 Inversiones
          </button>
        }
        @if (hasCashflow()) {
          <button class="tab" [class.active]="activeTab() === 'cashflow'" (click)="activeTab.set('cashflow')">
            💸 Flujo de Caja
          </button>
        }
        @if (hasProfitability()) {
          <button class="tab" [class.active]="activeTab() === 'profitability'" (click)="activeTab.set('profitability')">
            📐 Rentabilidad
          </button>
        }
      </div>

      <!-- ═══ No modules message ═══ -->
      @if (!hasAnyFinance()) {
        <div class="empty-state animate-fadeInUp stagger-2">
          <span class="empty-icon">📭</span>
          <p>No tienes módulos financieros activos.</p>
          <p class="empty-hint">Activa módulos en Mi Cuenta → Módulos Activos.</p>
        </div>
      }

      <!-- ═══ INCOME TAB (superadmin only) ═══ -->
      @if (activeTab() === 'income' && hasIncome()) {
        <!-- Year Summary Cards -->
        <div class="summary-row animate-fadeInUp stagger-2">
          <div class="summary-card green">
            <span class="sum-label">Total Ingresos</span>
            <span class="sum-value">\${{ finance.totalIncome() | number:'1.0-0' }}</span>
          </div>
          <div class="summary-card red">
            <span class="sum-label">Total Egresos</span>
            <span class="sum-value">\${{ finance.totalExpenses() | number:'1.0-0' }}</span>
          </div>
          <div class="summary-card blue">
            <span class="sum-label">Neto Total</span>
            <span class="sum-value">\${{ finance.totalIncome() - finance.totalExpenses() | number:'1.0-0' }}</span>
          </div>
        </div>

        <!-- Chart View Toggle + Year Nav -->
        <div class="chart-section animate-fadeInUp stagger-2">
          <div class="chart-header">
            <h3>{{ chartView() === 'monthly' ? 'Ingresos Mes a Mes' : 'Ingresos totales Año a Año' }}</h3>
            <div class="chart-controls">
              <div class="view-toggle">
                <button [class.active]="chartView() === 'monthly'" (click)="chartView.set('monthly')">📅 Meses</button>
                <button [class.active]="chartView() === 'yearly'" (click)="chartView.set('yearly')">📊 Años</button>
              </div>
              @if (chartView() === 'monthly') {
                <select class="year-select" [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set($event)">
                  @for (y of availableYears(); track y) {
                    <option [ngValue]="y">{{ y }}</option>
                  }
                </select>
              }
            </div>
          </div>

          @if (chartView() === 'monthly') {
            <!-- Monthly Bar Chart -->
            <div class="month-bars">
              @for (m of monthlyData(); track m.month) {
                <div class="month-col">
                  <div class="month-bar-wrap">
                    <div class="month-bar income" [style.height.%]="m.incomePct"></div>
                    <div class="month-bar expense" [style.height.%]="m.expensePct"></div>
                  </div>
                  <span class="month-label">{{ m.label }}</span>
                  <span class="month-val">\${{ m.income | number:'1.0-0' }}</span>
                </div>
              }
            </div>
          } @else {
            <!-- Yearly Bar Chart -->
            <div class="month-bars">
              @for (y of yearlyChartData(); track y.year) {
                <div class="month-col" [class.current-year]="y.year === currentYear">
                  <div class="month-bar-wrap">
                    <div class="month-bar income" [style.height.%]="y.incomePct"></div>
                    <div class="month-bar expense" [style.height.%]="y.expensePct"></div>
                  </div>
                  <span class="month-label">{{ y.year }}</span>
                  <span class="month-val">\${{ y.income | number:'1.0-0' }}</span>
                </div>
              }
            </div>
          }
          <div class="chart-legend">
            <span class="leg"><span class="leg-dot green"></span> Ingresos</span>
            <span class="leg"><span class="leg-dot red"></span> Egresos</span>
          </div>
        </div>

        <!-- Income by Company -->
        <div class="chart-section animate-fadeInUp stagger-3">
          <div class="chart-header">
            <h3>Ingresos por Empresa</h3>
            <select class="year-select" [ngModel]="companyYear()" (ngModelChange)="companyYear.set($event)">
              <option [ngValue]="0">Todos los años</option>
              @for (y of availableYears(); track y) {
                <option [ngValue]="y">{{ y }}</option>
              }
            </select>
          </div>
          <div class="horizontal-bars">
            @for (c of incomeByCompany(); track c.company) {
              <div class="h-bar-row">
                <span class="h-bar-label">{{ c.company }}</span>
                <div class="h-bar-track">
                  <div class="h-bar-fill" [style.width.%]="c.pct" [style.background]="c.color"></div>
                </div>
                <span class="h-bar-value">\${{ c.amount | number:'1.0-0' }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- ═══ INVESTMENTS TAB ═══ -->
      @if (activeTab() === 'investments' && hasInvestments()) {
        <div class="summary-row animate-fadeInUp stagger-2">
          <div class="summary-card blue">
            <span class="sum-label">Total Invertido</span>
            <span class="sum-value">\${{ finance.totalInvested() | number:'1.0-0' }}</span>
          </div>
          <div class="summary-card green">
            <span class="sum-label">Valor Actual</span>
            <span class="sum-value">\${{ finance.totalCurrentValue() | number:'1.0-0' }}</span>
          </div>
          <div class="summary-card" [class.green]="totalReturn() >= 0" [class.red]="totalReturn() < 0">
            <span class="sum-label">Retorno Total</span>
            <span class="sum-value">{{ totalReturn() | number:'1.1-1' }}%</span>
          </div>
        </div>

        <!-- Portfolio Allocation -->
        <div class="chart-section animate-fadeInUp stagger-2">
          <h3>Distribución del Portafolio</h3>
          <div class="horizontal-bars">
            @for (t of investmentAllocation(); track t.type) {
              <div class="h-bar-row">
                <span class="h-bar-label">{{ t.icon }} {{ t.label }}</span>
                <div class="h-bar-track">
                  <div class="h-bar-fill" [style.width.%]="t.pct" [style.background]="t.color"></div>
                </div>
                <span class="h-bar-value">{{ t.pct | number:'1.1-1' }}% — \${{ t.total | number:'1.0-0' }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Investment Details -->
        <div class="chart-section animate-fadeInUp stagger-3">
          <h3>Detalle de Inversiones</h3>
          @if (finance.investments().length) {
            <div class="inv-cards">
              @for (inv of finance.investments(); track inv.id) {
                <div class="inv-detail-card">
                  <div class="inv-top">
                    <span class="inv-name">{{ inv.name }}</span>
                    <span class="inv-curr">{{ inv.currency }}</span>
                  </div>
                  <div class="inv-amounts">
                    <div class="inv-col">
                      <span class="inv-small">Invertido</span>
                      <span class="inv-num">\${{ inv.amount | number:'1.0-0' }}</span>
                    </div>
                    <div class="inv-col">
                      <span class="inv-small">Actual</span>
                      <span class="inv-num">\${{ inv.currentValue | number:'1.0-0' }}</span>
                    </div>
                    <div class="inv-col">
                      <span class="inv-small">Retorno</span>
                      <span class="inv-num" [class.positive]="inv.currentValue >= inv.amount" [class.negative]="inv.currentValue < inv.amount">
                        {{ getReturn(inv) }}%
                      </span>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="empty-small">Registra inversiones en el módulo de Inversiones.</p>
          }
        </div>
      }

      <!-- ═══ CASHFLOW TAB ═══ -->
      @if (activeTab() === 'cashflow' && hasCashflow()) {
        <div class="summary-row animate-fadeInUp stagger-2">
          <div class="summary-card green">
            <span class="sum-label">Ingresos del Mes</span>
            <span class="sum-value">\${{ cashflowMonthIncome() | number:'1.0-0' }}</span>
          </div>
          <div class="summary-card red">
            <span class="sum-label">Egresos del Mes</span>
            <span class="sum-value">\${{ cashflowMonthExpense() | number:'1.0-0' }}</span>
          </div>
          <div class="summary-card" [class.green]="cashflowBalance() >= 0" [class.red]="cashflowBalance() < 0">
            <span class="sum-label">Balance</span>
            <span class="sum-value">\${{ cashflowBalance() | number:'1.0-0' }}</span>
          </div>
        </div>

        <div class="chart-section animate-fadeInUp stagger-2">
          <h3>Resumen de Flujo de Caja</h3>
          <p class="section-desc">
            Aquí ves el consolidado de tu flujo de caja mensual.
            Para registrar movimientos, usa el módulo <strong>Flujo de Caja</strong> en el menú lateral.
          </p>
          <!-- Monthly Cashflow bars -->
          <div class="month-bars">
            @for (m of cashflowMonthly(); track m.month) {
              <div class="month-col">
                <div class="month-bar-wrap">
                  <div class="month-bar income" [style.height.%]="m.inPct"></div>
                  <div class="month-bar expense" [style.height.%]="m.outPct"></div>
                </div>
                <span class="month-label">{{ m.label }}</span>
              </div>
            }
          </div>
          <div class="chart-legend">
            <span class="leg"><span class="leg-dot green"></span> Entradas</span>
            <span class="leg"><span class="leg-dot red"></span> Salidas</span>
          </div>
        </div>
      }

      <!-- ═══ PROFITABILITY TAB ═══ -->
      @if (activeTab() === 'profitability' && hasProfitability()) {
        <div class="chart-section animate-fadeInUp stagger-2">
          <h3>Resumen de Rentabilidad</h3>
          <p class="section-desc">
            Aquí puedes consultar el análisis consolidado de rentabilidad.
            Usa el módulo <strong>Calculadora de Rentabilidad</strong> en el menú lateral para hacer simulaciones.
          </p>
          <div class="summary-row">
            <div class="summary-card green">
              <span class="sum-label">Margen Objetivo</span>
              <span class="sum-value">—</span>
            </div>
            <div class="summary-card blue">
              <span class="sum-label">Punto de Equilibrio</span>
              <span class="sum-value">—</span>
            </div>
          </div>
          <p class="empty-small" style="margin-top: 16px;">
            Realiza una simulación en la Calculadora de Rentabilidad para ver datos aquí.
          </p>
        </div>
      }
    </div>
  `,
  styleUrl: 'finance-reports.scss',
})
export class AdminFinanceReportsComponent implements OnInit {
  finance = inject(FinanceService);
  private storage = inject(StorageService);
  private userService = inject(UserService);

  expenseCategories = EXPENSE_CATEGORIES;
  currentYear = new Date().getFullYear();
  selectedYear = signal(this.currentYear);
  chartView = signal<'monthly' | 'yearly'>('monthly');
  companyYear = signal(0); // 0 = all years

  activeTab = signal<ReportTab>('income');

  // — Module awareness —
  private enabledModules = signal<string[]>([]);

  /** Income tab only visible for superadmin */
  hasIncome = computed(() => this.userService.isSuperAdmin());
  /** Investments visible if 'investments' module is enabled */
  hasInvestments = computed(() => this.enabledModules().includes('investments'));
  /** Cashflow visible if 'cashflow' module is enabled */
  hasCashflow = computed(() => this.enabledModules().includes('cashflow'));
  /** Profitability visible if 'profitability' module is enabled */
  hasProfitability = computed(() => this.enabledModules().includes('profitability'));
  /** Any finance module at all */
  hasAnyFinance = computed(() =>
    this.hasIncome() || this.hasInvestments() || this.hasCashflow() || this.hasProfitability()
  );

  ngOnInit(): void {
    // Load enabled modules
    const saved = this.storage.get<string[]>('um_enabled_modules');
    if (saved) {
      this.enabledModules.set(saved);
    } else {
      // If no modules saved, assume all active
      this.enabledModules.set(['cashflow', 'investments', 'profitability', 'finance']);
    }
    // Set default tab based on what's available
    if (this.hasIncome()) {
      this.activeTab.set('income');
    } else if (this.hasInvestments()) {
      this.activeTab.set('investments');
    } else if (this.hasCashflow()) {
      this.activeTab.set('cashflow');
    } else if (this.hasProfitability()) {
      this.activeTab.set('profitability');
    }
  }

  // Expense form
  expConcept = '';
  expCategory = '';
  expDate = new Date().toISOString().substring(0, 10);
  expAmount: number | null = null;

  // — Income computeds —
  currentYearIncome = computed(() =>
    this.finance.incomes()
      .filter(i => i.date.startsWith(String(this.currentYear)))
      .reduce((s, i) => s + i.amount, 0)
  );

  currentYearExpenses = computed(() =>
    this.finance.expenses()
      .filter(e => e.date.startsWith(String(this.currentYear)))
      .reduce((s, e) => s + e.amount, 0)
  );

  /** Income/Expenses for the selected year (navigable) */
  selectedYearIncome = computed(() =>
    this.finance.incomes()
      .filter(i => i.date.startsWith(String(this.selectedYear())))
      .reduce((s, i) => s + i.amount, 0)
  );

  selectedYearExpenses = computed(() =>
    this.finance.expenses()
      .filter(e => e.date.startsWith(String(this.selectedYear())))
      .reduce((s, e) => s + e.amount, 0)
  );

  monthlyData = computed(() => {
    const year = this.selectedYear();
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const incomes = this.finance.incomes().filter(i => i.date.startsWith(String(year)));
    const expenses = this.finance.expenses().filter(e => e.date.startsWith(String(year)));

    const data = months.map((label, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const income = incomes.filter(inc => inc.date.substring(5, 7) === mm).reduce((s, inc) => s + inc.amount, 0);
      const expense = expenses.filter(exp => exp.date.substring(5, 7) === mm).reduce((s, exp) => s + exp.amount, 0);
      return { month: i, label, income, expense };
    });

    const maxVal = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
    return data.map(d => ({
      ...d,
      incomePct: (d.income / maxVal) * 100,
      expensePct: (d.expense / maxVal) * 100,
    }));
  });

  /** Yearly bar chart data — all years with data */
  yearlyChartData = computed(() => {
    const allIncomes = this.finance.incomes();
    const allExpenses = this.finance.expenses();
    const historical = this.finance.historicalYears();

    // Collect all years
    const yearsSet = new Set<number>();
    allIncomes.forEach(i => yearsSet.add(parseInt(i.date.substring(0, 4), 10)));
    allExpenses.forEach(e => yearsSet.add(parseInt(e.date.substring(0, 4), 10)));
    historical.forEach(h => yearsSet.add(h.year));
    if (yearsSet.size === 0) yearsSet.add(this.currentYear);

    const years = Array.from(yearsSet).sort();

    const data = years.map(year => {
      const yStr = String(year);
      const hist = historical.find(h => h.year === year);
      const income = hist
        ? hist.grossIncome
        : allIncomes.filter(i => i.date.startsWith(yStr)).reduce((s, i) => s + i.amount, 0);
      const expense = hist
        ? hist.grossExpenses
        : allExpenses.filter(e => e.date.startsWith(yStr)).reduce((s, e) => s + e.amount, 0);
      return { year, income, expense };
    });

    const maxVal = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
    return data.map(d => ({
      ...d,
      incomePct: (d.income / maxVal) * 100,
      expensePct: (d.expense / maxVal) * 100,
    }));
  });

  prevYear(): void {
    this.selectedYear.update(y => y - 1);
  }

  nextYear(): void {
    if (this.selectedYear() < this.currentYear) {
      this.selectedYear.update(y => y + 1);
    }
  }

  incomeByCompany = computed(() => {
    const year = this.companyYear();
    const incomes = year === 0
      ? this.finance.incomes()
      : this.finance.incomes().filter(i => i.date.startsWith(String(year)));

    const map = new Map<string, number>();
    for (const inc of incomes) {
      map.set(inc.company, (map.get(inc.company) || 0) + inc.amount);
    }
    const total = incomes.reduce((s, i) => s + i.amount, 0) || 1;
    const colors = ['#6c5ce7', '#e84393', '#00cec9', '#74b9ff', '#feca57', '#a29bfe'];
    return COMPANIES.map((company, i) => ({
      company,
      amount: map.get(company) || 0,
      pct: ((map.get(company) || 0) / total) * 100,
      color: colors[i % colors.length],
    })).sort((a, b) => b.amount - a.amount);
  });

  // Years that actually have income data
  availableYears = computed(() => {
    const years = new Set<number>();
    for (const inc of this.finance.incomes()) {
      years.add(Number(inc.date.substring(0, 4)));
    }
    // Also include historical years
    for (const h of this.finance.historicalYears()) {
      if (h.grossIncome > 0) years.add(h.year);
    }
    return [...years].sort((a, b) => a - b);
  });

  prevCompanyYear(): void {
    const current = this.companyYear();
    if (current === 0) return;
    const years = this.availableYears();
    const idx = years.indexOf(current);
    if (idx <= 0) {
      this.companyYear.set(0); // go to 'Todos'
    } else {
      this.companyYear.set(years[idx - 1]);
    }
  }

  nextCompanyYear(): void {
    const current = this.companyYear();
    const years = this.availableYears();
    if (years.length === 0) return;
    if (current === 0) {
      this.companyYear.set(years[0]); // first year with data
    } else {
      const idx = years.indexOf(current);
      if (idx < years.length - 1) {
        this.companyYear.set(years[idx + 1]);
      }
    }
  }

  yearComparison = computed(() => {
    const historical = this.finance.historicalYears().map(y => ({
      year: y.year, income: y.grossIncome, expenses: y.grossExpenses,
    }));
    const current = {
      year: this.currentYear,
      income: this.currentYearIncome(),
      expenses: this.currentYearExpenses(),
    };
    return [...historical, current].sort((a, b) => a.year - b.year);
  });

  // — Investment computeds —
  totalReturn = computed(() => {
    const invested = this.finance.totalInvested();
    if (!invested) return 0;
    return ((this.finance.totalCurrentValue() - invested) / invested) * 100;
  });

  investmentAllocation = computed(() => {
    const byType = this.finance.investmentsByType();
    const total = this.finance.totalCurrentValue() || 1;
    const icons: Record<string, string> = { stocks: '📊', fixed_income: '🏦', real_estate: '🏠', other: '💼', custom: '🎯' };
    const colors: Record<string, string> = { stocks: '#6c5ce7', fixed_income: '#00cec9', real_estate: '#e84393', other: '#feca57', custom: '#fd79a8' };
    const customColors = ['#fd79a8', '#a29bfe', '#55efc4', '#fab1a0', '#74b9ff', '#ffeaa7'];

    // Standard types
    const result = INVESTMENT_TYPES.filter(t => t.value !== 'custom').map(t => ({
      type: t.value,
      label: t.label,
      icon: icons[t.value] || '💼',
      total: byType.get(t.value) || 0,
      pct: ((byType.get(t.value) || 0) / total) * 100,
      color: colors[t.value] || '#feca57',
    })).filter(t => t.total > 0);

    // Custom types — group all custom investments by their name
    const customInvs = this.finance.investments().filter(i => i.type === 'custom');
    const customByName = new Map<string, number>();
    for (const inv of customInvs) {
      customByName.set(inv.name, (customByName.get(inv.name) || 0) + inv.currentValue);
    }
    let ci = 0;
    for (const [name, val] of customByName) {
      result.push({
        type: 'custom_' + name,
        label: name,
        icon: '🎯',
        total: val,
        pct: (val / total) * 100,
        color: customColors[ci % customColors.length],
      });
      ci++;
    }

    return result;
  });

  // — Cashflow computeds —
  cashflowMonthIncome = computed(() => {
    const entries = this.storage.get<any[]>('um_cashflow') || [];
    const month = new Date().toISOString().substring(0, 7);
    return entries
      .filter((e: any) => e.type === 'income' && e.date?.startsWith(month))
      .reduce((s: number, e: any) => s + (e.amount || 0), 0);
  });

  cashflowMonthExpense = computed(() => {
    const entries = this.storage.get<any[]>('um_cashflow') || [];
    const month = new Date().toISOString().substring(0, 7);
    return entries
      .filter((e: any) => e.type === 'expense' && e.date?.startsWith(month))
      .reduce((s: number, e: any) => s + (e.amount || 0), 0);
  });

  cashflowBalance = computed(() => this.cashflowMonthIncome() - this.cashflowMonthExpense());

  cashflowMonthly = computed(() => {
    const entries = this.storage.get<any[]>('um_cashflow') || [];
    const year = String(this.currentYear);
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    const data = months.map((label, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const prefix = `${year}-${mm}`;
      const inSum = entries.filter((e: any) => e.type === 'income' && e.date?.startsWith(prefix)).reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const outSum = entries.filter((e: any) => e.type === 'expense' && e.date?.startsWith(prefix)).reduce((s: number, e: any) => s + (e.amount || 0), 0);
      return { month: i, label, inSum, outSum };
    });

    const maxVal = Math.max(1, ...data.map(d => Math.max(d.inSum, d.outSum)));
    return data.map(d => ({
      ...d,
      inPct: (d.inSum / maxVal) * 100,
      outPct: (d.outSum / maxVal) * 100,
    }));
  });

  getReturn(inv: { amount: number; currentValue: number }): string {
    if (!inv.amount) return '0';
    return (((inv.currentValue - inv.amount) / inv.amount) * 100).toFixed(1);
  }

  addExpense(): void {
    if (!this.expConcept.trim() || !this.expCategory || !(this.expAmount ?? 0)) return;
    this.finance.addExpense({
      concept: this.expConcept.trim(),
      category: this.expCategory,
      date: this.expDate,
      amount: this.expAmount!,
    });
    this.expConcept = '';
    this.expCategory = '';
    this.expAmount = null;
  }

  deleteExpense(id: string): void {
    this.finance.deleteExpense(id);
  }
}
