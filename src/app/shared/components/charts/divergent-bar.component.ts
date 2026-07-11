import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    OnChanges,
    SimpleChanges,
    ElementRef,
    ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface LikertPregunta {
    pregunta: string;
    /** Conteo por categoría Likert, siempre en este orden:
     *  [Muy en desacuerdo, En desacuerdo, Neutral, De acuerdo, Muy de acuerdo]
     *  o [1, 2, 3, 4, 5] */
    conteos: number[];
}

export interface DivergentBarClickEvent {
    preguntaIndex: number;
    pregunta: string;
    categoriaIndex: number;
    categoria: string;
    conteo: number;
}

// ─── Escalas de colores Likert ───────────────────────────────────────────────

const LIKERT_PALETTES: Record<string, { bg: string[]; border: string[]; labels: string[] }> = {
    agreement: {
        bg: [
            'rgba(239,68,68,0.75)',    // Muy en desacuerdo → Rojo
            'rgba(251,146,60,0.75)',   // En desacuerdo → Naranja
            'rgba(148,163,184,0.55)',  // Neutral → Gris
            'rgba(74,222,128,0.75)',   // De acuerdo → Verde claro
            'rgba(34,197,94,0.85)',    // Muy de acuerdo → Verde
        ],
        border: ['#ef4444', '#fb923c', '#94a3b8', '#4ade80', '#22c55e'],
        labels: ['Muy en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Muy de acuerdo']
    },
    satisfaction: {
        bg: [
            'rgba(239,68,68,0.75)',
            'rgba(245,158,11,0.75)',
            'rgba(148,163,184,0.55)',
            'rgba(59,130,246,0.75)',
            'rgba(99,102,241,0.85)',
        ],
        border: ['#ef4444', '#f59e0b', '#94a3b8', '#3b82f6', '#6366f1'],
        labels: ['Muy insatisfecho', 'Insatisfecho', 'Neutral', 'Satisfecho', 'Muy satisfecho']
    },
    frequency: {
        bg: [
            'rgba(148,163,184,0.55)',
            'rgba(245,158,11,0.65)',
            'rgba(251,146,60,0.75)',
            'rgba(59,130,246,0.75)',
            'rgba(99,102,241,0.85)',
        ],
        border: ['#94a3b8', '#f59e0b', '#fb923c', '#3b82f6', '#6366f1'],
        labels: ['Nunca', 'Raramente', 'A veces', 'Frecuentemente', 'Siempre']
    },
    numeric: {
        bg: [
            'rgba(239,68,68,0.75)',
            'rgba(251,146,60,0.75)',
            'rgba(148,163,184,0.55)',
            'rgba(74,222,128,0.75)',
            'rgba(34,197,94,0.85)',
        ],
        border: ['#ef4444', '#fb923c', '#94a3b8', '#4ade80', '#22c55e'],
        labels: ['1', '2', '3', '4', '5']
    }
};

