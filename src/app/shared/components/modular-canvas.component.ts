import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    QueryList,
    ContentChildren,
    TemplateRef,
    AfterContentInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    CdkDragDrop,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    moveItemInArray
} from '@angular/cdk/drag-drop';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CanvasWidget {
    id: string;
    title: string;
    icon?: string;
    type: string;          // 'chart' | 'kpi' | 'narrative' | 'table' | 'custom'
    size: 'sm' | 'md' | 'lg' | 'full';
    visible: boolean;
    pinned: boolean;
    order: number;
    data?: any;
}

export interface CanvasLayout {
    id: string;
    name: string;
    widgets: CanvasWidget[];
    createdAt: string;
}

export interface WidgetAction {
    widget: CanvasWidget;
    action: 'toggle' | 'pin' | 'resize' | 'remove' | 'reorder';
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const LAYOUT_STORAGE_KEY = 'modular_canvas_layout';

// ─── Componente ──────────────────────────────────────────────────────────────

@Component({
    selector: 'app-modular-canvas',
    standalone: true,
    imports: [CommonModule, CdkDropListGroup, CdkDropList, CdkDrag],
    template: `
    <div class="mc-container">
      <!-- Toolbar -->
      <div class="mc-toolbar" *ngIf="showToolbar">
        <div class="mc-toolbar-left">
          <span class="mc-toolbar-title">{{ title }}</span>
          <span class="mc-widget-count">{{ visibleWidgets.length }} de {{ widgets.length }} widgets</span>
        </div>
        <div class="mc-toolbar-actions">
          <button class="mc-btn mc-btn-ghost" (click)="showWidgetPicker = !showWidgetPicker" title="Configurar widgets">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v2m0 18v2m-9-11H1m22 0h-2m-2.05-7.95l-1.41 1.41M5.46 18.54l-1.41 1.41m0-15.9l1.41 1.41m13.08 13.08l1.41 1.41"></path>
            </svg>
          </button>
          <button class="mc-btn mc-btn-ghost" (click)="resetLayout()" title="Restaurar orden original">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Widget Picker Panel -->
      <div class="mc-picker" *ngIf="showWidgetPicker">
        <div class="mc-picker-header">
          <span class="mc-picker-title">📦 Widgets Disponibles</span>
          <button class="mc-picker-close" (click)="showWidgetPicker = false">×</button>
        </div>
        <div class="mc-picker-grid">
          <button
            *ngFor="let w of widgets"
            class="mc-picker-item"
            [class.mc-picker-active]="w.visible"
            (click)="toggleWidget(w)"
          >
            <span class="mc-picker-icon">{{ w.icon || '📊' }}</span>
            <span class="mc-picker-label">{{ w.title }}</span>
            <span class="mc-picker-check" *ngIf="w.visible">✓</span>
          </button>
        </div>
      </div>

      <!-- Canvas Grid (Drop Zone) -->
      <div
        class="mc-grid"
        cdkDropList
        cdkDropListOrientation="mixed"
        [cdkDropListData]="visibleWidgets"
        (cdkDropListDropped)="onDrop($event)"
      >
        <div
          *ngFor="let widget of visibleWidgets; trackBy: trackWidget"
          class="mc-widget"
          [class.mc-sm]="widget.size === 'sm'"
          [class.mc-md]="widget.size === 'md'"
          [class.mc-lg]="widget.size === 'lg'"
          [class.mc-full]="widget.size === 'full'"
          [class.mc-pinned]="widget.pinned"
          cdkDrag
          [cdkDragDisabled]="widget.pinned"
        >
          <!-- Drag Handle -->
          <div class="mc-widget-header" cdkDragHandle>
            <div class="mc-drag-indicator" *ngIf="!widget.pinned">
              <span></span><span></span><span></span>
            </div>
            <span class="mc-widget-icon">{{ widget.icon || '📊' }}</span>
            <span class="mc-widget-title">{{ widget.title }}</span>
            <div class="mc-widget-actions">
              <!-- Size toggle -->
              <button class="mc-waction" (click)="cycleSize(widget)" title="Cambiar tamaño">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </button>
              <!-- Pin toggle -->
              <button class="mc-waction" [class.mc-waction-active]="widget.pinned" (click)="togglePin(widget)" title="Anclar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 17v5M5 17h14l-1.405-5.62A2 2 0 0 0 15.65 10H8.35a2 2 0 0 0-1.945 1.38L5 17zM8.5 10V7.5a3.5 3.5 0 1 1 7 0V10"></path>
                </svg>
              </button>
              <!-- Hide -->
              <button class="mc-waction" (click)="hideWidget(widget)" title="Ocultar widget">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- Widget Content -->
          <div class="mc-widget-body">
            <ng-content></ng-content>
          </div>

          <!-- Drag Placeholder -->
          <div class="mc-drag-placeholder" *cdkDragPlaceholder></div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="mc-empty" *ngIf="visibleWidgets.length === 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
        <p>No hay widgets visibles</p>
        <button class="mc-btn mc-btn-outline" (click)="showWidgetPicker = true">
          Configurar Widgets
        </button>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; }

    .mc-container { width: 100%; }

    /* ── Toolbar ── */
    .mc-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; margin-bottom: 16px;
      background: #fff; border-radius: 14px;
      border: 1px solid #e8ecf1;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .mc-toolbar-left { display: flex; align-items: center; gap: 12px; }
    .mc-toolbar-title { font-size: 14px; font-weight: 700; color: #1e293b; }
    .mc-widget-count {
      font-size: 11px; font-weight: 600; color: #94a3b8;
      padding: 3px 10px; border-radius: 20px;
      background: rgba(148,163,184,0.08);
    }
    .mc-toolbar-actions { display: flex; gap: 6px; }
    .mc-btn {
      display: flex; align-items: center; justify-content: center;
      border: none; cursor: pointer; border-radius: 8px;
      transition: all 0.2s ease; font-family: inherit;
    }
    .mc-btn-ghost {
      width: 34px; height: 34px; background: transparent; color: #64748b;
    }
    .mc-btn-ghost svg { width: 16px; height: 16px; }
    .mc-btn-ghost:hover { background: #f1f5f9; color: #1e293b; }
    .mc-btn-outline {
      padding: 8px 18px; font-size: 13px; font-weight: 600;
      color: #1e293b; background: #fff; border: 1px solid #e2e8f0;
    }
    .mc-btn-outline:hover { background: #0f172a; color: #fff; border-color: #0f172a; }

    /* ── Widget Picker ── */
    .mc-picker {
      background: #fff; border-radius: 14px; border: 1px solid #e8ecf1;
      padding: 16px; margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      animation: mcFadeIn 0.2s ease;
    }
    @keyframes mcFadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

    .mc-picker-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .mc-picker-title { font-size: 14px; font-weight: 700; color: #1e293b; }
    .mc-picker-close {
      width: 26px; height: 26px; border-radius: 50%;
      border: none; background: #f1f5f9; color: #64748b;
      cursor: pointer; font-size: 16px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }
    .mc-picker-close:hover { background: #e2e8f0; }

    .mc-picker-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 8px;
    }
    .mc-picker-item {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 10px;
      border: 1px solid #e2e8f0; background: #fafbfc;
      cursor: pointer; transition: all 0.15s ease;
      font-family: inherit; text-align: left;
    }
    .mc-picker-item:hover { border-color: #6366f1; background: rgba(99,102,241,0.03); }
    .mc-picker-active { border-color: #6366f1; background: rgba(99,102,241,0.06); }
    .mc-picker-icon { font-size: 16px; flex-shrink: 0; }
    .mc-picker-label { font-size: 12px; font-weight: 600; color: #334155; flex: 1; }
    .mc-picker-check {
      font-size: 12px; font-weight: 800; color: #6366f1;
      width: 20px; height: 20px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(99,102,241,0.1);
    }

    /* ── Grid Layout ── */
    .mc-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
      min-height: 120px;
    }

    .mc-widget {
      background: #fff; border-radius: 16px;
      border: 1px solid #e8ecf1;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      overflow: hidden;
      transition: box-shadow 0.2s ease;
    }
    .mc-widget:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }

    .mc-sm { grid-column: span 3; }
    .mc-md { grid-column: span 6; }
    .mc-lg { grid-column: span 9; }
    .mc-full { grid-column: span 12; }

    .mc-pinned { border-color: rgba(99,102,241,0.2); }

    /* ── Widget Header (Drag Handle) ── */
    .mc-widget-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-bottom: 1px solid #f1f5f9;
      cursor: grab;
      user-select: none;
    }
    .mc-widget-header:active { cursor: grabbing; }
    .mc-pinned .mc-widget-header { cursor: default; }

    .mc-drag-indicator {
      display: flex; flex-direction: column; gap: 2px;
      padding: 2px 0;
    }
    .mc-drag-indicator span {
      display: block; width: 12px; height: 2px;
      background: #cbd5e1; border-radius: 1px;
    }

    .mc-widget-icon { font-size: 14px; flex-shrink: 0; }
    .mc-widget-title {
      font-size: 12px; font-weight: 700; color: #1e293b;
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .mc-widget-actions { display: flex; gap: 4px; }
    .mc-waction {
      width: 26px; height: 26px; border-radius: 6px;
      border: none; background: transparent; color: #94a3b8;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.15s ease;
    }
    .mc-waction svg { width: 13px; height: 13px; }
    .mc-waction:hover { background: #f1f5f9; color: #64748b; }
    .mc-waction-active { color: #6366f1; background: rgba(99,102,241,0.06); }

    /* ── Widget Body ── */
    .mc-widget-body { padding: 14px; }

    /* ── Drag Placeholder ── */
    .mc-drag-placeholder {
      background: rgba(99,102,241,0.04);
      border: 2px dashed rgba(99,102,241,0.2);
      border-radius: 16px;
      min-height: 100px;
      transition: transform 0.2s ease;
    }

    /* CDK Drag Preview */
    .cdk-drag-preview {
      box-shadow: 0 12px 40px rgba(0,0,0,0.12);
      border-radius: 16px;
      opacity: 0.9;
    }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .cdk-drop-list-dragging .mc-widget:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    /* ── Empty ── */
    .mc-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 20px; text-align: center;
      border: 1px dashed #e2e8f0; border-radius: 16px; background: #fafbfc;
    }
    .mc-empty svg { width: 40px; height: 40px; color: #cbd5e1; margin-bottom: 12px; }
    .mc-empty p { color: #94a3b8; font-size: 14px; margin: 0 0 16px 0; font-weight: 500; }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .mc-sm { grid-column: span 6; }
      .mc-md { grid-column: span 6; }
      .mc-lg { grid-column: span 12; }
    }
    @media (max-width: 768px) {
      .mc-grid { gap: 12px; }
      .mc-sm, .mc-md, .mc-lg, .mc-full { grid-column: span 12; }
      .mc-toolbar { padding: 8px 12px; }
      .mc-picker-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    }
  `]
})
export class ModularCanvasComponent implements OnInit, OnDestroy {

