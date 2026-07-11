import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    SimpleChanges,
    OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface HeatmapEntry {
    date: string;       // ISO date string (YYYY-MM-DD)
    value: number;      // Intensidad (0 = vacío, 1+ = con datos)
    label?: string;     // Texto extra para tooltip
}

export interface HeatmapCellClickEvent {
    date: string;
    value: number;
    label?: string;
    dayOfWeek: number;
    weekIndex: number;
}

// ─── Paletas de color ────────────────────────────────────────────────────────

const COLOR_PALETTES: Record<string, string[]> = {
    green: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    blue: ['#ebedf0', '#b6d7f8', '#6bb5f6', '#3b82f6', '#1d4ed8'],
    purple: ['#ebedf0', '#d8b4fe', '#a78bfa', '#8b5cf6', '#6d28d9'],
    orange: ['#ebedf0', '#fed7aa', '#fdba74', '#fb923c', '#ea580c'],
    red: ['#ebedf0', '#fecaca', '#f87171', '#ef4444', '#b91c1c'],
};

const DAY_LABELS = ['', 'Lun', '', 'Mié', '', 'Vie', ''];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface CellData {
    x: number;
    y: number;
    date: string;
    value: number;
    label: string;
    color: string;
    dayOfWeek: number;
    weekIndex: number;
}

interface MonthLabel {
    text: string;
    x: number;
}

