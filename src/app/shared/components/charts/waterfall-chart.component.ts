import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    OnDestroy,
    SimpleChanges,
    ElementRef,
    ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface WaterfallStep {
    label: string;
    delta: number;                               // Valor del cambio (+/-)
    tipo: 'incremento' | 'decremento' | 'total'; // total = columna de cierre/resumen
    color?: string;                              // Override de color
}

export interface WaterfallClickEvent {
    stepIndex: number;
    label: string;
    delta: number;
    tipo: string;
    runningTotal: number;
}

// ─── Colores ─────────────────────────────────────────────────────────────────

const COLORS = {
    incremento: { bg: 'rgba(34,197,94,0.75)', border: '#16a34a' },
    decremento: { bg: 'rgba(239,68,68,0.75)', border: '#dc2626' },
    total: { bg: 'rgba(99,102,241,0.85)', border: '#6366f1' },
    connector: 'rgba(148,163,184,0.35)'
};

@Component({
    selector: 'app-waterfall-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Empty State -->
    <div class="wf-empty" *ngIf="!steps || steps.length === 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path>
      </svg>
      <p>Sin pasos para visualizar</p>
    </div>

    <div class="wf-wrapper" *ngIf="steps && steps.length > 0">
      <!-- Legend -->
      <div class="wf-legend">
        <div class="wf-legend-item">
          <span class="wf-legend-dot" [style.background]="COLORS.incremento.bg"></span>
          <span>Incremento</span>
        </div>
        <div class="wf-legend-item">
          <span class="wf-legend-dot" [style.background]="COLORS.decremento.bg"></span>
          <span>Decremento</span>
        </div>
        <div class="wf-legend-item">
          <span class="wf-legend-dot" [style.background]="COLORS.total.bg"></span>
          <span>Total</span>
        </div>
      </div>

      <!-- Canvas -->
      <div class="wf-canvas-container" [style.height]="height">
        <canvas #waterfallCanvas></canvas>
      </div>

      <!-- Summary -->
      <div class="wf-summary" *ngIf="showSummary">
        <div class="wf-stat">
          <span class="wf-stat-label">Valor inicial</span>
          <strong class="wf-stat-value">{{ startValue }}</strong>
        </div>
        <div class="wf-stat">
          <span class="wf-stat-label">Cambio neto</span>
          <strong class="wf-stat-value" [style.color]="netChange >= 0 ? '#16a34a' : '#dc2626'">
            {{ netChange >= 0 ? '+' : '' }}{{ netChange }}
          </strong>
        </div>
        <div class="wf-stat">
          <span class="wf-stat-label">Valor final</span>
          <strong class="wf-stat-value" style="color: #6366f1;">{{ finalValue }}</strong>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; }

    .wf-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafbfc;
    }
    .wf-empty svg { width: 40px; height: 40px; color: #cbd5e1; margin-bottom: 12px; }
    .wf-empty p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; }

    .wf-wrapper { width: 100%; }

    .wf-legend {
      display: flex; gap: 16px; margin-bottom: 14px; justify-content: center;
    }
    .wf-legend-item {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; color: #475569;
    }
    .wf-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

    .wf-canvas-container {
      position: relative; width: 100%;
      display: flex; justify-content: center; align-items: center;
    }
    canvas { width: 100% !important; height: 100% !important; }

    .wf-summary {
      display: flex; justify-content: center; gap: 28px;
      margin-top: 16px; padding: 14px 20px;
      background: rgba(241,245,249,0.5); border-radius: 12px;
    }
    .wf-stat {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .wf-stat-label { font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .wf-stat-value { font-size: 18px; font-weight: 800; color: #1e293b; }
  `]
})
export class WaterfallChartComponent implements OnChanges, OnDestroy {

    // ── Inputs ──
    @Input() steps: WaterfallStep[] = [];
    @Input() startValue: number = 0;
    @Input() height: string = '360px';
    @Input() showSummary: boolean = true;
    @Input() showConnectors: boolean = true;
    @Input() horizontal: boolean = false;
    @Input() animationDuration: number = 800;
    @Input() barBorderRadius: number = 4;
    @Input() valuePrefix: string = '';
    @Input() valueSuffix: string = '';

    // ── Outputs ──
    @Output() stepClicked = new EventEmitter<WaterfallClickEvent>();

    @ViewChild('waterfallCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

    COLORS = COLORS;
    netChange = 0;
    finalValue = 0;

    private chart: Chart | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['steps'] || changes['startValue'] || changes['horizontal']) {
            this.calculateTotals();
            setTimeout(() => this.renderChart(), 0);
        }
    }

    ngOnDestroy(): void {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    private calculateTotals(): void {
        if (!this.steps) return;
        let running = this.startValue;
        this.steps.forEach(s => {
            if (s.tipo !== 'total') running += s.delta;
        });
        this.finalValue = running;
        this.netChange = this.finalValue - this.startValue;
    }

    private renderChart(): void {
        if (!this.canvasRef || !this.steps || this.steps.length === 0) return;

        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        const labels: string[] = [];
        const floatingData: [number, number][] = [];
        const bgColors: string[] = [];
        const borderColors: string[] = [];
        const runningTotals: number[] = [];

        let running = this.startValue;

        this.steps.forEach((step, i) => {
            labels.push(step.label);

            if (step.tipo === 'total') {
                // Total bar goes from 0 to the running total
                floatingData.push([0, running]);
                bgColors.push(step.color || COLORS.total.bg);
                borderColors.push(step.color || COLORS.total.border);
            } else if (step.tipo === 'incremento' || step.delta >= 0) {
                const start = running;
                running += step.delta;
                floatingData.push([start, running]);
                bgColors.push(step.color || COLORS.incremento.bg);
                borderColors.push(step.color || COLORS.incremento.border);
            } else {
                // decremento
                const start = running;
                running += step.delta; // delta is negative
                floatingData.push([running, start]); // lower to upper
                bgColors.push(step.color || COLORS.decremento.bg);
                borderColors.push(step.color || COLORS.decremento.border);
            }

            runningTotals.push(running);
        });

        // Connector lines (using a line dataset)
        const connectorData: (number | null)[] = [];
        if (this.showConnectors) {
            // We'll draw connectors as a separate step overlay
        }

        const self = this;

        // Custom plugin for connector lines
        const connectorPlugin = {
            id: 'waterfallConnectors',
            afterDatasetsDraw(chart: Chart) {
                if (!self.showConnectors) return;
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                if (!meta || !meta.data) return;

                ctx.save();
                ctx.strokeStyle = COLORS.connector;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 3]);

                for (let i = 0; i < meta.data.length - 1; i++) {
                    const current = meta.data[i] as any;
                    const next = meta.data[i + 1] as any;

                    if (!current || !next) continue;

                    // Get the top of current bar (running total position)
                    const currentVal = floatingData[i][1]; // top value
                    const nextStep = self.steps[i + 1];

                    // Y position of the running total
                    const yScale = chart.scales['y'];
                    if (!yScale) continue;

                    const y = yScale.getPixelForValue(currentVal);
                    const x1 = current.x + (current.width ? current.width / 2 : 0);
                    const x2 = next.x - (next.width ? next.width / 2 : 0);

                    ctx.beginPath();
                    ctx.moveTo(x1 + (current.width ? current.width / 2 : 8), y);
                    ctx.lineTo(x2 - (next.width ? next.width / 2 : 8), y);
                    ctx.stroke();
                }

                ctx.restore();
            }
        };

        this.chart = new Chart(this.canvasRef.nativeElement, {
            type: 'bar' as ChartType,
            data: {
                labels,
                datasets: [{
                    data: floatingData,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    borderRadius: this.barBorderRadius,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: this.horizontal ? 'y' : 'x',
                animation: {
                    duration: this.animationDuration,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.92)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: { top: 10, bottom: 10, left: 14, right: 14 },
                        titleFont: { size: 13, weight: 'bold' as const },
                        bodyFont: { size: 12 },
                        displayColors: false,
                        callbacks: {
                            title: (items: any[]) => {
                                return items[0]?.label || '';
                            },
                            label: (ctx: any) => {
                                const idx = ctx.dataIndex;
                                const step = self.steps[idx];
                                const [low, high] = ctx.raw as [number, number];
                                const delta = step.delta;
                                const prefix = self.valuePrefix;
                                const suffix = self.valueSuffix;

                                if (step.tipo === 'total') {
                                    return `Total: ${prefix}${high}${suffix}`;
                                }

                                const sign = delta >= 0 ? '+' : '';
                                const lines = [
                                    `Cambio: ${sign}${prefix}${delta}${suffix}`,
                                    `Acumulado: ${prefix}${runningTotals[idx]}${suffix}`
                                ];
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#334155',
                            font: { size: 11, weight: '600' as any },
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(226,232,240,0.5)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 11 },
                            callback: (value: any) => `${self.valuePrefix}${value}${self.valueSuffix}`
                        },
                        beginAtZero: true
                    }
                },
                onClick: (_event: any, elements: any[]) => {
                    if (elements.length > 0) {
                        const idx = elements[0].index;
                        const step = self.steps[idx];
                        self.stepClicked.emit({
                            stepIndex: idx,
                            label: step.label,
                            delta: step.delta,
                            tipo: step.tipo,
                            runningTotal: runningTotals[idx]
                        });
                    }
                }
            },
            plugins: [connectorPlugin]
        });
    }
}
