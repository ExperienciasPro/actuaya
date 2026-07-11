import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, PercentPipe } from '@angular/common';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';

interface CostItem {
  id: string;
  name: string;
  amount: number;
}

@Component({
  selector: 'um-profitability',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, PercentPipe, CurrencyInputDirective],
  template: `
    <div class="profit-page">

      <!-- ═══ Header ═══ -->
      <header class="page-header">
        <h1>Calculadora de Rentabilidad</h1>
        <p class="header-subtitle">Ingresa tus costos para saber exactamente a qué precio vender y cuál es tu margen real.</p>
      </header>

      <div class="profit-layout">

        <!-- ═══ LEFT: Inputs ═══ -->
        <div class="input-column">

          <!-- Product / Service Name -->
          <div class="section-card">
            <h3>📦 Producto o Servicio</h3>
            <div class="form-field">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="productName" placeholder="Ej: Consultoría de 3 meses" />
            </div>
            <div class="form-field">
              <label>Unidades esperadas a vender (mes)</label>
              <input type="number" [ngModel]="unitsSold()" (ngModelChange)="unitsSold.set($event)" placeholder="1" min="1" />
            </div>
          </div>

          <!-- Fixed Costs -->
          <div class="section-card">
            <div class="section-header">
              <h3>🏢 Costos Fijos</h3>
              <span class="section-hint">Lo que pagas siempre, vendas o no</span>
            </div>

            @for (item of fixedCosts(); track item.id) {
              <div class="cost-row">
                <input type="text" [ngModel]="item.name" (ngModelChange)="item.name = $event; notifyFixed()" placeholder="Nombre del costo" class="cost-name" />
                <div class="cost-amount-wrap">
                  <span class="currency-prefix">$</span>
                  <input umCurrencyInput [ngModel]="item.amount" (ngModelChange)="item.amount = $event; notifyFixed()" placeholder="0" class="cost-amount" />
                </div>
                <button class="btn-remove" (click)="removeFixed(item.id)">✕</button>
              </div>
            }

            <button class="btn-add-cost" (click)="addFixed()">+ Agregar costo fijo</button>

            <div class="cost-subtotal">
              <span>Total Costos Fijos</span>
              <strong>{{ totalFixed() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
            </div>
          </div>

          <!-- Variable Costs -->
          <div class="section-card">
            <div class="section-header">
              <h3>📦 Costos Variables</h3>
              <span class="section-hint">Lo que gastas por cada unidad producida</span>
            </div>

            @for (item of variableCosts(); track item.id) {
              <div class="cost-row">
                <input type="text" [ngModel]="item.name" (ngModelChange)="item.name = $event; notifyVariable()" placeholder="Nombre del costo" class="cost-name" />
                <div class="cost-amount-wrap">
                  <span class="currency-prefix">$</span>
                  <input umCurrencyInput [ngModel]="item.amount" (ngModelChange)="item.amount = $event; notifyVariable()" placeholder="0" class="cost-amount" />
                </div>
                <button class="btn-remove" (click)="removeVariable(item.id)">✕</button>
              </div>
            }

            <button class="btn-add-cost" (click)="addVariable()">+ Agregar costo variable</button>

            <div class="cost-subtotal">
              <span>Total Costo Variable / unidad</span>
              <strong>{{ totalVariable() | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
            </div>
          </div>

          <!-- Desired Margin -->
          <div class="section-card">
            <h3>🎯 Margen Deseado</h3>
            <div class="margin-slider-row">
              <input
                type="range"
                [ngModel]="desiredMargin()"
                (ngModelChange)="desiredMargin.set($event)"
                min="1" max="80" step="1"
                class="margin-slider" />
              <span class="margin-value">{{ desiredMargin() }}%</span>
            </div>
          </div>
        </div>

        <!-- ═══ RIGHT: Results ═══ -->
        <div class="results-column">
          <div class="results-card">
            <h3>📊 Resultados</h3>

            <div class="result-item">
              <span class="result-label">Costo total por unidad</span>
              <span class="result-value">{{ costPerUnit() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
            </div>

            <div class="result-divider"></div>

            <div class="result-item highlight">
              <span class="result-label">💰 Precio de venta sugerido</span>
              <span class="result-value big">{{ suggestedPrice() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
            </div>

            <div class="result-divider"></div>

            <div class="result-item">
              <span class="result-label">Ganancia por unidad</span>
              <span class="result-value positive">{{ profitPerUnit() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
            </div>

            <div class="result-item">
              <span class="result-label">Margen de ganancia</span>
              <span class="result-value">{{ actualMargin() | percent:'1.1-1' }}</span>
            </div>

            <div class="result-divider"></div>

            <div class="result-item">
              <span class="result-label">Punto de equilibrio</span>
              <span class="result-value">{{ breakEvenUnits() }} unidades</span>
            </div>

            <div class="result-item monthly">
              <span class="result-label">📈 Ganancia mensual estimada</span>
              <span class="result-value big positive">{{ monthlyProfit() | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
            </div>
          </div>

          <!-- Price Scenarios -->
          <div class="scenarios-card">
            <h3>🔮 Escenarios de precio</h3>
            <p class="scenarios-hint">Si vendieras a este precio, ¿cuánto ganarías?</p>

            <div class="scenario-table">
              <div class="scenario-header">
                <span>Precio</span>
                <span>Margen</span>
                <span>Ganancia / mes</span>
              </div>
              @for (s of scenarios(); track s.price) {
                <div class="scenario-row" [class.current]="s.isCurrent">
                  <span>{{ s.price | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                  <span [class.positive]="s.margin > 0" [class.negative]="s.margin <= 0">{{ s.margin | percent:'1.0-0' }}</span>
                  <span [class.positive]="s.monthlyProfit > 0" [class.negative]="s.monthlyProfit <= 0">{{ s.monthlyProfit | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: 'profitability.scss',
})
export class ProfitabilityComponent {
  productName = '';
  unitsSold = signal(10);
  desiredMargin = signal(30);

  fixedCosts = signal<CostItem[]>([
    { id: crypto.randomUUID(), name: 'Arriendo', amount: 2000000 },
    { id: crypto.randomUUID(), name: 'Servicios públicos', amount: 400000 },
    { id: crypto.randomUUID(), name: 'Nómina', amount: 5000000 },
  ]);

  variableCosts = signal<CostItem[]>([
    { id: crypto.randomUUID(), name: 'Materiales', amount: 50000 },
    { id: crypto.randomUUID(), name: 'Envío', amount: 15000 },
  ]);

  totalFixed = computed(() =>
    this.fixedCosts().reduce((sum, c) => sum + (c.amount || 0), 0)
  );

  totalVariable = computed(() =>
    this.variableCosts().reduce((sum, c) => sum + (c.amount || 0), 0)
  );

  costPerUnit = computed(() => {
    const units = this.unitsSold() || 1;
    return (this.totalFixed() / units) + this.totalVariable();
  });

  suggestedPrice = computed(() => {
    const margin = this.desiredMargin() / 100;
    const cost = this.costPerUnit();
    return cost / (1 - margin);
  });

  profitPerUnit = computed(() =>
    this.suggestedPrice() - this.costPerUnit()
  );

  actualMargin = computed(() => {
    const price = this.suggestedPrice();
    if (price === 0) return 0;
    return this.profitPerUnit() / price;
  });

  breakEvenUnits = computed(() => {
    const contribution = this.suggestedPrice() - this.totalVariable();
    if (contribution <= 0) return '∞';
    return Math.ceil(this.totalFixed() / contribution).toString();
  });

  monthlyProfit = computed(() =>
    this.profitPerUnit() * (this.unitsSold() || 1)
  );

  scenarios = computed(() => {
    const cost = this.costPerUnit();
    const suggested = this.suggestedPrice();
    const units = this.unitsSold() || 1;
    const percentages = [-20, -10, 0, 10, 20];
    return percentages.map(p => {
      const price = Math.round(suggested * (1 + p / 100));
      const profit = price - cost;
      const margin = price > 0 ? profit / price : 0;
      return {
        price,
        margin,
        monthlyProfit: profit * units,
        isCurrent: p === 0,
      };
    });
  });

  addFixed(): void {
    this.fixedCosts.update(list => [
      ...list,
      { id: crypto.randomUUID(), name: '', amount: 0 },
    ]);
  }

  removeFixed(id: string): void {
    this.fixedCosts.update(list => list.filter(c => c.id !== id));
  }

  addVariable(): void {
    this.variableCosts.update(list => [
      ...list,
      { id: crypto.randomUUID(), name: '', amount: 0 },
    ]);
  }

  removeVariable(id: string): void {
    this.variableCosts.update(list => list.filter(c => c.id !== id));
  }

  notifyFixed(): void {
    this.fixedCosts.update(list => [...list]);
  }

  notifyVariable(): void {
    this.variableCosts.update(list => [...list]);
  }
}
