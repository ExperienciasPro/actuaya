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

export interface ScatterPoint {
    x: number;
    y: number;
    label: string;
    group?: string;      // Para agrupar puntos por color
    size?: number;        // Radio custom (default 6)
    meta?: any;           // Datos extra para el evento click
}

export interface QuadrantConfig {
    /** Valor X que divide los cuadrantes */
    xThreshold: number;
    /** Valor Y que divide los cuadrantes */
    yThreshold: number;
    /** Labels de los 4 cuadrantes [topLeft, topRight, bottomLeft, bottomRight] */
    quadrantLabels?: string[];
    /** Colores de fondo de los 4 cuadrantes [topLeft, topRight, bottomLeft, bottomRight] */
    quadrantColors?: string[];
}

export interface AxisLabels {
    xLabel: string;
    yLabel: string;
}

export interface ScatterClickEvent {
    point: ScatterPoint;
    quadrant: string;      // 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
    quadrantLabel: string;
}

// ─── Colores para grupos ─────────────────────────────────────────────────────

const GROUP_COLORS = [
    { bg: 'rgba(99,102,241,0.7)', border: '#6366f1' },   // Indigo
    { bg: 'rgba(244,63,94,0.7)', border: '#f43f5e' },   // Rose
    { bg: 'rgba(16,185,129,0.7)', border: '#10b981' },   // Emerald
    { bg: 'rgba(245,158,11,0.7)', border: '#f59e0b' },   // Amber
    { bg: 'rgba(59,130,246,0.7)', border: '#3b82f6' },   // Blue
    { bg: 'rgba(139,92,246,0.7)', border: '#8b5cf6' },   // Violet
    { bg: 'rgba(236,72,153,0.7)', border: '#ec4899' },   // Pink
    { bg: 'rgba(14,165,233,0.7)', border: '#0ea5e9' },   // Sky
];

const DEFAULT_QUADRANT_LABELS = [
    'Alto Y / Bajo X',   // topLeft
    'Alto Y / Alto X',   // topRight ⭐
    'Bajo Y / Bajo X',   // bottomLeft
    'Bajo Y / Alto X'    // bottomRight
];

const DEFAULT_QUADRANT_COLORS = [
    'rgba(251,191,36,0.06)',   // topLeft – amber
    'rgba(34,197,94,0.08)',    // topRight – green ⭐ best
    'rgba(239,68,68,0.06)',    // bottomLeft – red
    'rgba(59,130,246,0.06)'    // bottomRight – blue
];

