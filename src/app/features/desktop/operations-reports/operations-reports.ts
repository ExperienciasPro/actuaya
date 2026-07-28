import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { POSService } from '../../../core/services/pos.service';
import { ProductCatalogService } from '../../../core/services/product-catalog.service';
import { InventoryService } from '../../../core/services/inventory.service';

@Component({
  selector: 'um-operations-reports',
  standalone: true,
  imports: [FormsModule, RouterLink],
  styleUrl: './operations-reports.scss',
  template: `
    <div class="reports-page animate-fadeInUp">
      <div class="page-header">
        <h1>📊 Reportes de Operaciones</h1>
        <div class="period-pills">
          <button
            [class.active]="period() === 'today'"
            (click)="period.set('today')">Hoy</button>
          <button
            [class.active]="period() === 'week'"
            (click)="period.set('week')">Semana</button>
          <button
            [class.active]="period() === 'month'"
            (click)="period.set('month')">Mes</button>
        </div>
      </div>

      <div class="kpi-row stagger-1">
        <div class="kpi-card gradient-blue">
          <div class="icon">💰</div>
          <div class="kpi-content">
            <span class="label">Ventas totales</span>
            <span class="value">{{ fmt(periodTotal()) }}</span>
          </div>
        </div>
        <div class="kpi-card gradient-purple">
          <div class="icon">🧾</div>
          <div class="kpi-content">
            <span class="label">Número de ventas</span>
            <span class="value">{{ periodCount() }}</span>
          </div>
        </div>
        <div class="kpi-card gradient-orange">
          <div class="icon">🎯</div>
          <div class="kpi-content">
            <span class="label">Ticket promedio</span>
            <span class="value">{{ fmt(avgTicket()) }}</span>
          </div>
        </div>
        <div class="kpi-card gradient-green">
          <div class="icon">📦</div>
          <div class="kpi-content">
            <span class="label">Valor inventario</span>
            <span class="value">{{ fmt(inventoryValue()) }}</span>
          </div>
        </div>
      </div>

      @if (dailySalesData().length > 0) {
        <div class="chart-section stagger-2">
          <h2>Ventas por día</h2>
          <div class="bar-chart-container">
            <div class="bar-chart">
              @for (day of dailySalesData(); track day.date) {
                <div class="bar-wrapper">
                  <span class="bar-value">{{ fmt(day.total) }}</span>
                  <div class="bar" [style.height.%]="getBarHeight(day.total)"></div>
                  <span class="bar-label">{{ formatDate(day.date) }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <div class="two-col stagger-3">
        <div class="col-card">
          <h2>Top 10 Productos</h2>
          <div class="top-products">
            @for (product of topProducts(); track product.id) {
              <div class="product-row">
                <div class="product-info">
                  <span class="name">{{ product.name }}</span>
                  <span class="amount">{{ fmt(product.revenue) }} · {{ product.qty }} uds</span>
                </div>
                <div class="progress-bg">
                  <div class="progress-bar" [style.width.%]="getProductWidth(product.revenue)"></div>
                </div>
              </div>
            } @empty {
              <p class="empty-state">No hay ventas en este periodo.</p>
            }
          </div>
        </div>

        <div class="col-card">
          <h2>Ventas por método de pago</h2>
          <div class="payment-methods">
            @for (method of paymentMethodsList(); track method.type) {
              <div class="payment-row">
                <div class="payment-icon">
                  @if (method.type === 'efectivo') { 💵 }
                  @else if (method.type === 'tarjeta') { 💳 }
                  @else { 🏦 }
                </div>
                <div class="payment-details">
                  <span class="method-name">{{ getMethodName(method.type) }}</span>
                  <span class="method-count">{{ method.count }} transacciones</span>
                </div>
                <span class="method-total">{{ fmt(method.total) }}</span>
              </div>
            } @empty {
              <p class="empty-state">No hay pagos en este periodo.</p>
            }
          </div>
        </div>
      </div>

      @if (lowStockProducts().length > 0) {
        <div class="stock-alerts stagger-4">
          <h2>⚠️ Alertas de inventario bajo</h2>
          <div class="table-responsive">
            <table class="stock-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Stock actual</th>
                  <th>Mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (item of lowStockProducts(); track item.id) {
                  <tr>
                    <td>{{ item.name }}</td>
                    <td><b>{{ item.currentStock }}</b></td>
                    <td>{{ item.minStock }}</td>
                    <td>
                      <span class="badge" [class.badge-red]="item.currentStock === 0" [class.badge-yellow]="item.currentStock > 0">
                        {{ item.currentStock === 0 ? 'Agotado' : 'Bajo stock' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <div class="sessions-section stagger-5">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h2>Turnos de caja</h2>
          <a routerLink="/d/pos-audit" style="color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 500;">Ver auditoría completa &rarr;</a>
        </div>
        <div class="sessions-grid">
          @for (session of recentSessions(); track session.id) {
            <div class="session-card">
              <div class="session-header">
                <span class="session-id">Turno #{{ session.id.slice(-5) }}</span>
                <span class="badge" [class.badge-green]="session.status === 'closed'">
                  {{ session.status === 'closed' ? 'Cerrado' : 'Abierto' }}
                </span>
              </div>
              <div class="session-body">
                <div class="session-stat">
                  <span class="label">Apertura</span>
                  <span class="value">{{ formatDateTime(session.openedAt) }}</span>
                </div>
                <div class="session-stat">
                  <span class="label">Cierre</span>
                  <span class="value">{{ session.closedAt ? formatDateTime(session.closedAt) : '-' }}</span>
                </div>
                <div class="session-stat">
                  <span class="label">Ventas</span>
                  <span class="value">{{ session.salesCount }} ({{ fmt(session.totalSales) }})</span>
                </div>
                @if (session.difference !== undefined && session.difference !== null) {
                  <div class="session-stat">
                    <span class="label">Diferencia</span>
                    <span class="value diff"
                      [class.text-green]="session.difference >= 0"
                      [class.text-red]="session.difference < 0">
                      {{ session.difference > 0 ? '+' : '' }}{{ fmt(session.difference) }}
                    </span>
                  </div>
                }
              </div>
            </div>
          } @empty {
             <p class="empty-state">No hay turnos en este periodo.</p>
          }
        </div>
      </div>
    </div>
  `
})
export class OperationsReportsComponent {
  pos = inject(POSService);
  productService = inject(ProductCatalogService);
  inventoryService = inject(InventoryService);

