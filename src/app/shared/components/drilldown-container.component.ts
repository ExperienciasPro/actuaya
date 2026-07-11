import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  TemplateRef,
  ContentChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, group } from '@angular/animations';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface DrillDownLevel {
  id: string;
  label: string;
  icon?: string;          // Emoji o icono
  data?: any;             // Datos arbitrarios para el nivel
  parentId?: string;      // ID del nivel padre
}

export interface DrillDownEvent {
  level: DrillDownLevel;
  depth: number;
  path: DrillDownLevel[];
}

// ─── Componente ──────────────────────────────────────────────────────────────

@Component({
  selector: 'app-drilldown-container',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideTransition', [
      // Drill down: slide left
      transition('* => deeper', [
        query(':enter', [
          style({ transform: 'translateX(30px)', opacity: 0 })
        ], { optional: true }),
        query(':leave', [
          style({ transform: 'translateX(0)', opacity: 1 })
        ], { optional: true }),
        group([
          query(':leave', [
            animate('280ms ease-out', style({ transform: 'translateX(-30px)', opacity: 0 }))
          ], { optional: true }),
          query(':enter', [
            animate('280ms 80ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
          ], { optional: true })
        ])
      ]),
      // Drill up: slide right
      transition('* => shallower', [
        query(':enter', [
          style({ transform: 'translateX(-30px)', opacity: 0 })
        ], { optional: true }),
        query(':leave', [
          style({ transform: 'translateX(0)', opacity: 1 })
        ], { optional: true }),
        group([
          query(':leave', [
            animate('280ms ease-out', style({ transform: 'translateX(30px)', opacity: 0 }))
          ], { optional: true }),
          query(':enter', [
            animate('280ms 80ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
          ], { optional: true })
        ])
      ])
    ])
  ],
  template: `
    <div class="dd-container">
      <!-- Breadcrumb -->
      <div class="dd-breadcrumb" *ngIf="showBreadcrumb && stack.length > 0">
        <!-- Back Button -->
        <button
          class="dd-back-btn"
          *ngIf="stack.length > 1"
          (click)="goBack()"
          title="Volver"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <!-- Breadcrumb Trail -->
        <div class="dd-trail">
          <ng-container *ngFor="let level of stack; let i = index; let isLast = last">
            <button
              class="dd-crumb"
              [class.dd-crumb-active]="isLast"
              [class.dd-crumb-clickable]="!isLast"
              (click)="!isLast && goToLevel(i)"
            >
              <span *ngIf="level.icon" class="dd-crumb-icon">{{ level.icon }}</span>
              <span class="dd-crumb-label">{{ level.label }}</span>
            </button>
            <span class="dd-separator" *ngIf="!isLast">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          </ng-container>
        </div>

        <!-- Depth indicator -->
        <span class="dd-depth" *ngIf="showDepth">
          Nivel {{ stack.length }}
        </span>
      </div>

      <!-- Content Area with Animation -->
      <div class="dd-content" [@slideTransition]="animationState">
        <!-- Loading State -->
        <div class="dd-loading" *ngIf="isLoading">
          <div class="dd-spinner"></div>
          <p>Cargando datos...</p>
        </div>

        <!-- Projected Content -->
        <ng-content *ngIf="!isLoading"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .dd-container { width: 100%; }

    /* ── Breadcrumb ── */
    .dd-breadcrumb {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; margin-bottom: 16px;
      background: rgba(241,245,249,0.6);
      border-radius: 12px;
      border: 1px solid rgba(226,232,240,0.5);
      overflow-x: auto;
      scrollbar-width: none;
    }
    .dd-breadcrumb::-webkit-scrollbar { display: none; }

    .dd-back-btn {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid #e2e8f0; background: #fff;
      cursor: pointer; flex-shrink: 0;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .dd-back-btn:hover {
      background: #f1f5f9; border-color: #cbd5e1;
      transform: translateX(-2px);
    }
    .dd-back-btn svg { width: 16px; height: 16px; color: #475569; }

    .dd-trail {
      display: flex; align-items: center; gap: 2px;
      flex: 1; min-width: 0;
    }

    .dd-crumb {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 6px;
      border: none; background: transparent;
      font-size: 12px; font-weight: 600; color: #64748b;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .dd-crumb-clickable {
      cursor: pointer;
    }
    .dd-crumb-clickable:hover {
      background: rgba(99,102,241,0.08);
      color: #6366f1;
    }
    .dd-crumb-active {
      background: #fff;
      color: #1e293b;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      cursor: default;
    }
    .dd-crumb-icon { font-size: 14px; }
    .dd-crumb-label { max-width: 150px; overflow: hidden; text-overflow: ellipsis; }

    .dd-separator {
      display: flex; align-items: center; flex-shrink: 0;
    }
    .dd-separator svg { width: 12px; height: 12px; color: #cbd5e1; }

    .dd-depth {
      flex-shrink: 0;
      font-size: 10px; font-weight: 700; color: #94a3b8;
      padding: 3px 8px; border-radius: 10px;
      background: rgba(148,163,184,0.1);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* ── Content ── */
    .dd-content {
      position: relative;
      min-height: 100px;
    }

    /* ── Loading ── */
    .dd-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 48px 20px; text-align: center;
    }
    .dd-spinner {
      width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid #e2e8f0;
      border-top: 3px solid #6366f1;
      animation: dd-spin 0.8s linear infinite;
      margin-bottom: 12px;
    }
    @keyframes dd-spin { to { transform: rotate(360deg); } }
    .dd-loading p { color: #94a3b8; font-size: 13px; font-weight: 500; margin: 0; }
  `]
})
export class DrilldownContainerComponent implements OnDestroy {

