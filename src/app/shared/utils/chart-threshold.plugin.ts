import { Chart, Plugin } from 'chart.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ThresholdLine {
    value: number;
    label?: string;
    color?: string;
    lineWidth?: number;
    lineDash?: number[];
    labelPosition?: 'left' | 'right' | 'center';
    showLabel?: boolean;
    /** Zona de fondo: colorea el área entre este umbral y el siguiente */
    zoneColor?: string;
}

export interface ThresholdPluginOptions {
    thresholds: ThresholdLine[];
    /** Eje donde se posicionan los umbrales ('y' | 'x') */
    axis?: 'y' | 'x';
    /** ID del eje de Chart.js (default 'y' o 'x') */
    scaleId?: string;
    /** Si true, anima un flash cuando un valor cruza el umbral */
    flashOnCross?: boolean;
}

// ─── Colores por defecto ─────────────────────────────────────────────────────

const DEFAULT_COLORS = {
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#22c55e',
    info: '#3b82f6',
    neutral: '#94a3b8'
};

// ─── Plugin de Chart.js ──────────────────────────────────────────────────────

export const thresholdPlugin: Plugin = {
    id: 'thresholdLines',

    beforeDatasetsDraw(chart: Chart, _args: any, _pluginOpts: any) {
        const options = (chart.options as any)?.plugins?.thresholdLines as ThresholdPluginOptions;
        if (!options || !options.thresholds || options.thresholds.length === 0) return;

        const ctx = chart.ctx;
        const axis = options.axis || 'y';
        const scaleId = options.scaleId || axis;
        const scale = chart.scales[scaleId];
        if (!scale) return;

        const chartArea = chart.chartArea;
        if (!chartArea) return;

        ctx.save();

        // Ordenar umbrales por valor para zonas
        const sorted = [...options.thresholds].sort((a, b) => a.value - b.value);

        // ── 1. Dibujar zonas de fondo ──
        sorted.forEach((threshold, i) => {
            if (!threshold.zoneColor) return;

            const nextValue = i < sorted.length - 1 ? sorted[i + 1].value : null;

            if (axis === 'y') {
                const y1 = scale.getPixelForValue(threshold.value);
                const y2 = nextValue != null
                    ? scale.getPixelForValue(nextValue)
                    : chartArea.top;

                // Clamp to chart area
                const top = Math.max(Math.min(y1, y2), chartArea.top);
                const bottom = Math.min(Math.max(y1, y2), chartArea.bottom);

                ctx.fillStyle = threshold.zoneColor;
                ctx.fillRect(chartArea.left, top, chartArea.right - chartArea.left, bottom - top);
            } else {
                const x1 = scale.getPixelForValue(threshold.value);
                const x2 = nextValue != null
                    ? scale.getPixelForValue(nextValue)
                    : chartArea.right;

                const left = Math.max(Math.min(x1, x2), chartArea.left);
                const right = Math.min(Math.max(x1, x2), chartArea.right);

                ctx.fillStyle = threshold.zoneColor;
                ctx.fillRect(left, chartArea.top, right - left, chartArea.bottom - chartArea.top);
            }
        });

        // ── 2. Dibujar líneas ──
        options.thresholds.forEach(threshold => {
            const color = threshold.color || DEFAULT_COLORS.neutral;
            const lineWidth = threshold.lineWidth || 1.5;
            const lineDash = threshold.lineDash || [6, 4];

            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash(lineDash);

            if (axis === 'y') {
                const y = scale.getPixelForValue(threshold.value);
                if (y < chartArea.top || y > chartArea.bottom) {
                    return; // Fuera del rango visible
                }

                ctx.beginPath();
                ctx.moveTo(chartArea.left, y);
                ctx.lineTo(chartArea.right, y);
                ctx.stroke();

                // Label
                if (threshold.showLabel !== false && threshold.label) {
                    drawLabel(ctx, threshold, chartArea, y, 'y');
                }
            } else {
                const x = scale.getPixelForValue(threshold.value);
                if (x < chartArea.left || x > chartArea.right) {
                    return;
                }

                ctx.beginPath();
                ctx.moveTo(x, chartArea.top);
                ctx.lineTo(x, chartArea.bottom);
                ctx.stroke();

                if (threshold.showLabel !== false && threshold.label) {
                    drawLabel(ctx, threshold, chartArea, x, 'x');
                }
            }
        });

        ctx.restore();
    }
};

