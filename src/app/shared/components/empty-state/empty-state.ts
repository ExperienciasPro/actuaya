import { Component, input } from '@angular/core';

@Component({
  selector: 'um-empty-state',
  standalone: true,
  template: `
    <div class="empty-state" [class.compact]="compact()">
      <span class="empty-icon">{{ icon() }}</span>
      <h4 class="empty-title">{{ title() }}</h4>
      @if (subtitle()) {
        <p class="empty-subtitle">{{ subtitle() }}</p>
      }
      <div class="empty-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 24px;
      gap: 12px;

      &.compact {
        padding: 24px 16px;

        .empty-icon {
          font-size: 2rem;
        }

        .empty-title {
          font-size: 0.9375rem;
        }
      }
    }

    .empty-icon {
      font-size: 3rem;
      opacity: 0.7;
      line-height: 1;
    }

    .empty-title {
      font-size: 1.0625rem;
      font-weight: 600;
      color: #e8ecf4;
    }

    .empty-subtitle {
      font-size: 0.8125rem;
      color: #5a6478;
      max-width: 300px;
      line-height: 1.5;
    }

    .empty-actions {
      margin-top: 8px;
      display: flex;
      gap: 8px;
    }
  `,
})
export class EmptyStateComponent {
  icon = input<string>('📭');
  title = input<string>('Nada por aquí');
  subtitle = input<string>('');
  compact = input<boolean>(false);
}
