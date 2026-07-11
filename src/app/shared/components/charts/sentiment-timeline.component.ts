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

export interface SentimentEntry {
    date: string;         // ISO date (YYYY-MM-DD or full ISO)
    value: number;        // -1 (muy negativo) a +1 (muy positivo)
    text?: string;        // Texto de la entrada (para tooltip)
    label?: string;       // Label corto opcional
}

export interface SentimentClickEvent {
    index: number;
    entry: SentimentEntry;
    sentiment: 'positivo' | 'neutral' | 'negativo';
}

// ─── Colores ─────────────────────────────────────────────────────────────────

const SENTIMENT_COLORS = {
    positive: { line: '#22c55e', area: 'rgba(34,197,94,0.15)', dot: '#16a34a' },
    neutral: { line: '#94a3b8', area: 'rgba(148,163,184,0.10)', dot: '#64748b' },
    negative: { line: '#ef4444', area: 'rgba(239,68,68,0.15)', dot: '#dc2626' }
};

@Component({
    selector: 'app-sentiment-timeline',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Empty State -->
    <div class="st-empty" *ngIf="!entries || entries.length === 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
        <line x1="9" y1="9" x2="9.01" y2="9"></line>
        <line x1="15" y1="9" x2="15.01" y2="9"></line>
      </svg>
      <p>Sin registros de sentimiento</p>
    </div>

    <div class="st-wrapper" *ngIf="entries && entries.length > 0">
      <!-- Summary KPIs -->
      <div class="st-kpis" *ngIf="showKpis">
        <div class="st-kpi">
          <span class="st-kpi-icon st-kpi-positive">😊</span>
          <div class="st-kpi-body">
            <span class="st-kpi-value">{{ positiveCount }}</span>
            <span class="st-kpi-label">Positivos</span>
          </div>
        </div>
        <div class="st-kpi">
          <span class="st-kpi-icon st-kpi-neutral">😐</span>
          <div class="st-kpi-body">
            <span class="st-kpi-value">{{ neutralCount }}</span>
            <span class="st-kpi-label">Neutrales</span>
          </div>
        </div>
        <div class="st-kpi">
          <span class="st-kpi-icon st-kpi-negative">😔</span>
          <div class="st-kpi-body">
            <span class="st-kpi-value">{{ negativeCount }}</span>
            <span class="st-kpi-label">Negativos</span>
          </div>
        </div>
        <div class="st-kpi st-kpi-avg">
          <div class="st-kpi-body">
            <span class="st-kpi-value" [style.color]="avgColor">{{ avgSentimentLabel }}</span>
            <span class="st-kpi-label">Promedio</span>
          </div>
        </div>
      </div>

      <!-- Canvas -->
      <div class="st-canvas-container" [style.height]="height">
        <canvas #sentimentCanvas></canvas>
      </div>

      <!-- Trend indicator -->
      <div class="st-trend" *ngIf="showTrend && entries.length >= 3">
        <span class="st-trend-arrow" [innerHTML]="trendArrow"></span>
        <span class="st-trend-text">{{ trendText }}</span>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; }

    .st-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafbfc;
    }
    .st-empty svg { width: 40px; height: 40px; color: #cbd5e1; margin-bottom: 12px; }
    .st-empty p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; }

    .st-wrapper { width: 100%; }

    .st-kpis {
      display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;
      justify-content: center;
    }
    .st-kpi {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-radius: 12px;
      background: #f8fafc; border: 1px solid #f1f5f9;
    }
    .st-kpi-icon { font-size: 20px; }
    .st-kpi-body { display: flex; flex-direction: column; gap: 1px; }
    .st-kpi-value { font-size: 16px; font-weight: 800; color: #1e293b; }
    .st-kpi-label { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3px; }
    .st-kpi-avg { background: rgba(99,102,241,0.06); border-color: rgba(99,102,241,0.1); }

    .st-canvas-container {
      position: relative; width: 100%;
      display: flex; justify-content: center; align-items: center;
    }
    canvas { width: 100% !important; height: 100% !important; }

    .st-trend {
      display: flex; align-items: center; gap: 6px;
      justify-content: center; margin-top: 14px;
      font-size: 12px; color: #64748b; font-weight: 500;
    }
    .st-trend-arrow { font-size: 16px; }
    .st-trend-text { font-weight: 600; }
  `]
})
export class SentimentTimelineComponent implements OnChanges, OnDestroy {

    // ── Inputs ──
    @Input() entries: SentimentEntry[] = [];
    @Input() height: string = '320px';
    @Input() showKpis: boolean = true;
    @Input() showTrend: boolean = true;
    @Input() neutralThreshold: number = 0.2;   // |value| < threshold = neutral
    @Input() smoothTension: number = 0.35;
    @Input() animationDuration: number = 800;
    @Input() showPoints: boolean = true;

    // ── Outputs ──
    @Output() entryClicked = new EventEmitter<SentimentClickEvent>();

    @ViewChild('sentimentCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

    // KPIs
    positiveCount = 0;
    neutralCount = 0;
    negativeCount = 0;
    avgSentimentLabel = '0.00';
    avgColor = '#64748b';

    // Trend
    trendArrow = '';
    trendText = '';

    private chart: Chart | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['entries'] || changes['neutralThreshold']) {
            this.computeKpis();
            this.computeTrend();
            setTimeout(() => this.renderChart(), 0);
        }
    }

    ngOnDestroy(): void {
        if (this.chart) { this.chart.destroy(); this.chart = null; }
    }

    // ── KPIs ──

    private computeKpis(): void {
        if (!this.entries || this.entries.length === 0) return;

        let pos = 0, neu = 0, neg = 0, sum = 0;
        this.entries.forEach(e => {
            const v = Math.max(-1, Math.min(1, e.value));
            sum += v;
            if (v >= this.neutralThreshold) pos++;
            else if (v <= -this.neutralThreshold) neg++;
            else neu++;
        });

        this.positiveCount = pos;
        this.neutralCount = neu;
        this.negativeCount = neg;

        const avg = sum / this.entries.length;
        this.avgSentimentLabel = avg >= 0 ? `+${avg.toFixed(2)}` : avg.toFixed(2);

        if (avg >= this.neutralThreshold) this.avgColor = '#16a34a';
        else if (avg <= -this.neutralThreshold) this.avgColor = '#dc2626';
        else this.avgColor = '#64748b';
    }

    private computeTrend(): void {
        if (!this.entries || this.entries.length < 3) {
            this.trendArrow = '';
            this.trendText = '';
            return;
        }

        // Compare last third vs first third
        const third = Math.floor(this.entries.length / 3);
        const firstAvg = this.entries.slice(0, third).reduce((s, e) => s + e.value, 0) / third;
        const lastAvg = this.entries.slice(-third).reduce((s, e) => s + e.value, 0) / third;
        const diff = lastAvg - firstAvg;

        if (diff > 0.1) {
            this.trendArrow = '<span style="color:#16a34a">↑</span>';
            this.trendText = `Tendencia positiva (+${diff.toFixed(2)})`;
        } else if (diff < -0.1) {
            this.trendArrow = '<span style="color:#dc2626">↓</span>';
            this.trendText = `Tendencia negativa (${diff.toFixed(2)})`;
        } else {
            this.trendArrow = '<span style="color:#94a3b8">→</span>';
            this.trendText = 'Tendencia estable';
        }
    }

    // ── Chart ──

    private getSentimentType(value: number): 'positivo' | 'neutral' | 'negativo' {
        if (value >= this.neutralThreshold) return 'positivo';
        if (value <= -this.neutralThreshold) return 'negativo';
        return 'neutral';
    }

    private renderChart(): void {
        if (!this.canvasRef || !this.entries || this.entries.length === 0) return;

        if (this.chart) { this.chart.destroy(); this.chart = null; }

        const sorted = [...this.entries].sort((a, b) => a.date.localeCompare(b.date));
        const labels = sorted.map(e => this.formatDateShort(e.date));
        const values = sorted.map(e => Math.max(-1, Math.min(1, e.value)));

        // Per-point colors
        const pointColors = values.map(v => {
            if (v >= this.neutralThreshold) return SENTIMENT_COLORS.positive.dot;
            if (v <= -this.neutralThreshold) return SENTIMENT_COLORS.negative.dot;
            return SENTIMENT_COLORS.neutral.dot;
        });

        const pointBorderColors = values.map(v => {
            if (v >= this.neutralThreshold) return SENTIMENT_COLORS.positive.line;
            if (v <= -this.neutralThreshold) return SENTIMENT_COLORS.negative.line;
            return SENTIMENT_COLORS.neutral.line;
        });

        const self = this;

        // Custom plugin: gradient fill under/over the neutral line
        const gradientPlugin = {
            id: 'sentimentGradient',
            beforeDatasetsDraw(chart: Chart) {
                const ctx = chart.ctx;
                const yScale = chart.scales['y'];
                const xScale = chart.scales['x'];
                const meta = chart.getDatasetMeta(0);
                if (!yScale || !xScale || !meta || meta.data.length < 2) return;

                const zeroY = yScale.getPixelForValue(0);

                ctx.save();

                // Positive gradient (above zero)
                const posGrad = ctx.createLinearGradient(0, yScale.top, 0, zeroY);
                posGrad.addColorStop(0, 'rgba(34,197,94,0.25)');
                posGrad.addColorStop(1, 'rgba(34,197,94,0.02)');

                // Negative gradient (below zero)
                const negGrad = ctx.createLinearGradient(0, zeroY, 0, yScale.bottom);
                negGrad.addColorStop(0, 'rgba(239,68,68,0.02)');
                negGrad.addColorStop(1, 'rgba(239,68,68,0.25)');

                // Draw positive area
                ctx.beginPath();
                ctx.moveTo(meta.data[0].x, zeroY);
                for (let i = 0; i < meta.data.length; i++) {
                    const point = meta.data[i];
                    const y = Math.min(point.y, zeroY); // Only above zero
                    if (i === 0) ctx.lineTo(point.x, y);
                    else ctx.lineTo(point.x, y);
                }
                ctx.lineTo(meta.data[meta.data.length - 1].x, zeroY);
                ctx.closePath();
                ctx.fillStyle = posGrad;
                ctx.fill();

                // Draw negative area
                ctx.beginPath();
                ctx.moveTo(meta.data[0].x, zeroY);
                for (let i = 0; i < meta.data.length; i++) {
                    const point = meta.data[i];
                    const y = Math.max(point.y, zeroY); // Only below zero
                    ctx.lineTo(point.x, y);
                }
                ctx.lineTo(meta.data[meta.data.length - 1].x, zeroY);
                ctx.closePath();
                ctx.fillStyle = negGrad;
                ctx.fill();

                ctx.restore();
            }
        };

        // Segment coloring for the line
        const segmentColor = (ctx: any) => {
            const p0 = ctx.p0?.parsed?.y ?? 0;
            const p1 = ctx.p1?.parsed?.y ?? 0;
            const avg = (p0 + p1) / 2;
            if (avg >= self.neutralThreshold) return SENTIMENT_COLORS.positive.line;
            if (avg <= -self.neutralThreshold) return SENTIMENT_COLORS.negative.line;
            return SENTIMENT_COLORS.neutral.line;
        };

        this.chart = new Chart(this.canvasRef.nativeElement, {
            type: 'line' as ChartType,
            data: {
                labels,
                datasets: [{
                    data: values,
                    borderWidth: 2.5,
                    tension: this.smoothTension,
                    fill: false, // We use the custom plugin instead
                    pointBackgroundColor: pointColors,
                    pointBorderColor: pointBorderColors,
                    pointBorderWidth: 2,
                    pointRadius: this.showPoints ? 5 : 0,
                    pointHoverRadius: 8,
                    pointHoverBorderWidth: 3,
                    pointHoverBackgroundColor: '#fff',
                    segment: {
                        borderColor: segmentColor
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
                        titleFont: { size: 12, weight: 'bold' as const },
                        bodyFont: { size: 11 },
                        displayColors: false,
                        callbacks: {
                            title: (items: any[]) => {
                                const idx = items[0]?.dataIndex;
                                if (idx == null) return '';
                                return self.formatDateLong(sorted[idx]?.date || '');
                            },
                            label: (ctx: any) => {
                                const idx = ctx.dataIndex;
                                const entry = sorted[idx];
                                if (!entry) return '';

                                const v = entry.value;
                                const emoji = v >= self.neutralThreshold ? '😊' : v <= -self.neutralThreshold ? '😔' : '😐';
                                const sentiment = self.getSentimentType(v);
                                const lines = [
                                    `${emoji} Sentimiento: ${v >= 0 ? '+' : ''}${v.toFixed(2)} (${sentiment})`
                                ];
                                if (entry.text) {
                                    const truncated = entry.text.length > 60 ? entry.text.substring(0, 57) + '...' : entry.text;
                                    lines.push(`"${truncated}"`);
                                }
                                return lines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(226,232,240,0.3)' },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 10 },
                            maxRotation: 45,
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        min: -1.1,
                        max: 1.1,
                        grid: {
                            color: (ctx: any) => {
                                if (ctx.tick && ctx.tick.value === 0) return 'rgba(148,163,184,0.5)';
                                return 'rgba(226,232,240,0.3)';
                            },
                            lineWidth: (ctx: any) => {
                                if (ctx.tick && ctx.tick.value === 0) return 2;
                                return 1;
                            }
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 10 },
                            stepSize: 0.5,
                            callback: (value: any) => {
                                if (value === 1) return '😊 +1';
                                if (value === 0.5) return '+0.5';
                                if (value === 0) return '😐 0';
                                if (value === -0.5) return '-0.5';
                                if (value === -1) return '😔 -1';
                                return '';
                            }
                        }
                    }
                },
                onClick: (_event: any, elements: any[]) => {
                    if (elements.length > 0) {
                        const idx = elements[0].index;
                        const entry = sorted[idx];
                        if (entry) {
                            self.entryClicked.emit({
                                index: idx,
                                entry,
                                sentiment: self.getSentimentType(entry.value)
                            });
                        }
                    }
                }
            },
            plugins: [gradientPlugin]
        });
    }

    // ── Formateo de fechas ──

    private formatDateShort(dateStr: string): string {
        try {
            const d = new Date(dateStr);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        } catch (e) { return dateStr; }
    }

    private formatDateLong(dateStr: string): string {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { return dateStr; }
    }
}
