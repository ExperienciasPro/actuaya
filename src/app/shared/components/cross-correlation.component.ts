import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CorrelationDataset {
  id: string;
  label: string;
  values: number[];         // Valores numéricos para correlación
  color?: string;
  dates?: string[];         // Si es serie temporal
}

export interface CorrelationResult {
  datasetA: string;
  datasetB: string;
  pearsonR: number;         // -1 a +1
  strength: 'fuerte' | 'moderada' | 'débil' | 'nula';
  direction: 'positiva' | 'negativa' | 'ninguna';
  narrative: string;        // Texto explicativo autogenerado
}

// ─── Componente ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-cross-correlation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Empty State -->
    <div class="cc-empty" *ngIf="!datasets || datasets.length < 2">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>Se necesitan al menos 2 conjuntos de datos para analizar correlaciones</p>
    </div>

    <div class="cc-container" *ngIf="datasets && datasets.length >= 2">
      <!-- Selector de datasets -->
      <div class="cc-selectors">
        <div class="cc-select-group">
          <label class="cc-label">Instrumento A</label>
          <select class="cc-select" [(ngModel)]="selectedA" (ngModelChange)="onSelectionChange()">
            <option *ngFor="let ds of datasets" [value]="ds.id">{{ ds.label }}</option>
          </select>
        </div>
        <div class="cc-vs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
        <div class="cc-select-group">
          <label class="cc-label">Instrumento B</label>
          <select class="cc-select" [(ngModel)]="selectedB" (ngModelChange)="onSelectionChange()">
            <option *ngFor="let ds of datasets" [value]="ds.id">{{ ds.label }}</option>
          </select>
        </div>
      </div>

      <!-- Resultado de correlación -->
      <div class="cc-result-card" *ngIf="result">
        <div class="cc-gauge">
          <div class="cc-gauge-ring" [style.--gauge-color]="getGaugeColor()">
            <span class="cc-gauge-value">{{ result.pearsonR >= 0 ? '+' : '' }}{{ (result.pearsonR * 100).toFixed(0) }}%</span>
          </div>
          <div class="cc-gauge-meta">
            <span class="cc-strength" [class]="'cc-str-' + result.strength">
              {{ result.strength | titlecase }}
            </span>
            <span class="cc-direction">
              {{ result.direction === 'positiva' ? '↗' : result.direction === 'negativa' ? '↘' : '→' }}
              {{ result.direction }}
            </span>
          </div>
        </div>

        <!-- Narrative -->
        <div class="cc-narrative">
          <p>{{ result.narrative }}</p>
        </div>
      </div>

      <!-- Scatter Plot -->
      <div class="cc-chart-area">
        <canvas #scatterCanvas></canvas>
      </div>

      <!-- Legend / Info -->
      <div class="cc-footer" *ngIf="result">
        <span class="cc-info">
          r = {{ result.pearsonR.toFixed(3) }} |
          {{ getDatasetA()?.values?.length || 0 }} puntos de datos
        </span>
        <span class="cc-info-help" title="Coeficiente de Pearson: mide la relación lineal entre dos variables (-1 a +1)">
          ℹ️ ¿Qué es esto?
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .cc-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafbfc;
    }
    .cc-empty svg { width: 36px; height: 36px; color: #cbd5e1; margin-bottom: 12px; }
    .cc-empty p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; max-width: 300px; }

    .cc-container { width: 100%; }

    /* ── Selectors ── */
    .cc-selectors {
      display: flex; align-items: flex-end; gap: 12px;
      margin-bottom: 20px;
    }
    .cc-select-group { flex: 1; }
    .cc-label {
      display: block; font-size: 11px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .cc-select {
      width: 100%; padding: 10px 14px; border-radius: 10px;
      border: 1px solid #e2e8f0; background: #fff;
      font-size: 13px; font-weight: 600; color: #1e293b;
      font-family: inherit; cursor: pointer;
      transition: border-color 0.2s ease;
      appearance: none; -webkit-appearance: none;
    }
    .cc-select:focus { outline: none; border-color: #6366f1; }
    .cc-vs {
      flex-shrink: 0; padding-bottom: 8px;
    }
    .cc-vs svg { width: 20px; height: 20px; color: #cbd5e1; }

    /* ── Result Card ── */
    .cc-result-card {
      display: flex; align-items: center; gap: 24px;
      padding: 20px 24px; margin-bottom: 16px;
      background: #fff; border-radius: 14px;
      border: 1px solid #e8ecf1;
      box-shadow: 0 1px 4px rgba(0,0,0,0.03);
    }

    .cc-gauge { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }

    .cc-gauge-ring {
      width: 72px; height: 72px; border-radius: 50%;
      border: 4px solid var(--gauge-color, #6366f1);
      display: flex; align-items: center; justify-content: center;
      background: rgba(99,102,241,0.03);
    }
    .cc-gauge-value {
      font-size: 18px; font-weight: 800; color: #1e293b;
    }

    .cc-gauge-meta { display: flex; flex-direction: column; gap: 4px; }
    .cc-strength {
      font-size: 13px; font-weight: 700; padding: 3px 10px;
      border-radius: 20px; display: inline-block;
    }
    .cc-str-fuerte { color: #059669; background: rgba(5,150,105,0.08); }
    .cc-str-moderada { color: #f59e0b; background: rgba(245,158,11,0.08); }
    .cc-str-débil { color: #94a3b8; background: rgba(148,163,184,0.06); }
    .cc-str-nula { color: #dc2626; background: rgba(220,38,38,0.06); }

    .cc-direction { font-size: 11px; color: #64748b; font-weight: 600; }

    .cc-narrative {
      flex: 1; min-width: 0;
    }
    .cc-narrative p {
      margin: 0; font-size: 13px; color: #475569;
      line-height: 1.6; font-weight: 500;
    }

    /* ── Chart ── */
    .cc-chart-area {
      width: 100%; height: 300px;
      background: #fff; border-radius: 14px;
      border: 1px solid #e8ecf1; padding: 16px;
      margin-bottom: 10px;
    }
    .cc-chart-area canvas { width: 100% !important; height: 100% !important; }

    /* ── Footer ── */
    .cc-footer {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 11px; color: #94a3b8; font-weight: 500;
    }
    .cc-info-help {
      cursor: help; font-size: 11px;
    }

    @media (max-width: 768px) {
      .cc-selectors { flex-direction: column; gap: 8px; }
      .cc-vs { display: none; }
      .cc-result-card { flex-direction: column; gap: 16px; text-align: center; }
      .cc-gauge { justify-content: center; }
      .cc-chart-area { height: 240px; }
    }
  `]
})
export class CrossCorrelationComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() datasets: CorrelationDataset[] = [];

  @Output() correlationCalculated = new EventEmitter<CorrelationResult>();

  @ViewChild('scatterCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  selectedA: string = '';
  selectedB: string = '';
  result: CorrelationResult | null = null;
  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    if (this.datasets.length >= 2) {
      this.selectedA = this.datasets[0].id;
      this.selectedB = this.datasets[1].id;
      setTimeout(() => this.calculate(), 0);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['datasets'] && this.datasets.length >= 2) {
      if (!this.selectedA) this.selectedA = this.datasets[0].id;
      if (!this.selectedB) this.selectedB = this.datasets[1].id;
      setTimeout(() => this.calculate(), 0);
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  onSelectionChange(): void {
    this.calculate();
  }

  getDatasetA(): CorrelationDataset | undefined {
    return this.datasets.find(d => d.id === this.selectedA);
  }

  getGaugeColor(): string {
    if (!this.result) return '#94a3b8';
    const abs = Math.abs(this.result.pearsonR);
    if (abs > 0.7) return '#059669';
    if (abs > 0.4) return '#f59e0b';
    if (abs > 0.2) return '#94a3b8';
    return '#dc2626';
  }

  // ── Pearson Correlation ──

  private calculate(): void {
    const dsA = this.datasets.find(d => d.id === this.selectedA);
    const dsB = this.datasets.find(d => d.id === this.selectedB);

    if (!dsA || !dsB || dsA.values.length === 0 || dsB.values.length === 0) {
      this.result = null;
      return;
    }

    // Emparejar valores (usar el mínimo de ambos)
    const n = Math.min(dsA.values.length, dsB.values.length);
    const xVals = dsA.values.slice(0, n);
    const yVals = dsB.values.slice(0, n);

    const r = this.pearson(xVals, yVals);

    // Clasificar
    const abs = Math.abs(r);
    let strength: CorrelationResult['strength'];
    if (abs >= 0.7) strength = 'fuerte';
    else if (abs >= 0.4) strength = 'moderada';
    else if (abs >= 0.2) strength = 'débil';
    else strength = 'nula';

    let direction: CorrelationResult['direction'];
    if (r > 0.1) direction = 'positiva';
    else if (r < -0.1) direction = 'negativa';
    else direction = 'ninguna';

    // Generar narrativa
    const narrative = this.generateNarrative(dsA.label, dsB.label, r, strength, direction);

    this.result = {
      datasetA: dsA.label,
      datasetB: dsB.label,
      pearsonR: r,
      strength,
      direction,
      narrative
    };

    this.correlationCalculated.emit(this.result);
    this.renderScatterChart(xVals, yVals, dsA, dsB, r);
  }

  private pearson(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  private generateNarrative(
    labelA: string, labelB: string,
    r: number, strength: string, direction: string
  ): string {
    const pct = Math.abs(r * 100).toFixed(0);

    if (strength === 'nula') {
      return `No se encontró una relación lineal significativa entre "${labelA}" y "${labelB}" (r=${r.toFixed(2)}). Los resultados en un instrumento no predicen los del otro.`;
    }

    if (direction === 'positiva') {
      return `Existe una correlación ${strength} positiva (${pct}%) entre "${labelA}" y "${labelB}". Los candidatos que obtienen mejores resultados en uno tienden a obtener mejores resultados en el otro.`;
    }

    return `Existe una correlación ${strength} negativa (${pct}%) entre "${labelA}" y "${labelB}". Los candidatos que obtienen mejores resultados en uno tienden a obtener resultados más bajos en el otro.`;
  }

  // ── Chart ──

  private renderScatterChart(
    xVals: number[], yVals: number[],
    dsA: CorrelationDataset, dsB: CorrelationDataset,
    r: number
  ): void {
    if (!this.canvasRef) return;

    this.chart?.destroy();

    const scatterData = xVals.map((x, i) => ({ x, y: yVals[i] }));

    // Línea de tendencia
    const trendLine = this.computeTrendLine(xVals, yVals);

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Datos',
            data: scatterData,
            backgroundColor: dsA.color || 'rgba(99,102,241,0.5)',
            borderColor: dsA.color || '#6366f1',
            borderWidth: 1,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: `Tendencia (r=${r.toFixed(2)})`,
            data: trendLine,
            type: 'line' as any,
            borderColor: 'rgba(239,68,68,0.6)',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 11, weight: 'bold' as any }, usePointStyle: true }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => `${dsA.label}: ${ctx.parsed.x} | ${dsB.label}: ${ctx.parsed.y}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: dsA.label, font: { size: 11, weight: 'bold' as any } },
            grid: { color: 'rgba(0,0,0,0.04)' }
          },
          y: {
            title: { display: true, text: dsB.label, font: { size: 11, weight: 'bold' as any } },
            grid: { color: 'rgba(0,0,0,0.04)' }
          }
        }
      }
    });
  }

  private computeTrendLine(x: number[], y: number[]): { x: number; y: number }[] {
    const n = x.length;
    if (n < 2) return [];

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...x);
    const maxX = Math.max(...x);

    return [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept }
    ];
  }
}
