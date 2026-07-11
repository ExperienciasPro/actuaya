import { Component, input, computed } from '@angular/core';
import {
  SubscriptionStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../../core/models/subscription.model';

@Component({
  selector: 'um-subscription-status-badge',
  standalone: true,
  template: `
    <span class="sub-badge" [class]="variant()">
      <span class="badge-dot"></span>
      {{ label() }}
    </span>
  `,
  styles: `
    :host { display: inline-flex; }

    .sub-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      white-space: nowrap;
      transition: all 150ms ease;
    }

    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      animation: pulse-dot 2s ease-in-out infinite;
    }

    .ACTIVE {
      background: rgba(0, 184, 148, 0.12);
      color: #00b894;
      .badge-dot { background: #00b894; }
    }

    .EXPIRED {
      background: rgba(232, 67, 147, 0.12);
      color: #e84393;
      .badge-dot {
        background: #e84393;
        animation: pulse-danger 1.5s ease-in-out infinite;
      }
    }

    .TRIAL {
      background: rgba(253, 203, 110, 0.18);
      color: #d4a017;
      .badge-dot { background: #fdcb6e; }
    }

    .SUSPENDED {
      background: rgba(99, 110, 114, 0.12);
      color: #636e72;
      .badge-dot {
        background: #636e72;
        animation: none;
      }
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.85); }
    }

    @keyframes pulse-danger {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(232, 67, 147, 0.4); }
      50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(232, 67, 147, 0); }
    }
  `,
})
export class SubscriptionStatusBadgeComponent {
  variant = input<SubscriptionStatus>(SubscriptionStatus.ACTIVE);

  label = computed(() => STATUS_LABELS[this.variant()] || this.variant());
}
