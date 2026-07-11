import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ExportFormatType = 'pdf' | 'excel' | 'csv' | 'png' | 'full-report';

export interface ExportClickEvent {
    format: ExportFormatType;
    source: string;
}

@Component({
    selector: 'app-export-button',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="eb-container">
      <button
        class="eb-trigger"
        [class.eb-trigger-compact]="compact"
        [class.eb-loading]="loading"
        (click)="toggleMenu($event)"
        [disabled]="loading"
      >
        <svg *ngIf="!loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eb-icon">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <svg *ngIf="loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eb-icon eb-spin">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <span *ngIf="!compact" class="eb-label">{{ loading ? 'Exportando...' : label }}</span>
        <svg *ngIf="!compact && !loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="eb-chevron" [class.eb-chevron-open]="isOpen">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="eb-dropdown" *ngIf="isOpen" (click)="$event.stopPropagation()">
        <button class="eb-option" *ngIf="showPDF" (click)="emitExport('pdf')">
          <span class="eb-opt-icon eb-opt-pdf">📄</span>
          <div class="eb-opt-info">
            <span class="eb-opt-title">PDF</span>
            <span class="eb-opt-desc">Informe con tablas y gráficas</span>
          </div>
        </button>
        <button class="eb-option" *ngIf="showExcel" (click)="emitExport('excel')">
          <span class="eb-opt-icon eb-opt-excel">📊</span>
          <div class="eb-opt-info">
            <span class="eb-opt-title">Excel (.xlsx)</span>
            <span class="eb-opt-desc">Hojas de cálculo con datos</span>
          </div>
        </button>
        <button class="eb-option" *ngIf="showCSV" (click)="emitExport('csv')">
          <span class="eb-opt-icon eb-opt-csv">📋</span>
          <div class="eb-opt-info">
            <span class="eb-opt-title">CSV</span>
            <span class="eb-opt-desc">Texto delimitado por comas</span>
          </div>
        </button>
        <button class="eb-option" *ngIf="showPNG" (click)="emitExport('png')">
          <span class="eb-opt-icon eb-opt-png">🖼️</span>
          <div class="eb-opt-info">
            <span class="eb-opt-title">Imagen (PNG)</span>
            <span class="eb-opt-desc">Captura de la gráfica actual</span>
          </div>
        </button>
        <div class="eb-divider" *ngIf="showFullReport"></div>
        <button class="eb-option eb-option-premium" *ngIf="showFullReport" (click)="emitExport('full-report')">
          <span class="eb-opt-icon">🚀</span>
          <div class="eb-opt-info">
            <span class="eb-opt-title">Informe Completo</span>
            <span class="eb-opt-desc">PDF con gráficas + datos tabulares</span>
          </div>
        </button>
      </div>
    </div>
  `,
    styles: [`
    :host { display: inline-block; position: relative; }

    .eb-container { position: relative; }

    .eb-trigger {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 18px; border-radius: 10px;
      border: 1px solid #e2e8f0; background: #fff;
      color: #1e293b; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.2s ease;
      font-family: inherit;
    }
    .eb-trigger:hover:not(:disabled) {
      background: #0f172a; color: #fff; border-color: #0f172a;
    }
    .eb-trigger:hover:not(:disabled) .eb-icon,
    .eb-trigger:hover:not(:disabled) .eb-chevron { stroke: #fff; }

    .eb-trigger:disabled {
      opacity: 0.6; cursor: not-allowed;
    }

    .eb-trigger-compact { padding: 8px 12px; }
    .eb-trigger-compact .eb-label { display: none; }

    .eb-icon { width: 16px; height: 16px; flex-shrink: 0; }
    .eb-chevron {
      width: 14px; height: 14px; flex-shrink: 0;
      transition: transform 0.2s ease;
    }
    .eb-chevron-open { transform: rotate(180deg); }

    .eb-spin { animation: ebSpin 1s linear infinite; }
    @keyframes ebSpin { to { transform: rotate(360deg); } }

    .eb-loading { background: #f8fafc; }

    /* ── Dropdown ── */
    .eb-dropdown {
      position: absolute; top: calc(100% + 6px); right: 0;
      width: 260px; background: #fff;
      border-radius: 14px; border: 1px solid #e8ecf1;
      box-shadow: 0 12px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04);
      padding: 6px; z-index: 100;
      animation: ebDropIn 0.2s ease;
    }
    @keyframes ebDropIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .eb-option {
      display: flex; align-items: center; gap: 12px;
      width: 100%; padding: 10px 12px; border-radius: 10px;
      border: none; background: transparent;
      cursor: pointer; transition: all 0.15s ease;
      text-align: left; font-family: inherit;
    }
    .eb-option:hover {
      background: #f8fafc;
    }

    .eb-opt-icon {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
      background: #f1f5f9;
    }
    .eb-opt-pdf { background: rgba(239,68,68,0.08); }
    .eb-opt-excel { background: rgba(34,197,94,0.08); }
    .eb-opt-csv { background: rgba(59,130,246,0.08); }
    .eb-opt-png { background: rgba(139,92,246,0.08); }

    .eb-opt-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .eb-opt-title { font-size: 13px; font-weight: 600; color: #1e293b; }
    .eb-opt-desc { font-size: 10px; color: #94a3b8; font-weight: 500; }

    .eb-divider {
      height: 1px; background: #f1f5f9;
      margin: 4px 8px;
    }

    .eb-option-premium {
      background: linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.04));
    }
    .eb-option-premium:hover {
      background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08));
    }

    @media (max-width: 768px) {
      .eb-trigger { padding: 8px 14px; font-size: 12px; }
      .eb-dropdown { width: 240px; }
      .eb-opt-title { font-size: 12px; }
    }
  `]
})
export class ExportButtonComponent {
    @Input() label: string = 'Exportar';
    @Input() compact: boolean = false;
    @Input() loading: boolean = false;
    @Input() source: string = 'analytics';
    @Input() showPDF: boolean = true;
    @Input() showExcel: boolean = true;
    @Input() showCSV: boolean = true;
    @Input() showPNG: boolean = true;
    @Input() showFullReport: boolean = false;

    @Output() exportClick = new EventEmitter<ExportClickEvent>();

    isOpen = false;

    constructor(private elRef: ElementRef) { }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.elRef.nativeElement.contains(event.target)) {
            this.isOpen = false;
        }
    }

    toggleMenu(event: MouseEvent): void {
        event.stopPropagation();
        this.isOpen = !this.isOpen;
    }

    emitExport(format: ExportFormatType): void {
        this.isOpen = false;
        this.exportClick.emit({ format, source: this.source });
    }
}