  period = signal<'today' | 'week' | 'month'>('today');

  dateRange = computed(() => {
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (this.period() === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (this.period() === 'month') {
      start.setMonth(start.getMonth() - 1);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return { start: startStr, end: endStr, startDate: start, endDate: end };
  });

  periodSales = computed(() => {
    const { start, end } = this.dateRange();
    return this.pos.salesForPeriod(start, end);
  });

  periodTotal = computed(() =>
    this.periodSales().reduce((sum, sale) => sum + sale.total, 0)
  );

  periodCount = computed(() => this.periodSales().length);

  avgTicket = computed(() => {
    const count = this.periodCount();
    return count === 0 ? 0 : this.periodTotal() / count;
  });

  topProducts = computed(() => {
    const { start, end } = this.dateRange();
    return this.pos.topProducts(start, end);
  });

  /** Convert the Record from salesByPaymentMethod to an array for template iteration */
  paymentMethodsList = computed(() => {
    const { start, end } = this.dateRange();
    const record = this.pos.salesByPaymentMethod(start, end);
    return Object.entries(record).map(([type, data]) => ({
      type,
      count: data.count,
      total: data.total,
    }));
  });

  dailySalesData = computed(() => {
    const { start, end } = this.dateRange();
    return this.pos.dailySales(start, end);
  });

  lowStockProducts = computed(() => this.pos.lowStockAlerts());

  inventoryValue = computed(() => this.productService.totalInventoryValue());

  recentSessions = computed(() => {
    const { startDate, endDate } = this.dateRange();
    return this.pos.sessions().filter(s => {
      const d = new Date(s.openedAt);
      return d >= startDate && d <= endDate;
    });
  });

  maxDailySale = computed(() => {
    const data = this.dailySalesData();
    if (!data.length) return 0;
    return Math.max(...data.map(d => d.total));
  });

  maxProductRevenue = computed(() => {
    const products = this.topProducts();
    if (!products.length) return 0;
    return Math.max(...products.map(p => p.revenue));
  });

  fmt(n: number): string {
    if (n === undefined || n === null) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(n);
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }

  formatDateTime(isoStr: string): string {
    const d = new Date(isoStr);
    return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  getBarHeight(amount: number): number {
    const max = this.maxDailySale();
    return max === 0 ? 0 : (amount / max) * 100;
  }

  getProductWidth(revenue: number): number {
    const max = this.maxProductRevenue();
    return max === 0 ? 0 : (revenue / max) * 100;
  }

  getMethodName(type: string): string {
    const map: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      mixto: 'Mixto',
    };
    return map[type] || type;
  }
}
