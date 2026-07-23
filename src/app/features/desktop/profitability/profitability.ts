import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, PercentPipe } from '@angular/common';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';
import { StorageService } from '../../../core/services/storage.service';

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
              <input type="text" [ngModel]="productName()" (ngModelChange)="setProductName($event)" placeholder="Ej: Consultoría de 3 meses" />
            </div>
            <div class="form-field">
              <label>Unidades esperadas a vender (mes)</label>
              <input type="number" [ngModel]="unitsSold()" (ngModelChange)="setUnitsSold($event)" placeholder="1" min="1" />
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
                (ngModelChange)="setDesiredMargin($event)"
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
  private storage = inject(StorageService);

  private readonly FK = 'um_fixed_costs';
  private readonly VK = 'um_variable_costs';
  private readonly PNK = 'um_profit_product_name';
  private readonly USK = 'um_profit_units_sold';
  private readonly DMK = 'um_profit_desired_margin';

  productName = signal<string>(this.storage.get<string>(this.PNK) ?? '');
  unitsSold = signal<number>(this.storage.get<number>(this.USK) ?? 1);
  desiredMargin = signal<number>(this.storage.get<number>(this.DMK) ?? 30);

  fixedCosts = signal<CostItem[]>(this.storage.get<CostItem[]>(this.FK) ?? []);
  variableCosts = signal<CostItem[]>(this.storage.get<CostItem[]>(this.VK) ?? []);

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

  setProductName(value: string): void {
    this.productName.set(value);
    this.storage.set(this.PNK, value);
  }

  setUnitsSold(value: number): void {
    this.unitsSold.set(value);
    this.storage.set(this.USK, value);
  }

  setDesiredMargin(value: number): void {
    this.desiredMargin.set(value);
    this.storage.set(this.DMK, value);
  }

  addFixed(): void {
    this.fixedCosts.update(list => [
      ...list,
      { id: crypto.randomUUID(), name: '', amount: 0 },
    ]);
    this.persistFixed();
  }

  removeFixed(id: string): void {
    this.fixedCosts.update(list => list.filter(c => c.id !== id));
    this.persistFixed();
  }

  addVariable(): void {
    this.variableCosts.update(list => [
      ...list,
      { id: crypto.randomUUID(), name: '', amount: 0 },
    ]);
    this.persistVariable();
  }

  removeVariable(id: string): void {
    this.variableCosts.update(list => list.filter(c => c.id !== id));
    this.persistVariable();
  }

  notifyFixed(): void {
    this.fixedCosts.update(list => [...list]);
    this.persistFixed();
  }

  notifyVariable(): void {
    this.variableCosts.update(list => [...list]);
    this.persistVariable();
  }

  private persistFixed(): void {
    this.storage.set(this.FK, this.fixedCosts());
  }

  private persistVariable(): void {
    this.storage.set(this.VK, this.variableCosts());
  }
}
