import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FinanceService, HistoricalYear } from '../../../core/services/finance.service';
import { StorageService } from '../../../core/services/storage.service';
import { UserService } from '../../../core/services/user.service';

interface ChartCard {
  id: string;
  title: string;
  desc: string;
  module: string;
}

@Component({
  selector: 'um-finance-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="analytics-page">
      <div class="page-header">
        <div class="header-left">
          <h2>📊 Analítica Finanzas</h2>
          <p class="subtitle">Visión financiera consolidada de tu negocio</p>
        </div>
        @if (hasAnyModule()) {
          <div class="header-actions">
            <button class="btn-edit" (click)="editMode.set(!editMode())"
              [class.active]="editMode()">
              {{ editMode() ? '✓ Listo' : '⚙️ Personalizar' }}
            </button>
            @if (editMode() && hiddenCards().size > 0) {
              <button class="btn-restore" (click)="restoreAll()">↩ Restaurar todo</button>
            }
          </div>
        }
      </div>

      @if (!hasAnyModule()) {
        <div class="empty-state">
          <span class="empty-icon">📊</span>
          <p>Activa al menos un módulo financiero (Ingresos, Flujo de Caja o Rentabilidad) para ver tus analíticas.</p>
        </div>
      } @else {
        <!-- KPI Summary Cards -->
        <div class="kpi-row">
          @if (isActive('income')) {
            <div class="kpi-card kpi-green">
              <span class="kpi-icon">💰</span>
              <div class="kpi-content">
                <span class="kpi-value">\${{ formatNumber(totalIncome()) }}</span>
                <span class="kpi-label">Ingresos totales</span>
              </div>
            </div>
            <div class="kpi-card kpi-blue">
              <span class="kpi-icon">🧾</span>
              <div class="kpi-content">
                <span class="kpi-value">{{ totalIncomeRecords() }}</span>
                <span class="kpi-label">Registros</span>
              </div>
            </div>
          }
          @if (isActive('cashflow')) {
            <div class="kpi-card kpi-red">
              <span class="kpi-icon">💸</span>
              <div class="kpi-content">
                <span class="kpi-value">\${{ formatNumber(totalExpenses()) }}</span>
                <span class="kpi-label">Gastos totales</span>
              </div>
            </div>
          }
          @if (isActive('profitability')) {
            <div class="kpi-card" [class]="netIncome() >= 0 ? 'kpi-teal' : 'kpi-red'">
              <span class="kpi-icon">📐</span>
              <div class="kpi-content">
                <span class="kpi-value">{{ profitMargin() }}%</span>
                <span class="kpi-label">Margen neto</span>
              </div>
            </div>
          }
        </div>

        <!-- Restore hidden cards panel -->
        @if (editMode() && hiddenCards().size > 0) {
          <div class="hidden-panel">
            <span class="hidden-label">Gráficas ocultas:</span>
            @for (card of hiddenCardsList(); track card.id) {
              <button class="restore-chip" (click)="toggleCard(card.id)">
                + {{ card.title }}
              </button>
            }
          </div>
        }

        <!-- Charts Grid -->
        <div class="charts-grid">
          @for (card of visibleCards(); track card.id; let i = $index) {
            <div class="chart-card" [class.edit-mode]="editMode()" [class.wide-card]="card.id === 'cashflow'"
                 [attr.draggable]="editMode() ? 'true' : null"
                 (dragstart)="onDragStart(i)"
                 (dragover)="onDragOver($event, i)"
                 (drop)="onDrop(i)"
                 (dragend)="dragIdx.set(-1)">
              @if (editMode()) {
                <div class="card-toolbar">
                  <button class="card-move" (click)="moveCard(i, -1)" [disabled]="i === 0" title="Subir">▲</button>
                  <button class="card-move" (click)="moveCard(i, 1)" [disabled]="i === visibleCards().length - 1" title="Bajar">▼</button>
                  <button class="card-hide" (click)="toggleCard(card.id)" title="Ocultar gráfica">✕</button>
                </div>
              }
              <h3>{{ card.title }}</h3>
              <p class="chart-desc">{{ card.desc }}</p>
              <div class="chart-wrapper" [class.chart-wrapper-bar]="isBarChart(card.id)">
                @switch (card.id) {
                  @case ('income-monthly') {
                    <canvas baseChart [data]="incomeByMonthChartData()" [options]="lineOptions" type="line"></canvas>
                  }
                  @case ('investments') {
                    <canvas baseChart [data]="investmentsChartData()" [options]="doughnutOptions" type="doughnut"></canvas>
                  }
                  @case ('income-company') {
                    <canvas baseChart [data]="incomeByCompanyChartData()" [options]="doughnutOptions" type="doughnut"></canvas>
                  }
                  @case ('cashflow') {
                    <canvas baseChart [data]="cashflowChartData()" [options]="barGroupedOptions" type="bar"></canvas>
                  }
                  @case ('profitability') {
                    <canvas baseChart [data]="profitabilityChartData()" [options]="doughnutOptions" type="doughnut"></canvas>
                  }
                  @case ('historical') {
                    <canvas baseChart [data]="historicalChartData()" [options]="barOptions" type="bar"></canvas>
                  }
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .analytics-page { padding: 28px 32px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 12px; }
    .header-left h2 { font-size: 1.6rem; font-weight: 700; margin: 0 0 6px; }
    .subtitle { color: #64748b; font-size: 0.95rem; margin: 0; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .btn-edit { padding: 8px 18px; border-radius: 10px; border: 1.5px solid #cbd5e1; background: #fff; font-size: 0.88rem; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .btn-edit:hover { border-color: #6c5ce7; color: #6c5ce7; }
    .btn-edit.active { background: #6c5ce7; color: #fff; border-color: #6c5ce7; }
    .btn-restore { padding: 8px 16px; border-radius: 10px; border: 1.5px solid #00b894; background: #e6fcf5; color: #0d7a46; font-size: 0.85rem; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .btn-restore:hover { background: #00b894; color: #fff; }

    .empty-state { text-align: center; padding: 64px 24px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; margin-top: 24px; }
    .empty-icon { font-size: 56px; display: block; margin-bottom: 16px; opacity: 0.4; }
    .empty-state p { color: #64748b; font-size: 1.1rem; max-width: 420px; margin: 0 auto; }

    .kpi-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
    .kpi-card { flex: 1; min-width: 180px; padding: 20px; border-radius: 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: transform 0.2s; cursor: default; }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-icon { font-size: 32px; }
    .kpi-content { display: flex; flex-direction: column; }
    .kpi-value { font-size: 1.5rem; font-weight: 800; line-height: 1.2; }
    .kpi-label { font-size: 0.8rem; opacity: 0.75; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-green { background: linear-gradient(135deg, #e6faf0, #d0f4e0); color: #0d7a46; }
    .kpi-blue { background: linear-gradient(135deg, #e8f4ff, #d5ebff); color: #1864ab; }
    .kpi-red { background: linear-gradient(135deg, #fff0f0, #ffe0e0); color: #c0392b; }
    .kpi-teal { background: linear-gradient(135deg, #e6fcf5, #c3fae8); color: #0c8599; }

    .hidden-panel { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; padding: 14px 18px; background: #fef3c7; border: 1px solid var(--accent); border-radius: 12px; }
    .hidden-label { font-size: 0.85rem; font-weight: 600; color: #92400e; }
    .restore-chip { padding: 5px 14px; border-radius: 20px; border: 1.5px dashed var(--accent); background: #fff; color: #92400e; font-size: 0.8rem; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .restore-chip:hover { background: var(--accent); color: #fff; border-style: solid; }

    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 24px; }
    .wide-card { grid-column: 1 / -1; }
    .chart-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; position: relative; transition: all 0.25s; }
    .chart-card.edit-mode { border: 2px dashed #a29bfe; cursor: grab; }
    .chart-card.edit-mode:active { cursor: grabbing; opacity: 0.7; }
    .chart-card h3 { font-size: 1.1rem; font-weight: 700; margin: 0 0 4px; }
    .chart-desc { font-size: 0.82rem; color: #94a3b8; margin: 0 0 20px; }
    .chart-wrapper { position: relative; height: 280px; display: flex; align-items: center; justify-content: center; }
    .chart-wrapper-bar { height: 300px; }
    canvas { max-width: 100%; max-height: 100%; }

    .card-toolbar { position: absolute; top: 10px; right: 10px; display: flex; gap: 4px; z-index: 2; }
    .card-move, .card-hide { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; transition: all 0.15s; }
    .card-move:hover { background: #f0ecff; border-color: #6c5ce7; }
    .card-move:disabled { opacity: 0.3; cursor: default; }
    .card-hide { color: #d63031; }
    .card-hide:hover { background: #ffe0e0; border-color: #d63031; }

    @media (max-width: 900px) {
      .analytics-page { padding: 20px 16px; }
      .charts-grid { grid-template-columns: 1fr; }
      .kpi-card { min-width: 140px; }
    }
  `]
})
export class FinanceAnalyticsComponent {
  private financeService = inject(FinanceService);
  private storage = inject(StorageService);
  private userService = inject(UserService);

  private readonly PREFS_KEY = 'um_finance_analytics_prefs';

  editMode = signal(false);
  dragIdx = signal(-1);

  private enabledModules = computed(() => {
    const saved = this.storage.get<string[]>('um_enabled_modules');
    return saved ? new Set(saved) : null;
  });

  isActive(moduleId: string): boolean {
    if (moduleId === 'investments') {
      if (!this.userService.isSuperAdmin()) return false;
    }
    const enabled = this.enabledModules();
    return enabled ? enabled.has(moduleId) : true;
  }

  hasAnyModule = computed(() =>
    this.isActive('income') || this.isActive('cashflow') || this.isActive('profitability')
  );

  allCharts = computed<ChartCard[]>(() => [
    this.userService.isSuperAdmin()
      ? { id: 'investments', title: 'Inversiones por Tipo', desc: 'Distribución de tu portafolio de inversiones', module: 'investments' }
      : { id: 'income-monthly', title: 'Ingresos Mensuales', desc: 'Evolución de tus ingresos registrados mes a mes', module: 'income' },
    { id: 'income-company', title: 'Ingresos por Empresa', desc: 'Distribución de ingresos entre tus unidades de negocio', module: 'income' },
    { id: 'cashflow', title: 'Flujo de Caja: Ingresos vs Gastos', desc: 'Comparación mensual entre entradas y salidas', module: 'cashflow' },
    { id: 'profitability', title: 'Rentabilidad', desc: 'Proporción entre utilidad neta y gastos operativos', module: 'profitability' },
    { id: 'historical', title: 'Histórico Anual', desc: 'Evolución de ingresos brutos por año fiscal', module: 'profitability' },
  ]);

  hiddenCards = signal<Set<string>>(new Set());
  cardOrder = signal<string[]>([]);

  constructor() {
    const prefs = this.storage.get<{ hidden: string[]; order: string[] }>(this.PREFS_KEY);
    if (prefs) {
      this.hiddenCards.set(new Set(prefs.hidden || []));
      this.cardOrder.set(prefs.order || []);
    }
  }

  private savePrefs(): void {
    this.storage.set(this.PREFS_KEY, { hidden: Array.from(this.hiddenCards()), order: this.cardOrder() });
  }

  visibleCards = computed(() => {
    const active = this.allCharts().filter(c => this.isActive(c.module) && !this.hiddenCards().has(c.id));
    const order = this.cardOrder();
    if (order.length) {
      active.sort((a, b) => {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }
    return active;
  });

  hiddenCardsList = computed(() =>
    this.allCharts().filter(c => this.isActive(c.module) && this.hiddenCards().has(c.id))
  );

  toggleCard(id: string): void {
    const s = new Set(this.hiddenCards());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.hiddenCards.set(s);
    this.savePrefs();
  }

  restoreAll(): void {
    this.hiddenCards.set(new Set());
    this.cardOrder.set([]);
    this.savePrefs();
  }

  moveCard(index: number, direction: number): void {
    const cards = [...this.visibleCards()];
    const target = index + direction;
    if (target < 0 || target >= cards.length) return;
    [cards[index], cards[target]] = [cards[target], cards[index]];
    this.cardOrder.set(cards.map(c => c.id));
    this.savePrefs();
  }

  onDragStart(index: number): void { this.dragIdx.set(index); }
  onDragOver(e: DragEvent, _i: number): void { e.preventDefault(); }
  onDrop(targetIndex: number): void {
    const srcIdx = this.dragIdx();
    if (srcIdx === -1 || srcIdx === targetIndex) return;
    const cards = [...this.visibleCards()];
    const [moved] = cards.splice(srcIdx, 1);
    cards.splice(targetIndex, 0, moved);
    this.cardOrder.set(cards.map(c => c.id));
    this.savePrefs();
    this.dragIdx.set(-1);
  }

  isBarChart(id: string): boolean {
    return ['cashflow', 'historical', 'income-monthly'].includes(id);
  }

  // ─── KPI ───
  totalIncome = this.financeService.totalIncome;
  totalExpenses = this.financeService.totalExpenses;
  netIncome = this.financeService.netIncome;
  totalIncomeRecords = computed(() => this.financeService.incomes().length);
  profitMargin = computed(() => {
    const income = this.totalIncome();
    if (!income) return 0;
    return Math.round((this.netIncome() / income) * 100);
  });

  private readonly COLORS = ['#6c5ce7','#00cec9','#e17055','#0984e3','#fdcb6e','#e84393','#00b894','#d63031','#a29bfe','#55efc4'];

  // ─── Chart Data ───
  investmentsChartData = computed<ChartData<'doughnut'>>(() => {
    const map = this.financeService.investmentsByType();
    const typeLabels: Record<string, string> = {
      'stocks': 'Renta Variable',
      'fixed_income': 'Renta Fija',
      'real_estate': 'Finca Raíz',
      'other': 'Otros',
      'custom': 'Personalizada'
    };
    return {
      labels: Array.from(map.keys()).map(k => typeLabels[k] || k),
      datasets: [{
        data: Array.from(map.values()),
        backgroundColor: this.COLORS.slice(0, map.size),
        borderWidth: 0,
        hoverOffset: 8
      }]
    };
  });

  incomeByMonthChartData = computed<ChartData<'line'>>(() => {
    const monthMap = this.financeService.incomeByMonth();
    const sortedKeys = Array.from(monthMap.keys()).sort();
    const mNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const labels = sortedKeys.map(k => { const [y, m] = k.split('-'); return `${mNames[parseInt(m) - 1]} ${y.slice(2)}`; });
    return { labels, datasets: [{ label: 'Ingresos ($)', data: sortedKeys.map(k => monthMap.get(k) || 0), borderColor: '#00b894', backgroundColor: 'rgba(0,184,148,0.12)', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#00b894', pointBorderColor: '#fff', pointBorderWidth: 2, pointHoverRadius: 8 }] };
  });

  incomeByCompanyChartData = computed<ChartData<'doughnut'>>(() => {
    const map = this.financeService.incomeByCompany();
    return { labels: Array.from(map.keys()), datasets: [{ data: Array.from(map.values()), backgroundColor: this.COLORS.slice(0, map.size), borderWidth: 0, hoverOffset: 8 }] };
  });

  cashflowChartData = computed<ChartData<'bar'>>(() => {
    const incomeMap = this.financeService.incomeByMonth();
    const expMap = new Map<string, number>();
    for (const exp of this.financeService.expenses()) { const k = exp.date.substring(0, 7); expMap.set(k, (expMap.get(k) || 0) + exp.amount); }
    const allMonths = Array.from(new Set([...incomeMap.keys(), ...expMap.keys()])).sort();
    const mNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const labels = allMonths.map(k => { const [y, m] = k.split('-'); return `${mNames[parseInt(m) - 1]} ${y.slice(2)}`; });
    return { labels, datasets: [{ label: 'Ingresos', data: allMonths.map(k => incomeMap.get(k) || 0), backgroundColor: '#00b894', borderRadius: 6, borderSkipped: false as const }, { label: 'Gastos', data: allMonths.map(k => expMap.get(k) || 0), backgroundColor: '#d63031', borderRadius: 6, borderSkipped: false as const }] };
  });

  profitabilityChartData = computed<ChartData<'doughnut'>>(() => {
    const profit = Math.max(0, this.totalIncome() - this.totalExpenses());
    return { labels: ['Utilidad Neta', 'Gastos'], datasets: [{ data: [profit, this.totalExpenses()], backgroundColor: ['#00b894', '#e17055'], borderWidth: 0, hoverOffset: 8 }] };
  });

  historicalChartData = computed<ChartData<'bar'>>(() => {
    const years = this.financeService.historicalYears();
    return { labels: years.map((y: HistoricalYear) => String(y.year)), datasets: [{ label: 'Ingreso Bruto ($)', data: years.map((y: HistoricalYear) => y.grossIncome), backgroundColor: this.COLORS.slice(0, years.length), borderRadius: 8, borderSkipped: false as const }] };
  });

  // ─── Chart Options ───
  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 12, font: { size: 12 } } }, tooltip: { backgroundColor: 'rgba(30,41,59,0.92)', cornerRadius: 8, padding: 12, titleFont: { size: 13, weight: 'bold' }, bodyFont: { size: 12 } } } };
  lineOptions: ChartConfiguration<'line'>['options'] = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(30,41,59,0.92)', cornerRadius: 8, padding: 12 } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } }, beginAtZero: true } } };
  barOptions: ChartConfiguration<'bar'>['options'] = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(30,41,59,0.92)', cornerRadius: 8, padding: 12 } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } }, beginAtZero: true } } };
  barGroupedOptions: ChartConfiguration<'bar'>['options'] = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyleWidth: 12, font: { size: 12 }, padding: 16 } }, tooltip: { backgroundColor: 'rgba(30,41,59,0.92)', cornerRadius: 8, padding: 12 } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } }, beginAtZero: true } } };

  formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toLocaleString('es-CO');
  }
}