@Component({
    selector: 'app-quadrant-scatter',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Empty State -->
    <div class="qs-empty" *ngIf="!points || points.length === 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="7" cy="7" r="2"></circle>
        <circle cx="17" cy="7" r="2"></circle>
        <circle cx="12" cy="17" r="2"></circle>
        <line x1="2" y1="12" x2="22" y2="12" stroke-dasharray="3 3"></line>
        <line x1="12" y1="2" x2="12" y2="22" stroke-dasharray="3 3"></line>
      </svg>
      <p>Sin datos para el gráfico de dispersión</p>
    </div>

    <div class="qs-wrapper" *ngIf="points && points.length > 0">
      <!-- Legend (grupos) -->
      <div class="qs-legend" *ngIf="groupNames.length > 1">
        <button
          *ngFor="let g of groupNames; let i = index"
          class="qs-legend-btn"
          [class.qs-legend-disabled]="hiddenGroups.has(g)"
          (click)="toggleGroup(g)"
        >
          <span class="qs-dot" [style.background]="getGroupColor(i).border"></span>
          {{ g }}
        </button>
      </div>

      <!-- Canvas -->
      <div class="qs-canvas-container" [style.height]="height">
        <canvas #scatterCanvas></canvas>
      </div>

      <!-- Quadrant label legend -->
      <div class="qs-quadrants-legend" *ngIf="showQuadrantLegend">
        <div class="qs-ql-item" *ngFor="let ql of activeQuadrantLabels; let i = index">
          <span class="qs-ql-dot" [style.background]="activeQuadrantColors[i]"></span>
          <span class="qs-ql-text">{{ ql }}</span>
          <strong class="qs-ql-count">{{ quadrantCounts[i] }}</strong>
        </div>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; }

    .qs-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafbfc;
    }
    .qs-empty svg { width: 44px; height: 44px; color: #cbd5e1; margin-bottom: 12px; }
    .qs-empty p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; }

    .qs-wrapper { width: 100%; }

    .qs-legend {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;
      padding: 6px 8px; background: rgba(241,245,249,0.6); border-radius: 10px;
    }
    .qs-legend-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 8px; border: 1px solid transparent;
      background: #fff; cursor: pointer; font-size: 11px; font-weight: 600; color: #334155;
      transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .qs-legend-btn:hover { border-color: #e2e8f0; }
    .qs-legend-btn.qs-legend-disabled { opacity: 0.35; background: #f8fafc; }
    .qs-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

    .qs-canvas-container {
      position: relative; width: 100%;
      display: flex; justify-content: center; align-items: center;
    }
    canvas { width: 100% !important; height: 100% !important; }

    .qs-quadrants-legend {
      display: flex; flex-wrap: wrap; gap: 14px; justify-content: center;
      margin-top: 14px;
    }
    .qs-ql-item {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: #64748b;
    }
    .qs-ql-dot {
      width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0;
      border: 1px solid rgba(0,0,0,0.06);
    }
    .qs-ql-text { font-weight: 500; }
    .qs-ql-count { font-weight: 800; color: #1e293b; font-size: 13px; }
  `]
})
export class QuadrantScatterComponent implements OnChanges, OnDestroy {

    // ── Inputs ──
    @Input() points: ScatterPoint[] = [];
    @Input() quadrants: QuadrantConfig = { xThreshold: 50, yThreshold: 50 };
    @Input() axisLabels: AxisLabels = { xLabel: 'Eje X', yLabel: 'Eje Y' };
    @Input() height: string = '400px';
    @Input() showQuadrantLegend: boolean = true;
    @Input() animationDuration: number = 700;
    @Input() defaultPointSize: number = 6;

    // ── Outputs ──
    @Output() pointClicked = new EventEmitter<ScatterClickEvent>();

    @ViewChild('scatterCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

    groupNames: string[] = [];
    hiddenGroups = new Set<string>();
    activeQuadrantLabels: string[] = DEFAULT_QUADRANT_LABELS;
    activeQuadrantColors: string[] = DEFAULT_QUADRANT_COLORS;
    quadrantCounts: number[] = [0, 0, 0, 0];

    private chart: Chart | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['points'] || changes['quadrants'] || changes['axisLabels']) {
            this.updateQuadrantConfig();
            this.extractGroups();
            this.computeQuadrantCounts();
            setTimeout(() => this.renderChart(), 0);
        }
    }

    ngOnDestroy(): void {
        if (this.chart) { this.chart.destroy(); this.chart = null; }
    }

    toggleGroup(group: string): void {
        if (this.hiddenGroups.has(group)) {
            this.hiddenGroups.delete(group);
        } else {
            this.hiddenGroups.add(group);
        }
        if (this.chart) {
            const idx = this.groupNames.indexOf(group);
            if (idx >= 0) {
                const meta = this.chart.getDatasetMeta(idx);
                meta.hidden = this.hiddenGroups.has(group);
                this.chart.update('none');
            }
        }
    }

    getGroupColor(index: number): { bg: string; border: string } {
        return GROUP_COLORS[index % GROUP_COLORS.length];
    }

    // ── Internals ──

    private updateQuadrantConfig(): void {
        this.activeQuadrantLabels = this.quadrants.quadrantLabels || DEFAULT_QUADRANT_LABELS;
        this.activeQuadrantColors = this.quadrants.quadrantColors || DEFAULT_QUADRANT_COLORS;
    }

    private extractGroups(): void {
        const groups = new Set<string>();
        (this.points || []).forEach(p => groups.add(p.group || 'General'));
        this.groupNames = Array.from(groups);
    }

    private computeQuadrantCounts(): void {
        const counts = [0, 0, 0, 0];
        const xT = this.quadrants.xThreshold;
        const yT = this.quadrants.yThreshold;

        (this.points || []).forEach(p => {
            if (p.y >= yT && p.x < xT) counts[0]++;       // topLeft
            else if (p.y >= yT && p.x >= xT) counts[1]++;  // topRight
            else if (p.y < yT && p.x < xT) counts[2]++;    // bottomLeft
            else counts[3]++;                                // bottomRight
        });

        this.quadrantCounts = counts;
    }

    private getQuadrantName(x: number, y: number): { name: string; label: string } {
        const xT = this.quadrants.xThreshold;
        const yT = this.quadrants.yThreshold;
        if (y >= yT && x < xT) return { name: 'topLeft', label: this.activeQuadrantLabels[0] };
        if (y >= yT && x >= xT) return { name: 'topRight', label: this.activeQuadrantLabels[1] };
        if (y < yT && x < xT) return { name: 'bottomLeft', label: this.activeQuadrantLabels[2] };
        return { name: 'bottomRight', label: this.activeQuadrantLabels[3] };
    }

    private renderChart(): void {
        if (!this.canvasRef || !this.points || this.points.length === 0) return;

        if (this.chart) { this.chart.destroy(); this.chart = null; }

        const xT = this.quadrants.xThreshold;
        const yT = this.quadrants.yThreshold;
        const self = this;

        // Group points into datasets
        const datasets = this.groupNames.map((group, gi) => {
            const color = this.getGroupColor(gi);
            const groupPoints = this.points.filter(p => (p.group || 'General') === group);

            return {
                label: group,
                data: groupPoints.map(p => ({
                    x: p.x,
                    y: p.y,
                    _label: p.label,
                    _meta: p.meta,
                    _size: p.size
                })),
                backgroundColor: color.bg,
                borderColor: color.border,
                borderWidth: 2,
                pointRadius: groupPoints.map(p => p.size || this.defaultPointSize),
                pointHoverRadius: groupPoints.map(p => (p.size || this.defaultPointSize) + 3),
                pointHoverBorderWidth: 3,
                pointHoverBorderColor: '#fff',
                hidden: this.hiddenGroups.has(group)
            };
        });

        // Custom plugin: quadrant backgrounds + dividing lines + labels
        const quadrantPlugin = {
            id: 'quadrantBackgrounds',
            beforeDatasetsDraw(chart: Chart) {
                const ctx = chart.ctx;
                const xScale = chart.scales['x'];
                const yScale = chart.scales['y'];
                if (!xScale || !yScale) return;

                const xPx = xScale.getPixelForValue(xT);
                const yPx = yScale.getPixelForValue(yT);
                const left = xScale.left;
                const right = xScale.right;
                const top = yScale.top;
                const bottom = yScale.bottom;

                const colors = self.activeQuadrantColors;
                const labels = self.activeQuadrantLabels;

                ctx.save();

                // Draw quadrant backgrounds
                // Top-Left
                ctx.fillStyle = colors[0];
                ctx.fillRect(left, top, xPx - left, yPx - top);
                // Top-Right
                ctx.fillStyle = colors[1];
                ctx.fillRect(xPx, top, right - xPx, yPx - top);
                // Bottom-Left
                ctx.fillStyle = colors[2];
                ctx.fillRect(left, yPx, xPx - left, bottom - yPx);
                // Bottom-Right
                ctx.fillStyle = colors[3];
                ctx.fillRect(xPx, yPx, right - xPx, bottom - yPx);

                // Draw dividing lines
                ctx.strokeStyle = 'rgba(148,163,184,0.5)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 4]);

                // Vertical line
                ctx.beginPath();
                ctx.moveTo(xPx, top);
                ctx.lineTo(xPx, bottom);
                ctx.stroke();

                // Horizontal line
                ctx.beginPath();
                ctx.moveTo(left, yPx);
                ctx.lineTo(right, yPx);
                ctx.stroke();

                ctx.setLineDash([]);

                // Draw quadrant labels
                ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                ctx.fillStyle = 'rgba(100,116,139,0.5)';
                ctx.textAlign = 'center';

                const pad = 20;
                // Top-Left
                ctx.fillText(labels[0], (left + xPx) / 2, top + pad);
                // Top-Right
                ctx.fillText(labels[1], (xPx + right) / 2, top + pad);
                // Bottom-Left
                ctx.fillText(labels[2], (left + xPx) / 2, bottom - pad + 8);
                // Bottom-Right
                ctx.fillText(labels[3], (xPx + right) / 2, bottom - pad + 8);

                ctx.restore();
            }
        };

        // Determine axis ranges
        const allX = this.points.map(p => p.x);
        const allY = this.points.map(p => p.y);
        const xMin = Math.min(...allX, 0);
        const xMax = Math.max(...allX, xT * 2);
        const yMin = Math.min(...allY, 0);
        const yMax = Math.max(...allY, yT * 2);
        const xPad = (xMax - xMin) * 0.1;
        const yPad = (yMax - yMin) * 0.1;

        this.chart = new Chart(this.canvasRef.nativeElement, {
            type: 'scatter' as ChartType,
            data: { datasets: datasets as any },
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
                        bodyFont: { size: 11 },
                        displayColors: true,
                        boxPadding: 4,
                        callbacks: {
                            title: (items: any[]) => {
                                const raw = items[0]?.raw as any;
                                return raw?._label || '';
                            },
                            label: (ctx: any) => {
                                const raw = ctx.raw as any;
                                const q = self.getQuadrantName(raw.x, raw.y);
                                return [
                                    ` ${self.axisLabels.xLabel}: ${raw.x}`,
                                    ` ${self.axisLabels.yLabel}: ${raw.y}`,
                                    ` Cuadrante: ${q.label}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: xMin - xPad,
                        max: xMax + xPad,
                        title: {
                            display: true,
                            text: this.axisLabels.xLabel,
                            color: '#64748b',
                            font: { size: 12, weight: '600' as any }
                        },
                        grid: { color: 'rgba(226,232,240,0.4)' },
                        ticks: { color: '#94a3b8', font: { size: 10 } }
                    },
                    y: {
                        min: yMin - yPad,
                        max: yMax + yPad,
                        title: {
                            display: true,
                            text: this.axisLabels.yLabel,
                            color: '#64748b',
                            font: { size: 12, weight: '600' as any }
                        },
                        grid: { color: 'rgba(226,232,240,0.4)' },
                        ticks: { color: '#94a3b8', font: { size: 10 } }
                    }
                },
                onClick: (_event: any, elements: any[]) => {
                    if (elements.length > 0) {
                        const el = elements[0];
                        const dsIdx = el.datasetIndex;
                        const ptIdx = el.index;
                        const raw = (self.chart?.data.datasets[dsIdx] as any)?.data?.[ptIdx];
                        if (raw) {
                            const q = self.getQuadrantName(raw.x, raw.y);
                            self.pointClicked.emit({
                                point: { x: raw.x, y: raw.y, label: raw._label, meta: raw._meta },
                                quadrant: q.name,
                                quadrantLabel: q.label
                            });
                        }
                    }
                }
            },
            plugins: [quadrantPlugin]
        });
    }
}
