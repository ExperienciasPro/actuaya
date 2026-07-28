import { Component, Input, Output, EventEmitter, computed, signal, HostListener, ElementRef, inject } from '@angular/core';
import { Table, TableOrder } from '../../../core/models/gastro.model';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';

@Component({
  selector: 'um-table-card',
  standalone: true,
  imports: [UmIconComponent],
  template: `
    <div class="table-card" 
         [class]="table.status"
         [class.selected]="selected"
         [style.left.px]="table.x || 0"
         [style.top.px]="table.y || 0"
         (mousedown)="onMouseDown($event)"
         (click)="onClick()">
      
      <div class="table-header">
        <span class="table-name">{{ table.label }}</span>
        <div class="capacity-badge">
          <um-icon name="users" [size]="12"></um-icon>
          {{ order ? order.guestCount : table.capacity }}
        </div>
      </div>
      
      @if (order) {
        <div class="order-info">
          <div class="amount">{{ fmt(order.total) }}</div>
          <div class="time">{{ timeOpen }}</div>
        </div>
      } @else {
        <div class="empty-state">
          Disponible
        </div>
      }
    </div>
  `,
  styles: [`
    .table-card {
      position: absolute;
      width: 140px;
      height: 100px;
      background: white;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 2px solid transparent;
      user-select: none;
      transition: box-shadow 0.2s, transform 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      }

      &.selected {
        box-shadow: 0 0 0 4px rgba(108, 60, 233, 0.3);
        border-color: #6c3ce9;
        z-index: 10;
      }

      &.available {
        border-left: 4px solid #10b981;
      }
      &.occupied {
        border-left: 4px solid #f59e0b;
        background: #fffbeb;
      }
      &.reserved {
        border-left: 4px solid #64748b;
        background: #f8fafc;
      }
      &.billing {
        border-left: 4px solid #ef4444;
        background: #fef2f2;
      }

      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .table-name {
          font-weight: 700;
          font-size: 15px;
          color: #1e293b;
        }

        .capacity-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #64748b;
          background: rgba(0,0,0,0.05);
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        }
      }

      .order-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        
        .amount {
          font-weight: 800;
          font-size: 16px;
          color: #1e293b;
        }
        
        .time {
          font-size: 12px;
          color: #64748b;
        }
      }

      .empty-state {
        text-align: right;
        font-size: 13px;
        color: #10b981;
        font-weight: 600;
      }
    }
  `]
})
export class TableCardComponent {
  @Input({ required: true }) table!: Table;
  @Input() order?: TableOrder;
  @Input() selected: boolean = false;
  
  @Output() tableClick = new EventEmitter<Table>();
  @Output() positionChange = new EventEmitter<{id: string, x: number, y: number}>();

  private el = inject(ElementRef);
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private initialX = 0;
  private initialY = 0;
  private hasMoved = false;

  get timeOpen(): string {
    if (!this.order) return '';
    const start = new Date(this.order.openedAt).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - start) / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(n || 0);
  }

  onClick() {
    if (!this.hasMoved) {
      this.tableClick.emit(this.table);
    }
  }

  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return; // Only left click
    event.preventDefault(); // Prevent text selection
    
    this.isDragging = true;
    this.hasMoved = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialX = this.table.x || 0;
    this.initialY = this.table.y || 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.hasMoved = true;
      }

      // Allow dragging but don't commit until mouseup
      // Update local styles directly for smooth 60fps drag
      this.el.nativeElement.firstElementChild.style.left = `${this.initialX + dx}px`;
      this.el.nativeElement.firstElementChild.style.top = `${this.initialY + dy}px`;
    };

    const onMouseUp = (e: MouseEvent) => {
      this.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (this.hasMoved) {
        const finalX = this.initialX + (e.clientX - this.dragStartX);
        const finalY = this.initialY + (e.clientY - this.dragStartY);
        
        // Grid snapping (snap to 20px grid)
        const snapX = Math.round(finalX / 20) * 20;
        const snapY = Math.round(finalY / 20) * 20;

        // Bounding box limits (rough estimate of container)
        const boundX = Math.max(0, snapX);
        const boundY = Math.max(0, snapY);

        this.positionChange.emit({ id: this.table.id, x: boundX, y: boundY });
        
        // Reset local inline styles, let Angular bindings take over
        this.el.nativeElement.firstElementChild.style.left = null;
        this.el.nativeElement.firstElementChild.style.top = null;
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}
