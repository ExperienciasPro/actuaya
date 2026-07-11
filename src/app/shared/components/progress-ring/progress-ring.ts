import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'um-progress-ring',
  standalone: true,
  template: `
    <div class="progress-ring-wrapper" [style.width.px]="size()" [style.height.px]="size()">
      <svg [attr.viewBox]="'0 0 ' + size() + ' ' + size()" class="progress-ring-svg">
        <!-- Background circle -->
        <circle
          class="ring-bg"
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke-width]="strokeWidth()"
        />
        <!-- Progress circle -->
        <circle
          class="ring-progress"
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke-width]="strokeWidth()"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="dashOffset()"
          [style.stroke]="color()"
          stroke-linecap="round"
        />
      </svg>
      @if (showLabel()) {
        <div class="ring-label">
          <span class="ring-value">{{ value() }}%</span>
        </div>
      }
    </div>
  `,
  styles: `
    .progress-ring-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .progress-ring-svg {
      transform: rotate(-90deg);
      position: absolute;
      inset: 0;
    }

    .ring-bg {
      stroke: rgba(0, 0, 0, 0.06);
    }

    .ring-progress {
      transition: stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .ring-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .ring-value {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 1.25rem;
      color: #1a2e35;
    }
  `,
})
export class ProgressRingComponent {
  value = input<number>(0);
  size = input<number>(80);
  strokeWidth = input<number>(6);
  color = input<string>('#6c5ce7');
  showLabel = input<boolean>(true);

  center = computed(() => this.size() / 2);
  radius = computed(() => (this.size() - this.strokeWidth()) / 2);
  circumference = computed(() => 2 * Math.PI * this.radius());
  dashOffset = computed(() => {
    const pct = Math.min(100, Math.max(0, this.value()));
    return this.circumference() * (1 - pct / 100);
  });
}
