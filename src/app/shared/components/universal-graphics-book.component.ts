import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DashboardChartComponent } from '../dashboard-chart.component';
import { UiStateService } from '../services/ui-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-universal-graphics-book',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardChartComponent],
  template: `
    <div class="gb">
      <!-- Header -->
      <div class="gb-head">
        <div class="gb-head-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" class="gb-icon"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
          <div>
            <h3 class="gb-title">Libro de Gráficas</h3>
            <p class="gb-sub" *ngIf="!bookGenerated && !loading">Selecciona las preguntas que deseas visualizar · <strong style="color: #7c3aed;">{{ rawResponses.length }} {{ isSurvey() ? 'encuestas' : 'evaluaciones' }} presentadas</strong></p>
            <p class="gb-sub" *ngIf="bookGenerated">Página {{ currentPage + 1 }} de {{ pages.length }} · {{ rawResponses.length }} respuestas</p>
          </div>
        </div>
        <div class="gb-head-right" *ngIf="bookGenerated">
          <button class="gb-btn gb-btn-share" (click)="shareBook()" title="Compartir enlace">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            Compartir
          </button>
          <button class="gb-btn" (click)="backToSelection()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Editar
          </button>
        </div>
      </div>

      <!-- Share banner -->
      <div class="gb-share" *ngIf="shareLink">
        <input type="text" [value]="shareLink" readonly class="gb-share-input" #shareInput (click)="shareInput.select()">
        <button class="gb-copy" (click)="copyShareLink()">Copiar</button>
      </div>

      <!-- Loading -->
      <div class="gb-state" *ngIf="loading">
        <div class="gb-spinner"></div>
        <span>Cargando preguntas...</span>
      </div>

      <!-- ═══ PASO 1: Selección de preguntas ═══ -->
      <div *ngIf="!loading && !bookGenerated" class="gb-selection">

        <!-- Chart type selector -->
        <div class="gb-type-row">
          <span class="gb-type-label">Tipo de gráfico:</span>
          <div class="gb-types">
            <button *ngFor="let t of chartTypes" class="gb-type" [class.active]="selectedChartType === t.value" (click)="selectedChartType = t.value">{{ t.label }}</button>
          </div>
        </div>

        <!-- Select controls -->
        <div class="gb-select-bar">
          <button class="gb-link" (click)="selectAll()">Seleccionar todas</button>
          <span class="gb-divider">|</span>
          <button class="gb-link" (click)="deselectAll()">Ninguna</button>
          <span class="gb-count">{{ selectedCount }} seleccionadas</span>
        </div>

        <!-- Checkbox list -->
        <div class="gb-list">
          <label *ngFor="let q of metricOptions; let i = index" class="gb-item" [class.checked]="q.selected">
            <input type="checkbox" [(ngModel)]="q.selected" class="gb-check">
            <span class="gb-item-num">{{ i + 1 }}</span>
            <span class="gb-item-text">{{ q.label }}</span>
          </label>
        </div>

        <!-- Generate button -->
        <button class="gb-generate" [disabled]="selectedCount === 0" (click)="generateBook()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
          Generar Libro ({{ selectedCount }} {{ selectedCount === 1 ? 'gráfica' : 'gráficas' }})
        </button>
      </div>

      <!-- ═══ PASO 2: Libro generado con paginación ═══ -->
      <div *ngIf="!loading && bookGenerated" class="gb-book-layout">

        <!-- LEFT: Chart + Navigation -->
        <div class="gb-book-main">

          <!-- Page header -->
          <div class="gb-page-header">
            <span class="gb-page-num">{{ currentPage + 1 }} / {{ pages.length }}</span>
            <h4 class="gb-page-title">{{ pages[currentPage]?.label }}</h4>
          </div>

          <!-- Chart -->
          <div class="gb-chart">
            <app-dashboard-chart
              [type]="selectedChartType"
              [data]="pages[currentPage]?.chartData"
              [options]="pages[currentPage]?.chartOptions"
              [height]="'380px'"
            ></app-dashboard-chart>
          </div>

          <!-- Navigation -->
          <div class="gb-nav">
            <button class="gb-nav-btn" [disabled]="currentPage === 0" (click)="prevPage()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="15 18 9 12 15 6"></polyline></svg>
              Anterior
            </button>
            <div class="gb-dots">
              <button *ngFor="let p of pages; let i = index" class="gb-dot" [class.active]="i === currentPage" (click)="currentPage = i"></button>
            </div>
            <button class="gb-nav-btn" [disabled]="currentPage === pages.length - 1" (click)="nextPage()">
              Siguiente
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>

        </div>

        <!-- RIGHT: Design Editor Panel -->
        <aside class="gb-editor">
          <div class="gb-editor-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>Editor de Diseño</span>
          </div>

          <!-- Chart Type -->
          <div class="gb-editor-section">
            <label class="gb-editor-label">Tipo de gráfico</label>
            <div class="gb-editor-types">
              <button *ngFor="let t of chartTypes" class="gb-type" [class.active]="selectedChartType === t.value" (click)="changeChartType(t.value)">{{ t.label }}</button>
            </div>
          </div>

          <!-- Color -->
          <div class="gb-editor-section">
            <label class="gb-editor-label">Color del reporte</label>
            <p class="gb-editor-desc">Este color se usará como acento visual en el informe que compartas.</p>
            <div class="gb-color-row">
              <button *ngFor="let c of presetColors" class="gb-color-swatch" [style.background]="c" [class.active]="customColor === c" (click)="customColor = c"></button>
              <input type="color" [(ngModel)]="customColor" class="gb-color-picker">
            </div>
            <div class="gb-color-preview" [style.background]="customColor + '15'" [style.borderColor]="customColor + '30'">
              <div class="gb-color-dot" [style.background]="customColor"></div>
              <span [style.color]="customColor">{{ customCompany || 'Tu Empresa' }}</span>
            </div>
          </div>

          <!-- Company name -->
          <div class="gb-editor-section">
            <label class="gb-editor-label">Nombre empresa</label>
            <input type="text" [(ngModel)]="customCompany" placeholder="Mi Empresa" class="gb-custom-input">
          </div>

          <!-- Hint -->
          <div class="gb-editor-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;flex-shrink:0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Estos ajustes definen el diseño del reporte que se genera al hacer clic en "Compartir".
          </div>
        </aside>

      </div>
    </div>
  `,
  styles: [`
    .gb {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
      padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.03);
    }
    .gb-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 18px; gap: 12px; flex-wrap: wrap;
    }
    .gb-head-left { display: flex; align-items: center; gap: 10px; }
    .gb-icon { width: 22px; height: 22px; flex-shrink: 0; }
    .gb-title { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
    .gb-sub { margin: 2px 0 0; font-size: 11px; color: #94a3b8; font-weight: 500; }
    .gb-head-right { display: flex; gap: 6px; }
    .gb-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600;
      cursor: pointer; border: 1px solid #e2e8f0; background: #fff; color: #64748b;
      transition: all 0.15s;
    }
    .gb-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
    .gb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .gb-btn-pdf { background: rgba(239,68,68,0.04); border-color: rgba(239,68,68,0.2); color: #dc2626; }
    .gb-btn-pdf:hover:not(:disabled) { background: rgba(239,68,68,0.08); }
    .gb-btn-share { background: rgba(139,92,246,0.04); border-color: rgba(139,92,246,0.2); color: #7c3aed; }
    .gb-btn-share:hover:not(:disabled) { background: rgba(139,92,246,0.08); }
    .gb-share {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15);
      border-radius: 10px; margin-bottom: 14px;
    }
    .gb-share-input {
      flex: 1; background: transparent; border: none; outline: none;
      font-size: 11px; color: #059669; font-weight: 500; font-family: monospace;
    }
    .gb-copy {
      padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 700;
      background: rgba(16,185,129,0.12); color: #059669; border: none; cursor: pointer;
    }

    /* Step 1: Selection */
    .gb-type-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;
    }
    .gb-type-label { font-size: 12px; font-weight: 600; color: #64748b; }
    .gb-types { display: flex; gap: 3px; }
    .gb-type {
      padding: 5px 12px; border-radius: 7px; font-size: 11px; font-weight: 600;
      background: #f8fafc; color: #94a3b8; border: 1px solid #f1f5f9;
      cursor: pointer; transition: all 0.15s;
    }
    .gb-type.active {
      background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.25); color: #7c3aed;
    }
    .gb-select-bar {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    }
    .gb-link {
      background: none; border: none; font-size: 11px; font-weight: 600;
      color: #8b5cf6; cursor: pointer; padding: 0;
    }
    .gb-link:hover { text-decoration: underline; }
    .gb-divider { color: #e2e8f0; font-size: 10px; }
    .gb-count {
      margin-left: auto; font-size: 11px; font-weight: 600; color: #94a3b8;
    }
    .gb-list {
      max-height: 280px; overflow-y: auto; border: 1px solid #f1f5f9;
      border-radius: 10px; margin-bottom: 16px;
    }
    .gb-list::-webkit-scrollbar { width: 4px; }
    .gb-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
    .gb-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border-bottom: 1px solid #f8fafc; cursor: pointer; transition: background 0.1s;
      font-size: 13px; color: #334155;
    }
    .gb-item:last-child { border-bottom: none; }
    .gb-item:hover { background: #fafbfc; }
    .gb-item.checked { background: rgba(139,92,246,0.03); }
    .gb-check {
      width: 16px; height: 16px; accent-color: #8b5cf6; cursor: pointer; flex-shrink: 0;
    }
    .gb-item-num {
      width: 22px; height: 22px; border-radius: 6px; display: flex;
      align-items: center; justify-content: center; font-size: 10px;
      font-weight: 700; background: #f1f5f9; color: #64748b; flex-shrink: 0;
    }
    .gb-item.checked .gb-item-num { background: rgba(139,92,246,0.1); color: #7c3aed; }
    .gb-item-text { flex: 1; line-height: 1.3; }
    .gb-generate {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px; border-radius: 10px; font-size: 13px; font-weight: 700;
      background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff;
      border: none; cursor: pointer; transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(139,92,246,0.2);
    }
    .gb-generate:disabled { opacity: 0.4; cursor: not-allowed; }
    .gb-generate:hover:not(:disabled) { filter: brightness(1.05); transform: translateY(-1px); }

    /* Step 2: Book - Two Column Layout */
    .gb-book-layout {
      display: grid; grid-template-columns: 1fr 155px; gap: 12px;
    }
    .gb-book-main { min-width: 0; }
    .gb-page-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
    }
    .gb-page-num {
      padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 700;
      background: rgba(139,92,246,0.08); color: #7c3aed;
    }
    .gb-page-title {
      margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;
      flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .gb-chart {
      background: #fafbfc; border-radius: 12px; border: 1px solid #f1f5f9;
      padding: 16px; min-height: 260px;
    }
    .gb-chart app-dashboard-chart { width: 100%; }
    .gb-nav {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 16px; gap: 8px;
    }
    .gb-nav-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600;
      background: #fff; color: #64748b; border: 1px solid #e2e8f0;
      cursor: pointer; transition: all 0.15s;
    }
    .gb-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .gb-nav-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
    .gb-dots {
      display: flex; gap: 5px; flex-wrap: wrap; justify-content: center;
    }
    .gb-dot {
      width: 8px; height: 8px; border-radius: 50%; border: none; cursor: pointer;
      background: #e2e8f0; transition: all 0.2s; padding: 0;
    }
    .gb-dot.active { background: #8b5cf6; transform: scale(1.3); }

    /* ─── Design Editor Panel ─── */
    .gb-editor {
      background: linear-gradient(180deg, #faf8ff 0%, #f8fafc 100%);
      border: 1px solid #ede9fe; border-radius: 14px; padding: 18px;
      position: sticky; top: 24px; align-self: start;
      display: flex; flex-direction: column; gap: 16px;
    }
    .gb-editor-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 700; color: #6d28d9;
      padding-bottom: 12px; border-bottom: 1px solid #ede9fe;
    }
    .gb-editor-section { display: flex; flex-direction: column; gap: 8px; }
    .gb-editor-label {
      font-size: 10px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .gb-editor-types { display: flex; gap: 3px; flex-wrap: wrap; }
    .gb-editor-desc { font-size: 9px; color: #a5b4c6; line-height: 1.3; margin: 0; }
    .gb-editor-hint {
      display: flex; align-items: flex-start; gap: 6px;
      font-size: 9px; color: #a5b4c6; line-height: 1.3;
      padding: 8px; background: rgba(139,92,246,0.04);
      border-radius: 8px; border: 1px solid rgba(139,92,246,0.08);
    }
    .gb-color-preview {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 8px; border-radius: 8px;
      border: 1px solid; font-size: 10px; font-weight: 600;
      transition: all 0.2s;
    }
    .gb-color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

    .gb-color-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .gb-color-swatch {
      width: 24px; height: 24px; border-radius: 7px; border: 2px solid transparent;
      cursor: pointer; transition: all 0.15s;
    }
    .gb-color-swatch.active { border-color: #0f172a; transform: scale(1.15); }
    .gb-color-swatch:hover { transform: scale(1.1); }
    .gb-color-picker {
      width: 24px; height: 24px; border: none; padding: 0; cursor: pointer;
      border-radius: 6px; background: none;
    }
    .gb-custom-input {
      padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 11px; color: #334155; outline: none; transition: border-color 0.15s;
      font-family: inherit; width: 100%; box-sizing: border-box;
    }
    .gb-custom-input:focus { border-color: #8b5cf6; }
    .gb-custom-input::placeholder { color: #cbd5e1; }
    .gb-logo-preview {
      width: 100%; max-width: 120px; height: 36px; object-fit: contain; border-radius: 6px;
      background: #fff; border: 1px solid #f1f5f9; padding: 4px;
    }

    /* States */
    .gb-state {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      color: #94a3b8; font-size: 12px; text-align: center; padding: 40px 20px;
    }
    .gb-spinner {
      width: 28px; height: 28px; border: 2.5px solid #f1f5f9;
      border-top-color: #8b5cf6; border-radius: 50%;
      animation: gspin 0.7s linear infinite;
    }
    @keyframes gspin { 100% { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .gb { padding: 16px; border-radius: 14px; }
      .gb-book-layout { grid-template-columns: 1fr; }
      .gb-editor { position: static; }
      .gb-type-row { flex-direction: column; align-items: flex-start; }
      .gb-nav { flex-direction: column; }
      .gb-page-title { white-space: normal; }
    }
  `]
})
export class UniversalGraphicsBookComponent implements OnInit, OnChanges, OnDestroy {
  @Input() instrumentId = '';
  @Input() instrumentType: 'test' | 'survey' | 'battery' | 'simulator' = 'test';
  @Input() instrumentName = '';
  @Output() bookModeChange = new EventEmitter<boolean>();
  @Output() shareRequest = new EventEmitter<{ instrumentId: string; instrumentType: string; instrumentName: string; brandColor: string; brandName: string }>();

