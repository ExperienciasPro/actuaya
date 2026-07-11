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
  ViewChild,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ChartAnnotation {
  id: string;
  chartId: string;
  x: number;           // % relativo al ancho del contenedor (0-100)
  y: number;           // % relativo al alto del contenedor (0-100)
  text: string;
  author?: string;
  color: string;
  createdAt: string;
  pinned: boolean;
}

export interface AnnotationEvent {
  annotation: ChartAnnotation;
  action: 'added' | 'deleted' | 'updated';
}

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'chart_annotations_';

// ─── Colores de pin ──────────────────────────────────────────────────────────

const PIN_COLORS = [
  '#6366f1', '#f43f5e', '#22c55e', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'
];

@Component({
  selector: 'app-chart-annotation-layer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="cal-container"
      #container
      (contextmenu)="onRightClick($event)"
      [class.cal-annotating]="isAnnotating"
    >
      <!-- Projected chart content -->
      <ng-content></ng-content>

      <!-- Annotation pins -->
      <div
        *ngFor="let ann of annotations; let i = index"
        class="cal-pin"
        [style.left.%]="ann.x"
        [style.top.%]="ann.y"
        [style.--pin-color]="ann.color"
        [class.cal-pin-expanded]="expandedId === ann.id"
        (click)="toggleExpand(ann.id, $event)"
      >
        <!-- Pin dot -->
        <div class="cal-dot" [style.background]="ann.color">
          <span class="cal-dot-index">{{ i + 1 }}</span>
        </div>

        <!-- Expanded card -->
        <div class="cal-card" *ngIf="expandedId === ann.id" (click)="$event.stopPropagation()">
          <div class="cal-card-header">
            <span class="cal-card-number" [style.background]="ann.color">{{ i + 1 }}</span>
            <span class="cal-card-date">{{ formatDate(ann.createdAt) }}</span>
            <button class="cal-card-close" (click)="expandedId = null; $event.stopPropagation()" title="Cerrar">×</button>
          </div>
          <p class="cal-card-text">{{ ann.text }}</p>
          <div class="cal-card-author" *ngIf="ann.author">— {{ ann.author }}</div>
          <div class="cal-card-actions">
            <button class="cal-action-btn cal-action-delete" (click)="deleteAnnotation(ann.id); $event.stopPropagation()">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>

      <!-- New annotation input -->
      <div
        class="cal-new-input"
        *ngIf="isAnnotating"
        [style.left.px]="newAnnotationX"
        [style.top.px]="newAnnotationY"
        (click)="$event.stopPropagation()"
      >
        <div class="cal-input-header">
          <span class="cal-input-title">📝 Nueva anotación</span>
          <button class="cal-input-close" (click)="cancelAnnotation()">×</button>
        </div>
        <textarea
          #textInput
          class="cal-textarea"
          [(ngModel)]="newAnnotationText"
          placeholder="Escribe tu observación..."
          rows="2"
          maxlength="300"
          (keydown.enter)="saveAnnotation()"
          (keydown.escape)="cancelAnnotation()"
        ></textarea>
        <div class="cal-input-colors">
          <button
            *ngFor="let color of pinColors"
            class="cal-color-btn"
            [style.background]="color"
            [class.cal-color-active]="selectedColor === color"
            (click)="selectedColor = color"
          ></button>
        </div>
        <div class="cal-input-footer">
          <span class="cal-input-hint">Ctrl+Enter para guardar</span>
          <button class="cal-save-btn" (click)="saveAnnotation()" [disabled]="!newAnnotationText.trim()">
            Guardar
          </button>
        </div>
      </div>

      <!-- Floating action button -->
      <button
        class="cal-fab"
        *ngIf="showFab && !isAnnotating"
        (click)="startAnnotationMode()"
        title="Añadir anotación"
      >
        📝
      </button>

      <!-- Annotation mode overlay hint -->
      <div class="cal-mode-hint" *ngIf="isAnnotating && !newAnnotationX">
        Haz click en el punto del gráfico donde quieres anotar
      </div>

      <!-- Counter badge -->
      <div class="cal-counter" *ngIf="annotations.length > 0 && !isAnnotating">
        {{ annotations.length }} {{ annotations.length === 1 ? 'nota' : 'notas' }}
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .cal-container {
      position: relative;
      width: 100%;
    }
    .cal-container.cal-annotating {
      cursor: crosshair;
    }
    .cal-container.cal-annotating::after {
      content: '';
      position: absolute; inset: 0;
      background: rgba(99,102,241,0.03);
      border: 2px dashed rgba(99,102,241,0.2);
      border-radius: 12px;
      pointer-events: none;
      z-index: 5;
    }

    /* ── Pin ── */
    .cal-pin {
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 10;
      cursor: pointer;
    }
    .cal-dot {
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 10px; font-weight: 800;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      border: 2px solid #fff;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .cal-dot:hover {
      transform: scale(1.2);
      box-shadow: 0 3px 12px rgba(0,0,0,0.25);
    }
    .cal-dot-index { line-height: 1; }

    /* ── Expanded Card ── */
    .cal-card {
      position: absolute;
      top: 30px; left: 50%;
      transform: translateX(-50%);
      width: 240px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
      border: 1px solid #f1f5f9;
      padding: 12px;
      z-index: 20;
      animation: calCardIn 0.2s ease;
    }
    @keyframes calCardIn {
      from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    .cal-card-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
    }
    .cal-card-number {
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 9px; font-weight: 800; flex-shrink: 0;
    }
    .cal-card-date { font-size: 10px; color: #94a3b8; flex: 1; font-weight: 500; }
    .cal-card-close {
      width: 20px; height: 20px; border-radius: 50%;
      border: none; background: #f1f5f9; color: #64748b;
      cursor: pointer; font-size: 14px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }
    .cal-card-close:hover { background: #e2e8f0; }

    .cal-card-text {
      margin: 0; font-size: 13px; color: #334155; line-height: 1.5; font-weight: 500;
    }
    .cal-card-author {
      margin-top: 6px; font-size: 10px; color: #94a3b8; font-style: italic;
    }
    .cal-card-actions {
      margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f5f9;
      display: flex; justify-content: flex-end;
    }
    .cal-action-btn {
      border: none; background: transparent; cursor: pointer;
      font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 6px;
    }
    .cal-action-delete { color: #ef4444; }
    .cal-action-delete:hover { background: rgba(239,68,68,0.08); }

    /* ── New Input ── */
    .cal-new-input {
      position: absolute;
      width: 260px;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06);
      border: 1px solid rgba(99,102,241,0.2);
      padding: 14px;
      z-index: 30;
      animation: calCardIn 0.2s ease;
    }
    .cal-input-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
    }
    .cal-input-title { font-size: 13px; font-weight: 700; color: #1e293b; }
    .cal-input-close {
      width: 22px; height: 22px; border-radius: 50%;
      border: none; background: #f1f5f9; color: #64748b;
      cursor: pointer; font-size: 16px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }

    .cal-textarea {
      width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 12px; font-family: inherit; color: #334155;
      resize: none; outline: none;
      transition: border-color 0.2s ease;
    }
    .cal-textarea:focus { border-color: #6366f1; }
    .cal-textarea::placeholder { color: #cbd5e1; }

    .cal-input-colors {
      display: flex; gap: 6px; margin-top: 10px;
    }
    .cal-color-btn {
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid transparent; cursor: pointer;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .cal-color-btn:hover { transform: scale(1.15); }
    .cal-color-btn.cal-color-active { border-color: #1e293b; transform: scale(1.2); }

    .cal-input-footer {
      display: flex; align-items: center; justify-content: space-between; margin-top: 12px;
    }
    .cal-input-hint { font-size: 10px; color: #cbd5e1; font-weight: 500; }
    .cal-save-btn {
      padding: 6px 16px; border-radius: 8px;
      border: none; background: #6366f1; color: #fff;
      font-size: 12px; font-weight: 700; cursor: pointer;
      transition: background 0.2s ease;
    }
    .cal-save-btn:hover { background: #4f46e5; }
    .cal-save-btn:disabled { background: #cbd5e1; cursor: not-allowed; }

    /* ── FAB ── */
    .cal-fab {
      position: absolute; bottom: 12px; right: 12px;
      width: 36px; height: 36px; border-radius: 50%;
      border: none; background: #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: 8;
    }
    .cal-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }

    /* ── Mode hint ── */
    .cal-mode-hint {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15,23,42,0.85);
      color: #f8fafc; padding: 10px 20px; border-radius: 10px;
      font-size: 12px; font-weight: 600;
      pointer-events: none; z-index: 6;
      animation: calFadeIn 0.3s ease;
    }
    @keyframes calFadeIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    /* ── Counter ── */
    .cal-counter {
      position: absolute; top: 8px; right: 8px;
      padding: 3px 10px; border-radius: 20px;
      background: rgba(99,102,241,0.08);
      color: #6366f1; font-size: 10px; font-weight: 700;
      z-index: 8;
    }
  `]
})
export class ChartAnnotationLayerComponent implements OnInit, OnDestroy, OnChanges {

  // ── Inputs ──
  @Input() chartId: string = 'default';
  @Input() author: string = '';
  @Input() showFab: boolean = true;
  @Input() enabled: boolean = true;
  @Input() maxAnnotations: number = 20;

  // ── Outputs ──
  @Output() annotationAdded = new EventEmitter<AnnotationEvent>();
  @Output() annotationDeleted = new EventEmitter<AnnotationEvent>();

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('textInput') textInputRef!: ElementRef<HTMLTextAreaElement>;

  annotations: ChartAnnotation[] = [];
  pinColors = PIN_COLORS;
  expandedId: string | null = null;

  // New annotation state
  isAnnotating = false;
  newAnnotationX = 0;
  newAnnotationY = 0;
  newAnnotationText = '';
  selectedColor = PIN_COLORS[0];
  private newAnnotationRelX = 0;
  private newAnnotationRelY = 0;

  ngOnInit(): void {
    this.loadAnnotations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartId'] && !changes['chartId'].isFirstChange()) {
      this.loadAnnotations();
    }
  }

  ngOnDestroy(): void {
    this.expandedId = null;
    this.isAnnotating = false;
  }

  // ── Annotation Mode ──

  startAnnotationMode(): void {
    if (!this.enabled) return;
    this.isAnnotating = true;
    this.newAnnotationX = 0;
    this.newAnnotationY = 0;
    this.newAnnotationText = '';
    this.expandedId = null;
  }

  cancelAnnotation(): void {
    this.isAnnotating = false;
    this.newAnnotationX = 0;
    this.newAnnotationY = 0;
    this.newAnnotationText = '';
  }

  onRightClick(event: MouseEvent): void {
    if (!this.enabled) return;
    event.preventDefault();
    this.placeAnnotationInput(event);
  }

  @HostListener('click', ['$event'])
  onContainerClick(event: MouseEvent): void {
    if (!this.isAnnotating || !this.enabled) return;

    // Si ya hay un input abierto, no reposicionar
    if (this.newAnnotationX > 0 && this.newAnnotationY > 0) {
      // Click fuera del input → cerrar
      this.cancelAnnotation();
      return;
    }

    this.placeAnnotationInput(event);
  }

  private placeAnnotationInput(event: MouseEvent): void {
    if (!this.containerRef) return;

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.isAnnotating = true;
    this.newAnnotationX = x;
    this.newAnnotationY = y;
    this.newAnnotationRelX = (x / rect.width) * 100;
    this.newAnnotationRelY = (y / rect.height) * 100;
    this.newAnnotationText = '';

    // Focus el textarea
    setTimeout(() => {
      if (this.textInputRef) {
        this.textInputRef.nativeElement.focus();
      }
    }, 100);
  }

  // ── CRUD ──

  saveAnnotation(): void {
    if (!this.newAnnotationText.trim()) return;

    if (this.annotations.length >= this.maxAnnotations) {
      console.warn(`[Annotations] Máximo de ${this.maxAnnotations} anotaciones alcanzado`);
      return;
    }

    const annotation: ChartAnnotation = {
      id: this.generateId(),
      chartId: this.chartId,
      x: this.newAnnotationRelX,
      y: this.newAnnotationRelY,
      text: this.newAnnotationText.trim(),
      author: this.author || undefined,
      color: this.selectedColor,
      createdAt: new Date().toISOString(),
      pinned: true
    };

    this.annotations.push(annotation);
    this.persistAnnotations();
    this.cancelAnnotation();

    this.annotationAdded.emit({ annotation, action: 'added' });
  }

  deleteAnnotation(id: string): void {
    const idx = this.annotations.findIndex(a => a.id === id);
    if (idx === -1) return;

    const deleted = this.annotations[idx];
    this.annotations.splice(idx, 1);
    this.persistAnnotations();
    this.expandedId = null;

    this.annotationDeleted.emit({ annotation: deleted, action: 'deleted' });
  }

  toggleExpand(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedId = this.expandedId === id ? null : id;
  }

  /** Eliminar todas las anotaciones del chart actual */
  clearAll(): void {
    this.annotations = [];
    this.persistAnnotations();
    this.expandedId = null;
  }

  // ── Persistencia (localStorage) ──

  private loadAnnotations(): void {
    try {
      const key = STORAGE_KEY_PREFIX + this.chartId;
      const stored = localStorage.getItem(key);
      if (stored) {
        this.annotations = JSON.parse(stored);
      } else {
        this.annotations = [];
      }
    } catch (e) {
      console.error('[Annotations] Error loading:', e);
      this.annotations = [];
    }
  }

  private persistAnnotations(): void {
    try {
      const key = STORAGE_KEY_PREFIX + this.chartId;
      localStorage.setItem(key, JSON.stringify(this.annotations));
    } catch (e) {
      console.error('[Annotations] Error saving:', e);
    }
  }

  // ── Helpers ──

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  }

  private generateId(): string {
    return 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  }
}