@Component({
    selector: 'app-calendar-heatmap',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Empty State -->
    <div class="heatmap-empty" *ngIf="!entries || entries.length === 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      <p>Sin registros para el mapa de calor</p>
    </div>

    <div class="heatmap-wrapper" *ngIf="entries && entries.length > 0">
      <!-- Header -->
      <div class="heatmap-header" *ngIf="showTitle">
        <span class="heatmap-total">
          <strong>{{ totalEntries }}</strong> registros en los últimos {{ weeksToShow * 7 }} días
        </span>
      </div>

      <!-- SVG Grid -->
      <div class="heatmap-scroll">
        <svg
          [attr.width]="svgWidth"
          [attr.height]="svgHeight"
          class="heatmap-svg"
        >
          <!-- Month labels -->
          <text
            *ngFor="let month of monthLabels"
            [attr.x]="month.x"
            [attr.y]="10"
            class="month-label"
          >{{ month.text }}</text>

          <!-- Day labels -->
          <text
            *ngFor="let day of dayLabelsRendered; let i = index"
            [attr.x]="padLeft - 6"
            [attr.y]="padTop + i * (cellSize + cellGap) + cellSize / 2 + 1"
            text-anchor="end"
            dominant-baseline="middle"
            class="day-label"
          >{{ day }}</text>

          <!-- Cells -->
          <rect
            *ngFor="let cell of cells"
            [attr.x]="cell.x"
            [attr.y]="cell.y"
            [attr.width]="cellSize"
            [attr.height]="cellSize"
            [attr.rx]="cellRadius"
            [attr.ry]="cellRadius"
            [attr.fill]="cell.color"
            class="heatmap-cell"
            [class.heatmap-cell-active]="cell.value > 0"
            (click)="onCellClick(cell)"
            (mouseenter)="onCellHover(cell, $event)"
            (mouseleave)="hoveredCell = null"
          >
          </rect>
        </svg>
      </div>

      <!-- Tooltip -->
      <div
        class="heatmap-tooltip"
        *ngIf="hoveredCell"
        [style.left.px]="tooltipX"
        [style.top.px]="tooltipY"
      >
        <strong>{{ formatDate(hoveredCell.date) }}</strong>
        <span *ngIf="hoveredCell.value > 0">{{ hoveredCell.value }} {{ valueLabel }}{{ hoveredCell.value !== 1 ? 's' : '' }}</span>
        <span *ngIf="hoveredCell.value === 0">Sin registros</span>
        <span *ngIf="hoveredCell.label" class="tooltip-extra">{{ hoveredCell.label }}</span>
      </div>

      <!-- Legend -->
      <div class="heatmap-legend">
        <span class="legend-text">Menos</span>
        <div
          *ngFor="let color of activePalette"
          class="legend-cell"
          [style.background]="color"
        ></div>
        <span class="legend-text">Más</span>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; position: relative; }

    .heatmap-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafbfc;
    }
    .heatmap-empty svg { width: 40px; height: 40px; color: #cbd5e1; margin-bottom: 12px; }
    .heatmap-empty p { color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500; }

    .heatmap-wrapper { width: 100%; position: relative; }

    .heatmap-header {
      margin-bottom: 12px;
    }
    .heatmap-total {
      font-size: 13px; color: #64748b; font-weight: 500;
    }
    .heatmap-total strong { color: #1e293b; font-weight: 800; }

    .heatmap-scroll {
      overflow-x: auto; overflow-y: hidden;
      scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent;
      padding-bottom: 4px;
    }
    .heatmap-scroll::-webkit-scrollbar { height: 6px; }
    .heatmap-scroll::-webkit-scrollbar-track { background: transparent; }
    .heatmap-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }

    .heatmap-svg { display: block; }

    .month-label {
      font-size: 10px; fill: #94a3b8; font-weight: 600;
    }
    .day-label {
      font-size: 9px; fill: #94a3b8; font-weight: 500;
    }

    .heatmap-cell {
      cursor: pointer;
      transition: stroke 0.15s ease, filter 0.15s ease;
      stroke: transparent;
      stroke-width: 1;
    }
    .heatmap-cell:hover {
      stroke: rgba(15,23,42,0.3);
      filter: brightness(0.92);
    }
    .heatmap-cell-active:hover {
      filter: brightness(1.1);
    }

    .heatmap-tooltip {
      position: fixed;
      background: rgba(15,23,42,0.92);
      color: #f8fafc;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      pointer-events: none;
      z-index: 9999;
      display: flex; flex-direction: column; gap: 2px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      white-space: nowrap;
    }
    .heatmap-tooltip strong { font-size: 12px; font-weight: 700; }
    .tooltip-extra { color: #94a3b8; font-size: 10px; }

    .heatmap-legend {
      display: flex; align-items: center; gap: 4px;
      justify-content: flex-end;
      margin-top: 12px;
    }
    .legend-text { font-size: 10px; color: #94a3b8; font-weight: 500; margin: 0 4px; }
    .legend-cell {
      width: 12px; height: 12px; border-radius: 2px;
    }
  `]
})
export class CalendarHeatmapComponent implements OnChanges, OnDestroy {

    // ── Inputs ──
    @Input() entries: HeatmapEntry[] = [];
    @Input() weeksToShow: number = 52;
    @Input() palette: 'green' | 'blue' | 'purple' | 'orange' | 'red' = 'green';
    @Input() cellSize: number = 13;
    @Input() cellGap: number = 3;
    @Input() cellRadius: number = 2;
    @Input() valueLabel: string = 'registro';
    @Input() showTitle: boolean = true;

    // ── Outputs ──
    @Output() cellClicked = new EventEmitter<HeatmapCellClickEvent>();

    // ── Internal State ──
    cells: CellData[] = [];
    monthLabels: MonthLabel[] = [];
    dayLabelsRendered = DAY_LABELS;
    activePalette: string[] = COLOR_PALETTES['green'];
    hoveredCell: CellData | null = null;
    tooltipX = 0;
    tooltipY = 0;
    totalEntries = 0;

    padLeft = 34;
    padTop = 20;
    svgWidth = 800;
    svgHeight = 140;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['entries'] || changes['weeksToShow'] || changes['palette'] || changes['cellSize'] || changes['cellGap']) {
            this.activePalette = COLOR_PALETTES[this.palette] || COLOR_PALETTES['green'];
            this.computeGrid();
        }
    }

    ngOnDestroy(): void {
        this.hoveredCell = null;
    }

    onCellClick(cell: CellData): void {
        this.cellClicked.emit({
            date: cell.date,
            value: cell.value,
            label: cell.label || undefined,
            dayOfWeek: cell.dayOfWeek,
            weekIndex: cell.weekIndex
        });
    }

    onCellHover(cell: CellData, event: MouseEvent): void {
        this.hoveredCell = cell;
        this.tooltipX = event.clientX + 12;
        this.tooltipY = event.clientY - 40;
    }

    formatDate(dateStr: string): string {
        try {
            const d = new Date(dateStr + 'T12:00:00');
            const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
            return d.toLocaleDateString('es-ES', options);
        } catch (e) {
            return dateStr;
        }
    }

    // ── Layout ──

    private computeGrid(): void {
        if (!this.entries) {
            this.cells = [];
            return;
        }

        const step = this.cellSize + this.cellGap;

        // Build date→value map
        const valueMap = new Map<string, { value: number; label: string }>();
        let total = 0;
        this.entries.forEach(e => {
            const key = e.date.substring(0, 10); // YYYY-MM-DD
            const existing = valueMap.get(key);
            const val = (existing?.value || 0) + e.value;
            valueMap.set(key, { value: val, label: e.label || existing?.label || '' });
            total += e.value;
        });
        this.totalEntries = total;

        // Determine max value for color scaling
        const maxVal = Math.max(...Array.from(valueMap.values()).map(v => v.value), 1);

        // End date = today, start date = weeksToShow * 7 days ago
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        const totalDays = this.weeksToShow * 7;
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - totalDays + 1);

        // Align to start of week (Monday = 1)
        const startDow = startDate.getDay(); // 0=Sun
        const adjustedStart = new Date(startDate);
        const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
        adjustedStart.setDate(adjustedStart.getDate() + mondayOffset);

        // Generate cells
        const cells: CellData[] = [];
        const monthPositions = new Map<string, number>();
        const cursor = new Date(adjustedStart);
        let weekIdx = 0;

        while (cursor <= today) {
            const dow = cursor.getDay();
            // Convert Sunday=0 to index: Mon=0, Tue=1, ..., Sun=6
            const dayIndex = dow === 0 ? 6 : dow - 1;
            const dateStr = this.toDateString(cursor);

            const entry = valueMap.get(dateStr);
            const val = entry?.value || 0;

            cells.push({
                x: this.padLeft + weekIdx * step,
                y: this.padTop + dayIndex * step,
                date: dateStr,
                value: val,
                label: entry?.label || '',
                color: this.getColor(val, maxVal),
                dayOfWeek: dayIndex,
                weekIndex: weekIdx
            });

            // Track month labels
            if (cursor.getDate() <= 7 && dayIndex === 0) {
                const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
                if (!monthPositions.has(monthKey)) {
                    monthPositions.set(monthKey, this.padLeft + weekIdx * step);
                }
            }

            // Advance
            cursor.setDate(cursor.getDate() + 1);
            if (dayIndex === 6) {
                weekIdx++;
            }
        }

        // Month labels
        this.monthLabels = Array.from(monthPositions.entries()).map(([key, x]) => {
            const month = parseInt(key.split('-')[1]);
            return { text: MONTH_LABELS[month], x };
        });

        this.cells = cells;
        this.svgWidth = this.padLeft + (weekIdx + 1) * step + 10;
        this.svgHeight = this.padTop + 7 * step + 4;
    }

    private getColor(value: number, maxValue: number): string {
        if (value === 0) return this.activePalette[0];
        const ratio = value / maxValue;
        if (ratio <= 0.25) return this.activePalette[1];
        if (ratio <= 0.5) return this.activePalette[2];
        if (ratio <= 0.75) return this.activePalette[3];
        return this.activePalette[4];
    }

    private toDateString(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
}