  // ── Inputs ──
  @Input() showBreadcrumb: boolean = true;
  @Input() showDepth: boolean = true;
  @Input() isLoading: boolean = false;
  @Input() maxDepth: number = 10;

  // ── Outputs ──
  @Output() drillDown = new EventEmitter<DrillDownEvent>();
  @Output() drillUp = new EventEmitter<DrillDownEvent>();
  @Output() levelChanged = new EventEmitter<DrillDownEvent>();

  // ── State ──
  stack: DrillDownLevel[] = [];
  animationState: string = 'initial';

  private animCounter = 0;

  get currentLevel(): DrillDownLevel | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  get currentDepth(): number {
    return this.stack.length;
  }

  get canGoBack(): boolean {
    return this.stack.length > 1;
  }

  get currentPath(): DrillDownLevel[] {
    return [...this.stack];
  }

  ngOnDestroy(): void {
    this.stack = [];
  }

  // ── Public API ──

  /** Inicializa el drill-down con un nivel raíz */
  init(rootLevel: DrillDownLevel): void {
    this.stack = [rootLevel];
    this.animationState = 'initial';
    this.emitLevelChanged();
  }

  /** Profundiza un nivel más */
  pushLevel(level: DrillDownLevel): void {
    if (this.stack.length >= this.maxDepth) {
      console.warn(`[DrillDown] Máxima profundidad alcanzada (${this.maxDepth})`);
      return;
    }

    level.parentId = this.currentLevel?.id;
    this.stack.push(level);

    this.animCounter++;
    this.animationState = 'deeper';
    // Reset para permitir re-trigger
    setTimeout(() => { this.animationState = `deeper_${this.animCounter}`; }, 0);

    const event = this.buildEvent();
    this.drillDown.emit(event);
    this.levelChanged.emit(event);
  }

  /** Retrocede al nivel anterior */
  goBack(): void {
    if (this.stack.length <= 1) return;

    this.stack.pop();

    this.animCounter++;
    this.animationState = 'shallower';
    setTimeout(() => { this.animationState = `shallower_${this.animCounter}`; }, 0);

    const event = this.buildEvent();
    this.drillUp.emit(event);
    this.levelChanged.emit(event);
  }

  /** Navega directamente a un nivel del breadcrumb */
  goToLevel(index: number): void {
    if (index < 0 || index >= this.stack.length - 1) return;

    this.stack = this.stack.slice(0, index + 1);

    this.animCounter++;
    this.animationState = 'shallower';
    setTimeout(() => { this.animationState = `shallower_${this.animCounter}`; }, 0);

    const event = this.buildEvent();
    this.drillUp.emit(event);
    this.levelChanged.emit(event);
  }

  /** Reinicia al nivel raíz */
  reset(): void {
    if (this.stack.length <= 1) return;
    this.stack = [this.stack[0]];

    this.animCounter++;
    this.animationState = 'shallower';
    setTimeout(() => { this.animationState = `shallower_${this.animCounter}`; }, 0);

    const event = this.buildEvent();
    this.drillUp.emit(event);
    this.levelChanged.emit(event);
  }

  /** Actualiza los datos del nivel actual sin cambiar de nivel */
  updateCurrentData(data: any): void {
    if (this.currentLevel) {
      this.currentLevel.data = data;
    }
  }

  // ── Internals ──

  private buildEvent(): DrillDownEvent {
    return {
      level: this.currentLevel!,
      depth: this.stack.length,
      path: [...this.stack]
    };
  }

  private emitLevelChanged(): void {
    if (this.currentLevel) {
      this.levelChanged.emit(this.buildEvent());
    }
  }
}