    // ── Inputs ──
    @Input() widgets: CanvasWidget[] = [];
    @Input() title: string = 'Dashboard';
    @Input() showToolbar: boolean = true;
    @Input() persistLayout: boolean = true;
    @Input() layoutId: string = 'default';

    // ── Outputs ──
    @Output() widgetAction = new EventEmitter<WidgetAction>();
    @Output() layoutChanged = new EventEmitter<CanvasWidget[]>();

    showWidgetPicker = false;

    get visibleWidgets(): CanvasWidget[] {
        return this.widgets
            .filter(w => w.visible)
            .sort((a, b) => a.order - b.order);
    }

    ngOnInit(): void {
        if (this.persistLayout) {
            this.loadLayout();
        }
    }

    ngOnDestroy(): void {
        if (this.persistLayout) {
            this.saveLayout();
        }
    }

    // ── Drag & Drop ──

    onDrop(event: CdkDragDrop<CanvasWidget[]>): void {
        const visible = this.visibleWidgets;
        moveItemInArray(visible, event.previousIndex, event.currentIndex);

        // Actualizar order
        visible.forEach((w, i) => {
            const original = this.widgets.find(ow => ow.id === w.id);
            if (original) original.order = i;
        });

        this.emitAndSave('reorder', visible[event.currentIndex]);
    }

