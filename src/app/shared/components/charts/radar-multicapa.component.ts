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

export interface RadarDataset {
    label: string;
    data: number[];
    color: string;          // Color principal (hex)
    hidden?: boolean;       // Oculto por defecto
}

export interface RadarLayerToggleEvent {
    datasetIndex: number;
    label: string;
    visible: boolean;
}

// ─── Colores predeterminados premium ─────────────────────────────────────────
const DEFAULT_COLORS = [
    '#6366f1', // Indigo
    '#f43f5e', // Rose
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#14b8a6', // Teal
    '#ef4444', // Red
];

@Component({
    selector: 'app-radar-multicapa',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Empty State -->
    <div class="radar-empty" *ngIf="!datasets || datasets.length === 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
        <line x1="12" y1="22" x2="12" y2="15.5"></line>
        <line x1="22" y1="8.5" x2="12" y2="15.5"></line>
        <line x1="2" y1="8.5" x2="12" y2="15.5"></line>
      </svg>
      <p>Sin datos para visualizar</p>
    </div>

    <!-- Chart Area -->
    <div class="radar-wrapper" *ngIf="datasets && datasets.length > 0">
      <!-- Custom Legend -->
      <div class="radar-legend" *ngIf="showLegend">
        <button
          *ngFor="let ds of datasets; let i = index"
          class="legend-item"
          [class.legend-disabled]="hiddenLayers.has(i)"
          (click)="toggleLayer(i)"
        >
          <span class="legend-dot" [style.background]="ds.color || getDefaultColor(i)"></span>
          <span class="legend-label">{{ ds.label }}</span>
        </button>
      </div>

      <!-- Canvas -->
      <div class="radar-canvas-container" [style.height]="height">
        <canvas #radarCanvas></canvas>
      </div>

      <!-- Tooltip de detalle (opcional) -->
      <div class="radar-footer" *ngIf="showFooter">
        <span class="radar-footer-text">
          {{ datasets.length }} {{ datasets.length === 1 ? 'capa' : 'capas' }} · {{ labels.length }} dimensiones
        </span>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; }

    .radar-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px;
      background: #fafbfc;
    }
    .radar-empty svg { width: 40px; height: 40px; color: #cbd5e1; margin-bottom: 12px; }
    .radar-empty p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; }

    .radar-wrapper { width: 100%; }

    .radar-legend {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;
      padding: 6px 8px;
      background: rgba(241,245,249,0.6); border-radius: 10px;
    }
    .legend-item {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: 8px;
      border: 1px solid transparent;
      background: #fff;
      font-size: 12px; font-weight: 600; color: #334155;
      cursor: pointer; transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .legend-item:hover { border-color: #e2e8f0; transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
    .legend-item.legend-disabled { opacity: 0.4; background: #f8fafc; }
    .legend-item.legend-disabled .legend-dot { background: #cbd5e1 !important; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; transition: background 0.2s ease; }
    .legend-label { white-space: nowrap; }

    .radar-canvas-container {
      position: relative; width: 100%;
      display: flex; justify-content: center; align-items: center;
    }
    canvas { width: 100% !important; height: 100% !important; }

    .radar-footer {
      margin-top: 12px; text-align: center;
    }
    .radar-footer-text {
      font-size: 11px; color: #94a3b8; font-weight: 500;
      letter-spacing: 0.3px;
    }
  `]
})
export class RadarMulticapaComponent implements OnInit, OnDestroy, OnChanges {

    // ── Inputs ──
    @Input() datasets: RadarDataset[] = [];
    @Input() labels: string[] = [];
    @Input() height: string = '380px';
    @Input() showLegend: boolean = true;
    @Input() showFooter: boolean = true;
    @Input() maxScale: number = 100;
    @Input() stepSize: number = 20;
    @Input() fillOpacity: number = 0.1;
    @Input() borderWidth: number = 2.5;
    @Input() pointRadius: number = 4;
    @Input() animationDuration: number = 800;

    // ── Outputs ──
    @Output() layerToggled = new EventEmitter<RadarLayerToggleEvent>();
    @Output() pointClicked = new EventEmitter<{ datasetIndex: number; index: number; value: number }>();

    @ViewChild('radarCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

    hiddenLayers = new Set<number>();
    private chart: Chart | null = null;

    ngOnInit(): void {
        // Chart se inicializa en ngAfterViewInit implícito a través de ngOnChanges
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['datasets'] || changes['labels'] || changes['maxScale'] || changes['stepSize']) {
            // Esperar al siguiente tick para que el canvas esté disponible
            setTimeout(() => this.renderChart(), 0);
        }
    }

    ngOnDestroy(): void {
        this.destroyChart();
    }

    // ── Interacción: Toggle de capas ──

    toggleLayer(index: number): void {
        if (this.hiddenLayers.has(index)) {
            this.hiddenLayers.delete(index);
        } else {
            this.hiddenLayers.add(index);
        }

        if (this.chart) {
            this.chart.data.datasets?.forEach((ds, i) => {
                const meta = this.chart!.getDatasetMeta(i);
                meta.hidden = this.hiddenLayers.has(i);
            });
            this.chart.update('none');
        }

        const ds = this.datasets[index];
        this.layerToggled.emit({
            datasetIndex: index,
            label: ds?.label || '',
            visible: !this.hiddenLayers.has(index)
        });
    }

    getDefaultColor(index: number): string {
        return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    }

    // ── Renderizado ──

    private renderChart(): void {
        if (!this.canvasRef || !this.datasets || this.datasets.length === 0) return;

        this.destroyChart();

        const chartDatasets = this.datasets.map((ds, i) => {
            const color = ds.color || this.getDefaultColor(i);
            const rgbColor = this.hexToRgb(color);

            return {
                label: ds.label,
                data: ds.data,
                backgroundColor: `rgba(${rgbColor}, ${this.fillOpacity})`,
                borderColor: color,
                borderWidth: this.borderWidth,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: this.pointRadius,
                pointHoverRadius: this.pointRadius + 3,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: color,
                pointHoverBorderWidth: 3,
                hidden: this.hiddenLayers.has(i) || ds.hidden,
                fill: true
            };
        });

        this.chart = new Chart(this.canvasRef.nativeElement, {
            type: 'radar' as ChartType,
            data: {
                labels: this.labels,
                datasets: chartDatasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: this.animationDuration,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'nearest',
                    intersect: true
                },
                plugins: {
                    legend: {
                        display: false  // Usamos nuestra leyenda custom
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleColor: '#f8fafc',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: { top: 10, bottom: 10, left: 14, right: 14 },
                        titleFont: { size: 13, weight: 'bold' as const },
                        bodyFont: { size: 12 },
                        displayColors: true,
                        boxPadding: 4,
                        callbacks: {
                            label: (ctx: any) => {
                                return ` ${ctx.dataset.label}: ${ctx.raw}/${this.maxScale}`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: this.maxScale,
                        ticks: {
                            stepSize: this.stepSize,
                            color: '#94a3b8',
                            font: { size: 10 },
                            backdropColor: 'transparent',
                            showLabelBackdrop: false
                        },
                        grid: {
                            color: 'rgba(226, 232, 240, 0.6)',
                            lineWidth: 1
                        },
                        angleLines: {
                            color: 'rgba(226, 232, 240, 0.4)',
                            lineWidth: 1
                        },
                        pointLabels: {
                            color: '#334155',
                            font: {
                                size: 12,
                                weight: '600' as any
                            },
                            padding: 14
                        }
                    }
                },
                onClick: (_event: any, elements: any[]) => {
                    if (elements.length > 0) {
                        const el = elements[0];
                        const dsIndex = el.datasetIndex;
                        const idx = el.index;
                        const value = this.datasets[dsIndex]?.data[idx] || 0;
                        this.pointClicked.emit({ datasetIndex: dsIndex, index: idx, value });
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

    /** Convierte hex (#6366f1) a string RGB (99, 102, 241) */
    private hexToRgb(hex: string): string {
        const h = hex.replace('#', '');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `${r}, ${g}, ${b}`;
    }
}
