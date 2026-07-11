import { Component, input, output } from '@angular/core';

@Component({
  selector: 'um-confirm-dialog',
  standalone: true,
  template: `
    @if (open()) {
      <div class="dialog-backdrop" (click)="onCancel()">
        <div class="dialog-panel animate-scaleIn" (click)="$event.stopPropagation()">
          <div class="dialog-icon">{{ icon() }}</div>
          <h3 class="dialog-title">{{ title() }}</h3>
          <p class="dialog-message">{{ message() }}</p>
          <div class="dialog-actions">
            <button class="btn-cancel" (click)="onCancel()">{{ cancelLabel() }}</button>
            <button class="btn-confirm" [class]="variant()" (click)="onConfirm()">{{ confirmLabel() }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 400;
      animation: fadeIn 150ms ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-scaleIn {
      animation: scaleIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    .dialog-panel {
      background: #FFFFFF;
      border: 1px solid rgba(0, 40, 30, 0.1);
      border-radius: 16px;
      padding: 32px;
      max-width: 380px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 40, 30, 0.16);
    }

    .dialog-icon {
      font-size: 2.5rem;
      margin-bottom: 12px;
    }

    .dialog-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.125rem;
      font-weight: 600;
      color: #1a2e35;
      margin-bottom: 8px;
    }

    .dialog-message {
      font-size: 0.875rem;
      color: #5a7a84;
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .dialog-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .btn-cancel, .btn-confirm {
      padding: 8px 20px;
      border-radius: 10px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
    }

    .btn-cancel {
      background: transparent;
      color: #5a7a84;
      border: 1px solid rgba(0, 40, 30, 0.12);

      &:hover {
        background: rgba(0, 40, 30, 0.05);
        color: #1a2e35;
      }
    }

    .btn-confirm {
      color: #fff;

      &.danger {
        background: #ff6b6b;
        &:hover { background: #ff5252; }
      }

      &.warning {
        background: #feca57;
        color: #1a2e35;
        &:hover { background: #fed330; }
      }

      &.primary, &:not(.danger):not(.warning) {
        background: #6c5ce7;
        box-shadow: 0 0 20px rgba(108, 92, 231, 0.3);
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(108, 92, 231, 0.4);
        }
      }
    }
  `,
})
export class ConfirmDialogComponent {
  open = input<boolean>(false);
  title = input<string>('¿Estás seguro?');
  message = input<string>('');
  icon = input<string>('⚠️');
  confirmLabel = input<string>('Confirmar');
  cancelLabel = input<string>('Cancelar');
  variant = input<'primary' | 'danger' | 'warning'>('primary');

  confirmed = output<void>();
  cancelled = output<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
