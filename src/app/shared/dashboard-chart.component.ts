import { Component, Input, OnDestroy, ElementRef, ViewChild, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
    selector: 'app-dashboard-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="canvas-container" [style.height]="height">
      <canvas #chartCanvas></canvas>
    </div>
  `,
    styles: [`
    .canvas-container {
      position: relative; 
      width: 100%; 
    }
    canvas {
      width: 100% !important;
    }
  `]
})
export class DashboardChartComponent implements AfterViewInit, OnDestroy, OnChanges {
    @Input() type: ChartType = 'bar';
    @Input() data: any;
    @Input() options: any = { responsive: true, maintainAspectRatio: false };
    @Input() height: string = '280px';

    @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

    private chart: Chart | null = null;
    private initialized = false;

    ngAfterViewInit(): void {
        this.initialized = true;
        // Use rAF + small delay to ensure canvas has layout dimensions
        requestAnimationFrame(() => {
            setTimeout(() => this.initChart(), 50);
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.initialized) return;
        if ((changes['data'] && !changes['data'].isFirstChange()) ||
            (changes['type'] && !changes['type'].isFirstChange()) ||
            (changes['options'] && !changes['options'].isFirstChange())) {
            requestAnimationFrame(() => this.initChart());
        }
    }

    ngOnDestroy(): void {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    private initChart(): void {
        if (!this.chartCanvas?.nativeElement) return;

        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        if (!this.data || !this.data.datasets || this.data.datasets.length === 0) {
            return;
        }

        const mergedOptions = {
            responsive: true,
            maintainAspectRatio: false,
            ...this.options
        };

        this.chart = new Chart(this.chartCanvas.nativeElement, {
            type: this.type,
            data: this.data,
            options: mergedOptions
        });

        // Force resize to pick up correct dimensions
        this.chart.resize();
    }
}
