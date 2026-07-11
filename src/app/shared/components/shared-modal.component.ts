import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shared-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sm-overlay" *ngIf="isOpen" role="dialog" [attr.aria-label]="title || 'Modal'" (click)="onOverlayClick($event)" [@.disabled]="false">
      <div class="sm-container" [ngClass]="sizeClass" role="document" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="sm-header" *ngIf="title">
          <h2 class="sm-title">{{ title }}</h2>
          <button class="sm-close" (click)="close.emit()" aria-label="Cerrar">&times;</button>
        </div>
        <button class="sm-close sm-close-no-header" *ngIf="!title" (click)="close.emit()" aria-label="Cerrar">&times;</button>

        <!-- Body (projected content) -->
        <div class="sm-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ==================== SHARED MODAL (Idea #16) ==================== */
    .sm-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: smFadeIn 0.2s ease;
    }

    .sm-container {
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.03);
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: smSlideDown 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
      position: relative;
    }

    /* Size variants */
    .sm-small { max-width: 420px; }
    .sm-medium { max-width: 560px; }
    .sm-large { max-width: 720px; }
    .sm-xl { max-width: 900px; }

    /* Header */
    .sm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 28px 0 28px;
      gap: 16px;
    }

    .sm-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.3;
    }

    .sm-close {
      background: none;
      border: none;
      font-size: 28px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .sm-close:hover {
      background: #f1f5f9;
      color: #ef4444;
    }

    .sm-close-no-header {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 1;
    }

    /* Body */
    .sm-body {
      padding: 24px 28px 28px 28px;
    }

    /* Custom scrollbar */
    .sm-container::-webkit-scrollbar {
      width: 6px;
    }
    .sm-container::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }
    .sm-container::-webkit-scrollbar-track {
      background: transparent;
    }

    /* Animations */
    @keyframes smFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes smSlideDown {
      from { opacity: 0; transform: translateY(-16px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ==================== RESPONSIVE ==================== */
    @media (max-width: 640px) {
      .sm-overlay {
        align-items: flex-end;
        padding: 0;
      }
      .sm-container {
        border-radius: 20px 20px 0 0;
        max-height: 92vh;
        animation: smSlideUp 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
      }
      .sm-header {
        padding: 20px 20px 0 20px;
      }
      .sm-body {
        padding: 20px;
      }
      .sm-small, .sm-medium, .sm-large, .sm-xl {
        max-width: 100%;
      }
    }

    @keyframes smSlideUp {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class SharedModalComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() size: 'small' | 'medium' | 'large' | 'xl' = 'medium';
  @Input() closeOnOverlay: boolean = true;
  @Output() close = new EventEmitter<void>();

  get sizeClass(): string {
    return `sm-${this.size}`;
  }

  onOverlayClick(event: MouseEvent): void {
    if (this.closeOnOverlay) {
      this.close.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen) {
      this.close.emit();
    }
  }
}