@Component({
    selector: 'app-divergent-bar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Empty State -->
    <div class="divergent-empty" *ngIf="!preguntasData || preguntasData.length === 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
      </svg>
      <p>Sin datos de encuesta para visualizar</p>
    </div>

    <div class="divergent-wrapper" *ngIf="preguntasData && preguntasData.length > 0">
      <!-- Legend -->
      <div class="divergent-legend">
        <div class="legend-chip" *ngFor="let lbl of activeLabels; let i = index">
          <span class="chip-dot" [style.background]="activePalette.border[i]"></span>
          <span class="chip-text">{{ lbl }}</span>
        </div>
      </div>

      <!-- Chart -->
      <div class="divergent-canvas-container" [style.height]="canvasHeight">
        <canvas #divergentCanvas></canvas>
      </div>

      <!-- Summary Row -->
      <div class="divergent-summary" *ngIf="showSummary">
        <div class="summary-item" *ngFor="let lbl of activeLabels; let i = index">
          <span class="summary-dot" [style.background]="activePalette.border[i]"></span>
          <span class="summary-label">{{ lbl }}</span>
          <strong class="summary-value">{{ getCategoryTotal(i) }}</strong>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; }

    .divergent-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafbfc;
    }
    .divergent-empty svg { width: 40px; height: 40px; color: #cbd5e1; margin-bottom: 12px; }
    .divergent-empty p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; }

    .divergent-wrapper { width: 100%; }

    .divergent-legend {
      display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;
      justify-content: center;
    }
    .legend-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 20px;
      background: #f8fafc; border: 1px solid #f1f5f9;
      font-size: 11px; font-weight: 600; color: #475569;
    }
    .chip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .chip-text { white-space: nowrap; }

    .divergent-canvas-container {
      position: relative; width: 100%;
      display: flex; justify-content: center; align-items: center;
    }
    canvas { width: 100% !important; height: 100% !important; }

    .divergent-summary {
      display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;
      margin-top: 16px; padding: 12px 16px;
      background: rgba(241,245,249,0.5); border-radius: 12px;
    }
    .summary-item {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #64748b;
    }
    .summary-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .summary-label { font-weight: 500; }
    .summary-value { font-weight: 800; color: #1e293b; font-size: 13px; }
  `]
})
export class DivergentBarComponent implements OnInit, OnDestroy, OnChanges {

    // ── Inputs ──
    @Input() preguntasData: LikertPregunta[] = [];
    @Input() palette: 'agreement' | 'satisfaction' | 'frequency' | 'numeric' = 'agreement';
    @Input() customLabels: string[] | null = null;
    @Input() showSummary: boolean = true;
    @Input() showPercentages: boolean = true;
    @Input() maxQuestionsVisible: number = 15;
    @Input() barThickness: number = 22;
    @Input() animationDuration: number = 700;

    // ── Outputs ──
    @Output() barClicked = new EventEmitter<DivergentBarClickEvent>();

    @ViewChild('divergentCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

    activePalette = LIKERT_PALETTES['agreement'];
    activeLabels: string[] = [];
    private chart: Chart | null = null;

    get canvasHeight(): string {
        const numPreguntas = Math.min(this.preguntasData?.length || 0, this.maxQuestionsVisible);
        const rowHeight = this.barThickness + 20;
        const minHeight = 200;
        return Math.max(numPreguntas * rowHeight + 80, minHeight) + 'px';
    }

    ngOnInit(): void {
        this.updatePalette();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['palette'] || changes['customLabels']) {
            this.updatePalette();
        }
        if (changes['preguntasData'] || changes['palette'] || changes['barThickness']) {
            setTimeout(() => this.renderChart(), 0);
        }
    }

    ngOnDestroy(): void {
        this.destroyChart();
    }

    getCategoryTotal(catIndex: number): number {
        if (!this.preguntasData) return 0;
        return this.preguntasData.reduce((sum, p) => sum + (p.conteos[catIndex] || 0), 0);
    }

    // ── Internals ──

    private updatePalette(): void {
        this.activePalette = LIKERT_PALETTES[this.palette] || LIKERT_PALETTES['agreement'];
        this.activeLabels = this.customLabels || this.activePalette.labels;
    }

    private renderChart(): void {
        if (!this.canvasRef || !this.preguntasData || this.preguntasData.length === 0) return;
        this.destroyChart();

        const visibleData = this.preguntasData.slice(0, this.maxQuestionsVisible);
        const numCategories = this.activeLabels.length;
        const neutralIndex = Math.floor(numCategories / 2); // Centro = categoría neutral

        // Truncar labels de preguntas a 50 chars
        const questionLabels = visibleData.map(p => {
            const txt = p.pregunta || '';
            return txt.length > 50 ? txt.substring(0, 47) + '...' : txt;
        });

        // Construir datasets divergentes
        // Las categorías negativas van hacia la izquierda (valores negativos)
        // La neutral queda centrada, las positivas van a la derecha
        const datasets = this.activeLabels.map((label, catIdx) => {
            const isNegative = catIdx < neutralIndex;
            const isNeutral = catIdx === neutralIndex;

            const data = visibleData.map(pregunta => {
                const total = pregunta.conteos.reduce((a, b) => a + b, 0);
                if (total === 0) return 0;

                const rawValue = pregunta.conteos[catIdx] || 0;
                const percent = (rawValue / total) * 100;

                if (isNegative) return -percent;
                if (isNeutral) return percent / 2; // Split neutral: half on each side
                return percent;
            });

            return {
                label,
                data,
                backgroundColor: this.activePalette.bg[catIdx],
                borderColor: this.activePalette.border[catIdx],
                borderWidth: 1,
                borderRadius: 3,
                borderSkipped: false as const,
                barThickness: this.barThickness,
                // Stack neutral con negativos para centrar visualmente
                stack: isNeutral ? 'negative' : (isNegative ? 'negative' : 'positive'),
                _catIdx: catIdx,
                _isNeutral: isNeutral
            };
        });

        // Agregar la otra mitad del neutral en el stack positivo
        if (numCategories > 2) {
            const neutralData = visibleData.map(pregunta => {
                const total = pregunta.conteos.reduce((a, b) => a + b, 0);
                if (total === 0) return 0;
                const rawValue = pregunta.conteos[neutralIndex] || 0;
                return (rawValue / total) * 100 / 2;
            });

            datasets.push({
                label: this.activeLabels[neutralIndex],
                data: neutralData,
                backgroundColor: this.activePalette.bg[neutralIndex],
                borderColor: this.activePalette.border[neutralIndex],
                borderWidth: 0,
                borderRadius: 3,
                borderSkipped: false as const,
                barThickness: this.barThickness,
                stack: 'positive',
                _catIdx: neutralIndex,
                _isNeutral: true
            } as any);
        }

        const self = this;

        this.chart = new Chart(this.canvasRef.nativeElement, {
            type: 'bar' as ChartType,
            data: {
                labels: questionLabels,
                datasets: datasets as any
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                animation: {
                    duration: this.animationDuration,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'y',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false // Usamos legend custom
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.92)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: { top: 10, bottom: 10, left: 14, right: 14 },
                        titleFont: { size: 12, weight: 'bold' as const },
                        bodyFont: { size: 11 },
                        displayColors: true,
                        boxPadding: 4,
                        filter: (tooltipItem: any) => {
                            // Ocultar la mitad duplicada del neutral en el tooltip
                            const ds = tooltipItem.dataset as any;
                            if (ds._isNeutral && ds.stack === 'positive') return false;
                            return true;
                        },
                        callbacks: {
                            label: (ctx: any) => {
                                const absVal = Math.abs(ctx.raw || 0);
                                const ds = ctx.dataset as any;
                                // Si es neutral, mostrar el valor completo (x2 porque lo dividimos)
                                const displayVal = ds._isNeutral ? (absVal * 2).toFixed(1) : absVal.toFixed(1);
                                return ` ${ctx.dataset.label}: ${displayVal}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        min: -100,
                        max: 100,
                        grid: {
                            color: (ctx: any) => {
                                // Línea central más visible
                                if (ctx.tick && ctx.tick.value === 0) return 'rgba(15,23,42,0.15)';
                                return 'rgba(226,232,240,0.4)';
                            },
                            lineWidth: (ctx: any) => {
                                if (ctx.tick && ctx.tick.value === 0) return 2;
                                return 1;
                            }
                        },
                        ticks: {
                            callback: (value: any) => `${Math.abs(value)}%`,
                            color: '#94a3b8',
                            font: { size: 10 },
                            stepSize: 25
                        }
                    },
                    y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: {
                            color: '#334155',
                            font: { size: 11, weight: '500' as any },
                            padding: 8
                        }
                    }
                },
                onClick: (_event: any, elements: any[]) => {
                    if (elements.length > 0) {
                        const el = elements[0];
                        const dsData = (this.chart?.data.datasets?.[el.datasetIndex] as any);
                        const catIdx = dsData?._catIdx ?? el.datasetIndex;
                        const pregIdx = el.index;
                        const pregunta = this.preguntasData[pregIdx];
                        if (pregunta) {
                            self.barClicked.emit({
                                preguntaIndex: pregIdx,
                                pregunta: pregunta.pregunta,
                                categoriaIndex: catIdx,
                                categoria: self.activeLabels[catIdx] || '',
                                conteo: pregunta.conteos[catIdx] || 0
                            });
                        }
                    }
                }
            }
        });
    }

    private destroyChart(): void {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
