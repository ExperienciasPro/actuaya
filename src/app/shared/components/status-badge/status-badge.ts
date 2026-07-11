import { Component, input, computed } from '@angular/core';

type BadgeVariant = 'not_started' | 'in_progress' | 'completed' | 'paused' | 'blocked' | 'pending' | 'skipped' | 'planning' | 'active' | 'on_hold' | 'cancelled';

@Component({
  selector: 'um-status-badge',
  standalone: true,
  template: `
    <span class="status-badge" [class]="variant()">
      <span class="badge-dot"></span>
      {{ label() }}
    </span>
  `,
  styles: `
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.025em;
      white-space: nowrap;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .not_started, .pending, .planning {
      background: rgba(90, 100, 120, 0.2);
      color: #8b95a9;
      .badge-dot { background: #8b95a9; }
    }

    .in_progress, .active {
      background: rgba(108, 92, 231, 0.15);
      color: #a29bfe;
      .badge-dot { background: #6c5ce7; }
    }

    .completed {
      background: rgba(0, 206, 201, 0.15);
      color: #55efc4;
      .badge-dot { background: #00cec9; }
    }

    .paused, .on_hold {
      background: rgba(254, 202, 87, 0.15);
      color: #feca57;
      .badge-dot { background: #feca57; }
    }

    .blocked, .cancelled {
      background: rgba(255, 107, 107, 0.15);
      color: #ff6b6b;
      .badge-dot { background: #ff6b6b; }
    }

    .skipped {
      background: rgba(139, 149, 169, 0.1);
      color: #5a6478;
      .badge-dot { background: #5a6478; }
    }
  `,
})
export class StatusBadgeComponent {
  variant = input<BadgeVariant>('not_started');

  private labels: Record<BadgeVariant, string> = {
    not_started: 'Sin iniciar',
    in_progress: 'En progreso',
    completed: 'Completado',
    paused: 'Pausado',
    blocked: 'Bloqueado',
    pending: 'Pendiente',
    skipped: 'Omitido',
    planning: 'Planificando',
    active: 'Activo',
    on_hold: 'En espera',
    cancelled: 'Cancelado',
  };

  label = computed(() => this.labels[this.variant()] || this.variant());
}