  loading = false;
  bookGenerated = false;
  currentPage = 0;
  generatingPdf = false;
  shareLink = '';
  private _exitSub?: Subscription;
  showCustomize = false;
  customColor = '#8b5cf6';
  customLogo = '';
  customCompany = '';
  presetColors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  selectedChartType: 'bar' | 'pie' | 'doughnut' | 'line' = 'bar';
  chartTypes = [
    { value: 'bar' as const, label: 'Barras' },
    { value: 'pie' as const, label: 'Torta' },
    { value: 'doughnut' as const, label: 'Dona' },
    { value: 'line' as const, label: 'Línea' }
  ];

  metricOptions: { id: string; label: string; data?: any; selected: boolean }[] = [];
  pages: { label: string; chartData: any; chartOptions: any }[] = [];

  rawResponses: any[] = [];
  private rawQuestions: any[] = [];

  private readonly COLORS = [
    '#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b',
    '#ef4444','#ec4899','#6366f1','#14b8a6','#f97316'
  ];

  get selectedCount(): number { return this.metricOptions.filter(o => o.selected).length; }

  constructor(private http: HttpClient, private uiState: UiStateService) {}

  ngOnInit(): void {
    if (this.instrumentId) this.loadData();
    // Listen for shell's floating back button
    this._exitSub = this.uiState.exitFocusMode$.subscribe(() => {
      if (this.bookGenerated) {
        this.backToSelection();
      }
    });
  }

