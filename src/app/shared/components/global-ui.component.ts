import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage } from '../services/toast.service';
import { ConfirmService, ConfirmConfig } from '../services/confirm.service';

@Component({
    selector: 'app-global-ui',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- ========== TOAST CONTAINER ========== -->
    <div class="toast-container" *ngIf="toasts.length > 0">
      <div *ngFor="let toast of toasts; trackBy: trackToast"
           class="toast-item"
           [class.toast-success]="toast.type === 'success'"
           [class.toast-error]="toast.type === 'error'"
           [class.toast-warning]="toast.type === 'warning'"
           [class.toast-info]="toast.type === 'info'"
           [class.toast-dismissing]="toast.dismissing">
        <span class="toast-icon">{{ toast.icon }}</span>
        <span class="toast-text">{{ toast.text }}</span>
      </div>
    </div>

    <!-- ========== CONFIRM MODAL ========== -->
    <div class="confirm-overlay" *ngIf="showConfirm" (click)="onCancel()">
      <div class="confirm-card" (click)="$event.stopPropagation()">
        <!-- Icon -->
        <div class="confirm-icon-wrapper"
             [class.icon-danger]="confirmConfig?.type === 'danger'"
             [class.icon-warning]="confirmConfig?.type === 'warning'"
             [class.icon-info]="confirmConfig?.type === 'info' || !confirmConfig?.type">
          <svg *ngIf="confirmConfig?.type === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          <svg *ngIf="confirmConfig?.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v2m0 4h.01M10.29 3.86l-8.06 13.97A1 1 0 003.12 20h17.76a1 1 0 00.87-1.5L13.71 3.86a1 1 0 00-1.73 0z"/>
          </svg>
          <svg *ngIf="!confirmConfig?.type || confirmConfig?.type === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>

        <!-- Content -->
        <h3 class="confirm-title">{{ confirmConfig?.title }}</h3>
        <p class="confirm-message">{{ confirmConfig?.message }}</p>

        <!-- Actions -->
        <div class="confirm-actions">
          <button class="btn-cancel" (click)="onCancel()">
            {{ confirmConfig?.cancelText || 'Cancelar' }}
          </button>
          <button class="btn-confirm"
                  [class.btn-danger]="confirmConfig?.type === 'danger'"
                  [class.btn-warn]="confirmConfig?.type === 'warning'"
                  [class.btn-primary]="!confirmConfig?.type || confirmConfig?.type === 'info'"
                  (click)="onConfirm()">
            {{ confirmConfig?.confirmText || 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
    `,
    styles: [`
    /* ========== TOAST STYLES ========== */
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      max-width: 420px;
    }

    .toast-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      border-radius: 14px;
      background: white;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
      animation: toastSlideIn 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
      border-left: 4px solid transparent;
      backdrop-filter: blur(12px);
    }

    .toast-item.toast-dismissing {
      animation: toastSlideOut 0.35s ease forwards;
    }

    .toast-success { border-left-color: #22c55e; }
    .toast-error { border-left-color: #ef4444; }
    .toast-warning { border-left-color: #f59e0b; }
    .toast-info { border-left-color: #3b82f6; }

    .toast-icon {
      font-size: 18px;
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toast-success .toast-icon { background: #dcfce7; color: #16a34a; }
    .toast-error .toast-icon { background: #fef2f2; color: #ef4444; }
    .toast-warning .toast-icon { background: #fefce8; color: #d97706; }
    .toast-info .toast-icon { background: #eff6ff; color: #3b82f6; }

    .toast-text { flex: 1; line-height: 1.4; }

    @keyframes toastSlideIn {
      from { opacity: 0; transform: translateX(40px) scale(0.95); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes toastSlideOut {
      from { opacity: 1; transform: translateX(0) scale(1); }
      to { opacity: 0; transform: translateX(40px) scale(0.95); }
    }

    /* ========== CONFIRM MODAL STYLES ========== */
    .confirm-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      animation: fadeIn 0.2s ease;
    }

    .confirm-card {
      background: white;
      border-radius: 20px;
      padding: 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.15);
      animation: modalPopIn 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes modalPopIn {
      from { opacity: 0; transform: scale(0.9) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .confirm-icon-wrapper {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px auto;
    }
    .confirm-icon-wrapper svg {
      width: 28px;
      height: 28px;
    }

    .icon-danger {
      background: #fef2f2;
      color: #ef4444;
    }
    .icon-warning {
      background: #fefce8;
      color: #d97706;
    }
    .icon-info {
      background: #eff6ff;
      color: #3b82f6;
    }

    .confirm-title {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
    }

    .confirm-message {
      margin: 0 0 28px 0;
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      gap: 12px;
    }

    .btn-cancel, .btn-confirm {
      flex: 1;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-cancel {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }
    .btn-cancel:hover {
      background: #e2e8f0;
      color: #475569;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .btn-danger:hover {
      background: #dc2626;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .btn-warn {
      background: #f59e0b;
      color: white;
    }
    .btn-warn:hover {
      background: #d97706;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    .btn-primary:hover {
      background: #2563eb;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    `]
})
export class GlobalUiComponent implements OnInit, OnDestroy {
    toasts: ToastMessage[] = [];
    showConfirm = false;
    confirmConfig: ConfirmConfig | null = null;
    private confirmResolver: ((result: boolean) => void) | null = null;
    private subs: Subscription[] = [];

    constructor(
        private toastService: ToastService,
        private confirmService: ConfirmService
    ) { }

    ngOnInit() {
        this.subs.push(
            this.toastService.toasts$.subscribe(({ action, toast }) => {
                if (action === 'add') {
                    const idx = this.toasts.findIndex(t => t.id === toast.id);
                    if (idx >= 0) {
                        this.toasts[idx] = toast;
                    } else {
                        this.toasts.push(toast);
                    }
                } else {
                    this.toasts = this.toasts.filter(t => t.id !== toast.id);
                }
            })
        );

        this.subs.push(
            this.confirmService.confirm$.subscribe(({ config, resolve }) => {
                this.confirmConfig = config;
                this.confirmResolver = resolve;
                this.showConfirm = true;
            })
        );
    }

    ngOnDestroy() {
        this.subs.forEach(s => s.unsubscribe());
    }

    trackToast(index: number, toast: ToastMessage) {
        return toast.id;
    }

    onConfirm() {
        this.showConfirm = false;
        this.confirmResolver?.(true);
        this.confirmResolver = null;
    }

    onCancel() {
        this.showConfirm = false;
        this.confirmResolver?.(false);
        this.confirmResolver = null;
    }
}
