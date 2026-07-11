import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { SalesService } from '../../../../core/services/sales.service';
import { RadarService } from '../../../../core/services/radar.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { StorageService } from '../../../../core/services/storage.service';
import { ProductDataService } from '../../../../core/services/product.service';

interface ChartCard {
  id: string;
  title: string;
  desc: string;
  module: string;
}

@Component({
  selector: 'um-sales-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="analytics-page">
      <div class="page-header">
        <div class="header-left">
          <h2>📊 Analítica Comercial</h2>
          <p class="subtitle">Resumen en tiempo real de tus módulos de ventas activos</p>
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
          <p>Activa al menos un módulo comercial (Radar, Embudos de Venta o Catálogo) para ver tus analíticas.</p>
        </div>
      } @else {
        <!-- KPI Summary Cards -->
        <div class="kpi-row">
          @if (isActive('sales')) {
            <div class="kpi-card kpi-purple">
              <span class="kpi-icon">🤝</span>
              <div class="kpi-content">
                <span class="kpi-value">{{ totalDeals() }}</span>
                <span class="kpi-label">Oportunidades</span>
              </div>
            </div>
            <div class="kpi-card kpi-green">
              <span class="kpi-icon">🏆</span>
              <div class="kpi-content">
                <span class="kpi-value">\${{ formatNumber(totalWonRevenue()) }}</span>
                <span class="kpi-label">Ingresos ganados</span>
              </div>
            </div>
            <div class="kpi-card kpi-blue">
              <span class="kpi-icon">📈</span>
              <div class="kpi-content">
                <span class="kpi-value">{{ conversionRate() }}%</span>
                <span class="kpi-label">Tasa de conversión</span>
              </div>
            </div>
          }
          @if (isActive('radar')) {
            <div class="kpi-card kpi-orange">
              <span class="kpi-icon">📡</span>
              <div class="kpi-content">
                <span class="kpi-value">{{ totalContacts() }}</span>
                <span class="kpi-label">Prospectos en Radar</span>
              </div>
            </div>
          }
          @if (isActive('catalog')) {
            <div class="kpi-card kpi-teal">
              <span class="kpi-icon">🏷️</span>
              <div class="kpi-content">
                <span class="kpi-value">{{ totalProducts() }}</span>
                <span class="kpi-label">Productos activos</span>
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
            <div class="chart-card" [class.edit-mode]="editMode()"
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
                  @case ('deal-status') {
                    <canvas baseChart [data]="dealStatusChartData()" [options]="doughnutOptions" type="doughnut"></canvas>
                  }
                  @case ('pipeline-value') {
                    <canvas baseChart [data]="pipelineValueChartData()" [options]="barOptions" type="bar"></canvas>
                  }
                  @case ('product-performance') {
                    <canvas baseChart [data]="productPerformanceChartData()" [options]="horizontalBarOptions" type="bar"></canvas>
                  }
                  @case ('radar-status') {
                    <canvas baseChart [data]="radarStatusChartData()" [options]="doughnutOptions" type="doughnut"></canvas>
                  }
                  @case ('radar-tags') {
                    <canvas baseChart [data]="radarTagChartData()" [options]="horizontalBarOptions" type="bar"></canvas>
                  }
                  @case ('catalog-category') {
                    <canvas baseChart [data]="catalogCategoryChartData()" [options]="doughnutOptions" type="doughnut"></canvas>
                  }
                  @case ('quotes') {
                    <canvas baseChart [data]="quotesChartData()" [options]="barOptions" type="bar"></canvas>
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
    .btn-edit {
      padding: 8px 18px; border-radius: 10px; border: 1.5px solid #cbd5e1;
      background: #fff; font-size: 0.88rem; cursor: pointer; font-weight: 600;
      transition: all 0.2s;
    }
    .btn-edit:hover { border-color: #6c5ce7; color: #6c5ce7; }
    .btn-edit.active { background: #6c5ce7; color: #fff; border-color: #6c5ce7; }
    .btn-restore {
      padding: 8px 16px; border-radius: 10px; border: 1.5px solid #00b894;
      background: #e6fcf5; color: #0d7a46; font-size: 0.85rem; cursor: pointer; font-weight: 600;
      transition: all 0.2s;
    }
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
    .kpi-purple { background: linear-gradient(135deg, #f0ecff, #e8e0ff); color: #5b3cc4; }
    .kpi-green { background: linear-gradient(135deg, #e6faf0, #d0f4e0); color: #0d7a46; }
    .kpi-blue { background: linear-gradient(135deg, #e8f4ff, #d5ebff); color: #1864ab; }
    .kpi-orange { background: linear-gradient(135deg, #fff4e6, #ffe8cc); color: #c2410c; }
    .kpi-teal { background: linear-gradient(135deg, #e6fcf5, #c3fae8); color: #0c8599; }

    /* Hidden panel */
    .hidden-panel { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; padding: 14px 18px; background: #fef3c7; border: 1px solid var(--accent); border-radius: 12px; }
    .hidden-label { font-size: 0.85rem; font-weight: 600; color: #92400e; }
    .restore-chip { padding: 5px 14px; border-radius: 20px; border: 1.5px dashed var(--accent); background: #fff; color: #92400e; font-size: 0.8rem; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .restore-chip:hover { background: var(--accent); color: #fff; border-style: solid; }

    /* Charts Grid */
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 24px; }
    .chart-card { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; position: relative; transition: all 0.25s; }
    .chart-card.edit-mode { border: 2px dashed #a29bfe; cursor: grab; }
    .chart-card.edit-mode:active { cursor: grabbing; opacity: 0.7; }
    .chart-card h3 { font-size: 1.1rem; font-weight: 700; margin: 0 0 4px; }
    .chart-desc { font-size: 0.82rem; color: #94a3b8; margin: 0 0 20px; }
    .chart-wrapper { position: relative; height: 280px; display: flex; align-items: center; justify-content: center; }
    .chart-wrapper-bar { height: 300px; }
    canvas { max-width: 100%; max-height: 100%; }

    /* Card toolbar */
    .card-toolbar { position: absolute; top: 10px; right: 10px; display: flex; gap: 4px; z-index: 2; }
    .card-move, .card-hide {
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e2e8f0;
      background: #fff; cursor: pointer; display: flex; align-items: center;
      justify-content: center; font-size: 12px; transition: all 0.15s;
    }
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
export class SalesAnalyticsComponent {
  private salesService = inject(SalesService);
  private radarService = inject(RadarService);
  private catalogService = inject(CatalogService);
  private storage = inject(StorageService);
  private productService = inject(ProductDataService);

  private readonly PREFS_KEY = 'um_sales_analytics_prefs';

  editMode = signal(false);
  dragIdx = signal(-1);

  private enabledModules = computed(() => {
    const saved = this.storage.get<string[]>('um_enabled_modules');
    return saved ? new Set(saved) : null;
  });

  isActive(moduleId: string): boolean {
    const enabled = this.enabledModules();
    return enabled ? enabled.has(moduleId) : true;
  }

  hasAnyModule = computed(() =>
    this.isActive('sales') || this.isActive('radar') || this.isActive('catalog')
  );

  // ─── All chart definitions ───
  private readonly ALL_CHARTS: ChartCard[] = [
    { id: 'deal-status', title: 'Estado de Oportunidades', desc: 'Distribución actual de tus deals comerciales', module: 'sales' },
    { id: 'pipeline-value', title: 'Valor del Pipeline', desc: 'Valor acumulado por etapa del embudo', module: 'sales' },
    { id: 'product-performance', title: 'Rendimiento por Producto', desc: 'Ingresos ganados por producto', module: 'sales' },
    { id: 'radar-status', title: 'Prospectos por Estado', desc: 'Distribución de tu red de contactos comerciales', module: 'radar' },
    { id: 'radar-tags', title: 'Prospectos por Etiqueta', desc: 'Tipos de relación con tus contactos', module: 'radar' },
    { id: 'catalog-category', title: 'Productos por Categoría', desc: 'Distribución de tu catálogo', module: 'catalog' },
    { id: 'quotes', title: 'Cotizaciones Recientes', desc: 'Valor total de las últimas cotizaciones generadas', module: 'catalog' },
  ];

  // ─── Preferences (hidden + order) ───
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
    this.storage.set(this.PREFS_KEY, {
      hidden: Array.from(this.hiddenCards()),
      order: this.cardOrder(),
    });
  }

  // ─── Visible / Hidden cards ───
  visibleCards = computed(() => {
    const active = this.ALL_CHARTS.filter(c => this.isActive(c.module) && !this.hiddenCards().has(c.id));
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
    this.ALL_CHARTS.filter(c => this.isActive(c.module) && this.hiddenCards().has(c.id))
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

  // ─── Drag & Drop ───
  onDragStart(index: number): void { this.dragIdx.set(index); }
  onDragOver(e: DragEvent, index: number): void { e.preventDefault(); }
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
    return ['pipeline-value', 'radar-tags', 'quotes', 'product-performance'].includes(id);
  }

  // ─── KPI computed ───
  totalDeals = computed(() => this.salesService.deals().length);
  totalWonRevenue = computed(() => this.salesService.totalWonRevenue());
  conversionRate = computed(() => {
    const total = this.salesService.deals().length;
    if (!total) return 0;
    return Math.round((this.salesService.wonDeals().length / total) * 100);
  });
  totalContacts = computed(() => this.radarService.totalContacts());
  totalProducts = computed(() => this.catalogService.activeItems().length);

  private readonly COLORS = ['#6c5ce7','#00cec9','#e17055','#0984e3','#fdcb6e','#e84393','#00b894','#d63031','#a29bfe','#55efc4'];

  // ─── Chart Data ───
  dealStatusChartData = computed<ChartData<'doughnut'>>(() => ({
    labels: ['Abiertas', 'Ganadas', 'Perdidas'],
    datasets: [{ data: [this.salesService.openDeals().length, this.salesService.wonDeals().length, this.salesService.lostDeals().length], backgroundColor: ['#6c5ce7','#00b894','#d63031'], borderWidth: 0, hoverOffset: 8 }],
  }));

  pipelineValueChartData = computed<ChartData<'bar'>>(() => {
    const funnels = this.salesService.funnels();
    return {
      labels: funnels.map(f => f.name),
      datasets: [{ label: 'Valor abierto ($)', data: funnels.map(f => this.salesService.getByFunnel(f.id).filter(d => d.status === 'open').reduce((s, d) => s + (d.value || 0), 0)), backgroundColor: this.COLORS.slice(0, funnels.length), borderRadius: 8, borderSkipped: false }],
    };
  });

  productPerformanceChartData = computed<ChartData<'bar'>>(() => {
    const products = this.productService.products();
    const wonDeals = this.salesService.wonDeals();
    const productValues = new Map<string, number>();

    // Map deals to their products based on funnel
    const funnelProductMap = new Map<string, string>();
    for (const f of this.salesService.funnels()) {
      if (f.productId) funnelProductMap.set(f.id, f.productId);
    }

    for (const deal of wonDeals) {
      const pId = deal.productId || funnelProductMap.get(deal.funnelId) || 'general';
      productValues.set(pId, (productValues.get(pId) || 0) + (deal.value || 0));
    }

    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];

    for (const [pId, val] of productValues.entries()) {
      if (val === 0) continue;
      if (pId === 'general') {
        labels.push('General (Sin Producto)');
        data.push(val);
        colors.push('#94a3b8');
      } else {
        const prod = products.find(p => p.id === pId);
        if (prod) {
          labels.push(prod.name);
          data.push(val);
          colors.push(prod.color);
        }
      }
    }

    return {
      labels,
      datasets: [{ label: 'Ingresos Ganados ($)', data, backgroundColor: colors.length ? colors : this.COLORS, borderRadius: 8, borderSkipped: false }],
    };
  });

  radarStatusChartData = computed<ChartData<'doughnut'>>(() => ({
    labels: ['En Radar', 'Contactados', 'Pospuestos', 'Promovidos'],
    datasets: [{ data: [this.radarService.radarContacts().length, this.radarService.contactedContacts().length, this.radarService.snoozedContacts().length, this.radarService.promotedContacts().length], backgroundColor: ['#0984e3','#00b894','#fdcb6e','#6c5ce7'], borderWidth: 0, hoverOffset: 8 }],
  }));

  radarTagChartData = computed<ChartData<'bar'>>(() => {
    const contacts = this.radarService.contacts();
    const tagLabels: Record<string,string> = { potential_client: 'Cliente Potencial', strategic_ally: 'Aliado Estratégico', referral: 'Referido', warm_lead: 'Lead Caliente', dormant: 'Dormido' };
    const tagMap = new Map<string, number>();
    for (const c of contacts) { const l = tagLabels[c.relationshipTag] || c.relationshipTag || 'Sin etiqueta'; tagMap.set(l, (tagMap.get(l) || 0) + 1); }
    const labels = Array.from(tagMap.keys());
    return { labels, datasets: [{ label: 'Contactos', data: Array.from(tagMap.values()), backgroundColor: this.COLORS.slice(0, labels.length), borderRadius: 6, borderSkipped: false }] };
  });

  catalogCategoryChartData = computed<ChartData<'doughnut'>>(() => {
    const catMap = new Map<string, number>();
    for (const item of this.catalogService.items()) { const c = item.category || 'Sin categoría'; catMap.set(c, (catMap.get(c) || 0) + 1); }
    return { labels: Array.from(catMap.keys()), datasets: [{ data: Array.from(catMap.values()), backgroundColor: this.COLORS.slice(0, catMap.size), borderWidth: 0, hoverOffset: 8 }] };
  });

  quotesChartData = computed<ChartData<'bar'>>(() => {
    const quotes = this.catalogService.quotes().slice(0, 10);
    return { labels: quotes.map(q => q.clientName || 'Sin nombre'), datasets: [{ label: 'Valor cotizado ($)', data: quotes.map(q => this.catalogService.getQuoteTotal(q)), backgroundColor: '#00cec9', borderRadius: 8, borderSkipped: false }] };
  });

  // ─── Chart Options ───
  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 12, font: { size: 12 } } }, tooltip: { backgroundColor: 'rgba(30,41,59,0.92)', cornerRadius: 8, padding: 12, titleFont: { size: 13, weight: 'bold' }, bodyFont: { size: 12 } } } };
  barOptions: ChartConfiguration<'bar'>['options'] = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(30,41,59,0.92)', cornerRadius: 8, padding: 12 } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } }, beginAtZero: true } } };
  horizontalBarOptions: ChartConfiguration<'bar'>['options'] = { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(30,41,59,0.92)', cornerRadius: 8, padding: 12 } }, scales: { x: { grid: { color: '#f1f5f9' }, beginAtZero: true, ticks: { font: { size: 11 } } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } };

  formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toLocaleString('es-CO');
  }
}