function drawLabel(
    ctx: CanvasRenderingContext2D,
    threshold: ThresholdLine,
    chartArea: { left: number; right: number; top: number; bottom: number },
    pixel: number,
    axis: 'y' | 'x'
): void {
    const label = threshold.label!;
    const color = threshold.color || DEFAULT_COLORS.neutral;
    const position = threshold.labelPosition || 'right';

    ctx.setLineDash([]);
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    const textMetrics = ctx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = 12;
    const padX = 6;
    const padY = 3;

    let x: number, y: number;

    if (axis === 'y') {
        y = pixel - textHeight / 2 - padY;

        switch (position) {
            case 'left':
                x = chartArea.left + 4;
                break;
            case 'center':
                x = (chartArea.left + chartArea.right) / 2 - textWidth / 2 - padX;
                break;
            default: // right
                x = chartArea.right - textWidth - padX * 2 - 4;
        }
    } else {
        x = pixel - textWidth / 2 - padX;
        y = chartArea.top + 4;
    }

    // Background pill
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const pillWidth = textWidth + padX * 2;
    const pillHeight = textHeight + padY * 2;
    const radius = 4;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + pillWidth - radius, y);
    ctx.quadraticCurveTo(x + pillWidth, y, x + pillWidth, y + radius);
    ctx.lineTo(x + pillWidth, y + pillHeight - radius);
    ctx.quadraticCurveTo(x + pillWidth, y + pillHeight, x + pillWidth - radius, y + pillHeight);
    ctx.lineTo(x + radius, y + pillHeight);
    ctx.quadraticCurveTo(x, y + pillHeight, x, y + pillHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x + padX, y + padY);
}

// ─── Helper: registrar el plugin globalmente ──────────────────────────────────

let registered = false;

export function registerThresholdPlugin(): void {
    if (!registered) {
        Chart.register(thresholdPlugin);
        registered = true;
    }
}

// ─── Helper: crear configuración de umbrales predefinidos ─────────────────────

export class ThresholdPresets {

    /** Umbrales para puntajes de test (0-100) */
    static testScores(): ThresholdLine[] {
        return [
            {
                value: 90, label: 'Excelente', color: DEFAULT_COLORS.success,
                lineDash: [8, 4], zoneColor: 'rgba(34,197,94,0.04)'
            },
            {
                value: 70, label: 'Bueno', color: DEFAULT_COLORS.info,
                lineDash: [6, 4], zoneColor: 'rgba(59,130,246,0.04)'
            },
            {
                value: 50, label: 'Mínimo aceptable', color: DEFAULT_COLORS.warning,
                lineDash: [6, 4], zoneColor: 'rgba(245,158,11,0.04)'
            },
            {
                value: 0, label: '', color: 'transparent', showLabel: false,
                zoneColor: 'rgba(239,68,68,0.04)'
            }
        ];
    }

    /** Umbrales para sentimiento (-1 a +1) */
    static sentiment(): ThresholdLine[] {
        return [
            {
                value: 0.5, label: 'Positivo', color: DEFAULT_COLORS.success,
                zoneColor: 'rgba(34,197,94,0.05)'
            },
            {
                value: -0.5, label: 'Negativo', color: DEFAULT_COLORS.danger,
                zoneColor: 'rgba(239,68,68,0.05)'
            },
            {
                value: 0, label: 'Neutral', color: DEFAULT_COLORS.neutral,
                lineWidth: 1, lineDash: [3, 3]
            }
        ];
    }

    /** Umbral simple de meta/objetivo */
    static target(value: number, label: string = 'Meta'): ThresholdLine[] {
        return [{
            value, label, color: DEFAULT_COLORS.info,
            lineWidth: 2, lineDash: [10, 5]
        }];
    }

    /** Rango aceptable (min-max) */
    static range(min: number, max: number, label: string = 'Rango aceptable'): ThresholdLine[] {
        return [
            {
                value: max, label: `${label} (máx)`, color: DEFAULT_COLORS.success,
                lineDash: [6, 4], zoneColor: 'rgba(34,197,94,0.06)'
            },
            {
                value: min, label: `${label} (mín)`, color: DEFAULT_COLORS.warning,
                lineDash: [6, 4]
            }
        ];
    }
}