  ngOnDestroy(): void {
    this._exitSub?.unsubscribe();
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['instrumentId'] && !ch['instrumentId'].isFirstChange()) {
      this.bookGenerated = false;
      this.currentPage = 0;
      this.pages = [];
      this.loadData();
    }
  }

  isSurvey(): boolean { return this.instrumentType === 'survey'; }

  selectAll(): void { this.metricOptions.forEach(o => o.selected = true); }
  deselectAll(): void { this.metricOptions.forEach(o => o.selected = false); }

  // ─── LOAD ──────────────────────────────────────────────
  private loadData(): void {
    if (!this.instrumentId) return;
    this.loading = true;
    this.metricOptions = [];

    this.http.get<any>(`/api/test/${this.instrumentId}`).subscribe({
      next: (doc) => {
        const pregs = (doc?.datos?.preguntas || doc?.data?.preguntas || doc?.preguntas || [])
          .filter((p: any) => p.tipo !== 'system_settings' && p.typeId !== 'system_settings' &&
            p.id !== 'SYSTEM_SETTINGS' && p.text !== 'SYSTEM_SETTINGS' && p.textoPregunta !== 'SYSTEM_SETTINGS');
        this.rawQuestions = pregs;

        this.http.get<any>(`/api/export/responses-full?instrumentId=${this.instrumentId}`).subscribe({
          next: (res) => {
            this.rawResponses = (res?.data || []).filter((r: any) => r.estado === 'Finalizado');
            this.buildOptions();
            this.loading = false;
          },
          error: () => { this.loading = false; this.buildOptions(); }
        });
      },
      error: () => { this.loading = false; }
    });
  }

  private buildOptions(): void {
    this.metricOptions = [];
    if (this.isSurvey()) {
      this.rawQuestions.forEach((q, i) => {
        const label = q.textoPregunta || q.text || q.label || `Pregunta ${i + 1}`;
        this.metricOptions.push({ id: q.id || q._id || `q${i}`, label, data: q, selected: false });
      });
    } else {
      this.metricOptions.push({ id: 'score_ranking', label: 'Ranking de Puntajes', selected: false });
      this.metricOptions.push({ id: 'score_distribution', label: 'Distribución de Rendimiento', selected: false });
      this.rawQuestions.forEach((q, i) => {
        const label = q.textoPregunta || q.text || q.label || `Pregunta ${i + 1}`;
        this.metricOptions.push({ id: q.id || q._id || `q${i}`, label, data: q, selected: false });
      });
    }
  }

  // ─── GENERATE BOOK ────────────────────────────────────
  generateBook(): void {
    const selected = this.metricOptions.filter(o => o.selected);
    if (selected.length === 0) return;

    this.pages = selected.map((opt, idx) => {
      const numLabel = `${idx + 1}. ${opt.label}`;

      if (opt.id === 'score_ranking') return { label: numLabel, ...this.buildScoreRanking() };
      if (opt.id === 'score_distribution') return { label: numLabel, ...this.buildScoreDistribution() };
      return { label: numLabel, ...this.buildQuestionFrequency(opt) };
    });

    this.currentPage = 0;
    this.bookGenerated = true;
    this.bookModeChange.emit(true);
  }

  backToSelection(): void {
    this.bookGenerated = false;
    this.bookModeChange.emit(false);
    this.currentPage = 0;
    this.pages = [];
  }

  prevPage(): void { if (this.currentPage > 0) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.pages.length - 1) this.currentPage++; }

  changeChartType(type: 'bar' | 'pie' | 'doughnut' | 'line'): void {
    this.selectedChartType = type;
    // Regenerate pages with new chart type for live preview
    const savedPage = this.currentPage;
    this.generateBook();
    this.currentPage = Math.min(savedPage, this.pages.length - 1);
  }

  // ─── BUILD CHARTS ──────────────────────────────────────
  private buildQuestionFrequency(opt: any): { chartData: any; chartOptions: any } {
    const idx = this.metricOptions.findIndex(o => o.id === opt.id);
    const freq: Record<string, number> = {};

    this.rawResponses.forEach(r => {
      if (!r.resultadosCompletos || !Array.isArray(r.resultadosCompletos)) return;
      let m = r.resultadosCompletos.find((a: any) => String(a.questionId) === String(opt.id));
      if (!m && idx >= 0 && idx < r.resultadosCompletos.length) m = r.resultadosCompletos[idx];
      if (m) {
        let v = m.value != null ? String(m.value) : 'Sin respuesta';
        v = this.resolveLabel(opt.data, v);
        freq[v] = (freq[v] || 0) + 1;
      }
    });

    const labels = Object.keys(freq);
    const data = Object.values(freq);
    return this.makeChart(labels, data, 'Respuestas', 'Frecuencia');
  }

  private buildScoreRanking(): { chartData: any; chartOptions: any } {
    const labels = this.rawResponses.map((r, i) => r.datosFormulario?.nombre || r.nombreCandidato || `#${i + 1}`);
    const data = this.rawResponses.map(r => r.puntaje || 0);
    return this.makeChart(labels, data, 'Puntaje', 'Puntaje');
  }

  private buildScoreDistribution(): { chartData: any; chartOptions: any } {
    const d = { ex: 0, bu: 0, re: 0, ba: 0 };
    this.rawResponses.forEach(r => {
      const p = r.puntaje || 0;
      if (p >= 90) d.ex++; else if (p >= 70) d.bu++; else if (p >= 50) d.re++; else d.ba++;
    });
    return this.makeChart(
      ['Excelente (90+)', 'Bueno (70-89)', 'Regular (50-69)', 'Bajo (0-49)'],
      [d.ex, d.bu, d.re, d.ba], 'Candidatos', 'Cantidad'
    );
  }

  private makeChart(labels: string[], data: number[], dsLabel: string, yLabel: string): { chartData: any; chartOptions: any } {
    const isPie = this.selectedChartType === 'pie' || this.selectedChartType === 'doughnut';
    return {
      chartData: {
        labels,
        datasets: [{
          label: dsLabel, data,
          backgroundColor: isPie ? labels.map((_, i) => this.COLORS[i % this.COLORS.length]) : labels.map((_, i) => this.COLORS[i % this.COLORS.length] + '80'),
          borderColor: labels.map((_, i) => this.COLORS[i % this.COLORS.length]),
          borderWidth: 2, borderRadius: isPie ? 0 : 6
        }]
      },
      chartOptions: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: isPie, position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } },
        scales: isPie ? {} : {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
          y: { beginAtZero: true, title: { display: true, text: yLabel, font: { size: 11, weight: '600' } }, grid: { color: 'rgba(0,0,0,0.04)' } }
        }
      }
    };
  }

  private resolveLabel(q: any, raw: string): string {
    if (!q) return raw;
    const opts = q.opciones || q.options || [];
    if (!opts.length) return raw;
    const i = parseInt(raw, 10);
    if (!isNaN(i) && i >= 0 && i < opts.length) {
      const o = opts[i];
      return typeof o === 'object' ? (o.label || o.texto || raw) : String(o);
    }
    return raw;
  }

  // ─── ACTIONS ───────────────────────────────────────────
  downloadCurrentChart(): void {
    const c = document.querySelector('.gb-chart canvas') as HTMLCanvasElement;
    if (!c) return;
    const a = document.createElement('a');
    a.download = `grafico_${this.currentPage + 1}_${this.instrumentName.replace(/\s+/g, '_')}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  }

  async downloadFullPDF(): Promise<void> {
    if (this.generatingPdf || this.pages.length === 0) return;
    this.generatingPdf = true;
    const savedPage = this.currentPage;

    try {
      const jsPDFMod = await import('jspdf') as any;
      const pdf = new jsPDFMod.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pW = 297, pH = 210;

      for (let i = 0; i < this.pages.length; i++) {
        this.currentPage = i;
        await new Promise(r => setTimeout(r, 400));

        const canvas = document.querySelector('.gb-chart canvas') as HTMLCanvasElement;
        if (!canvas) continue;

        if (i > 0) pdf.addPage();

        // Title
        pdf.setFontSize(14);
        pdf.setTextColor(30, 41, 59);
        pdf.text(this.pages[i].label, 14, 16);

        // Sub info
        pdf.setFontSize(9);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`${this.instrumentName} · Página ${i + 1} de ${this.pages.length}`, 14, 22);

        // Chart image
        const imgData = canvas.toDataURL('image/png');
        const cW = pW - 28, cH = pH - 36;
        pdf.addImage(imgData, 'PNG', 14, 28, cW, cH);
      }

      pdf.save(`libro_graficas_${this.instrumentName.replace(/\s+/g, '_')}.pdf`);
      this.currentPage = savedPage;
    } catch (e) {
      console.error('Error generating PDF:', e);
      this.currentPage = savedPage;
    } finally {
      this.generatingPdf = false;
    }
  }

  shareBook(): void {
    // Emit event so the parent component opens the Compartir Informe modal
    this.shareRequest.emit({
      instrumentId: this.instrumentId,
      instrumentType: this.instrumentType,
      instrumentName: this.instrumentName,
      brandColor: this.customColor,
      brandName: this.customCompany
    });
  }

  copyShareLink(): void {
    if (this.shareLink) navigator.clipboard.writeText(this.shareLink).catch(() => {});
  }
}