    // ── Widget Actions ──

    toggleWidget(widget: CanvasWidget): void {
        widget.visible = !widget.visible;
        this.emitAndSave('toggle', widget);
    }

    hideWidget(widget: CanvasWidget): void {
        widget.visible = false;
        this.emitAndSave('toggle', widget);
    }

    togglePin(widget: CanvasWidget): void {
        widget.pinned = !widget.pinned;
        this.emitAndSave('pin', widget);
    }

    cycleSize(widget: CanvasWidget): void {
        const sizes: Array<'sm' | 'md' | 'lg' | 'full'> = ['sm', 'md', 'lg', 'full'];
        const idx = sizes.indexOf(widget.size);
        widget.size = sizes[(idx + 1) % sizes.length];
        this.emitAndSave('resize', widget);
    }

    resetLayout(): void {
        this.widgets.forEach((w, i) => {
            w.visible = true;
            w.pinned = false;
            w.order = i;
        });
        this.showWidgetPicker = false;
        this.saveLayout();
        this.layoutChanged.emit(this.widgets);
    }

    trackWidget(index: number, widget: CanvasWidget): string {
        return widget.id;
    }

    // ── Persistence ──

    private loadLayout(): void {
        try {
            const key = `${LAYOUT_STORAGE_KEY}_${this.layoutId}`;
            const stored = localStorage.getItem(key);
            if (!stored) return;

            const savedWidgets: Partial<CanvasWidget>[] = JSON.parse(stored);
            const savedMap = new Map(savedWidgets.map(w => [w.id, w]));

            this.widgets.forEach(widget => {
                const saved = savedMap.get(widget.id);
                if (saved) {
                    if (saved.visible !== undefined) widget.visible = saved.visible;
                    if (saved.pinned !== undefined) widget.pinned = saved.pinned;
                    if (saved.size !== undefined) widget.size = saved.size as any;
                    if (saved.order !== undefined) widget.order = saved.order;
                }
            });
        } catch (e) {
            console.warn('[ModularCanvas] Error loading layout:', e);
        }
    }

    private saveLayout(): void {
        if (!this.persistLayout) return;
        try {
            const key = `${LAYOUT_STORAGE_KEY}_${this.layoutId}`;
            const toSave = this.widgets.map(w => ({
                id: w.id,
                visible: w.visible,
                pinned: w.pinned,
                size: w.size,
                order: w.order
            }));
            localStorage.setItem(key, JSON.stringify(toSave));
        } catch (e) {
            console.warn('[ModularCanvas] Error saving layout:', e);
        }
    }

    private emitAndSave(action: WidgetAction['action'], widget: CanvasWidget): void {
        this.widgetAction.emit({ widget, action });
        this.layoutChanged.emit(this.widgets);
        this.saveLayout();
    }
}
