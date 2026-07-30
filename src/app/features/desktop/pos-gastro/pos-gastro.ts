import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';
import { GastroService } from '../../../core/services/gastro.service';
import { POSService } from '../../../core/services/pos.service';
import { Table, Zone, TableOrder } from '../../../core/models/gastro.model';
import { Product } from '../../../core/models/product.model';
import { PaymentMethod } from '../../../core/models/pos.model';
import { TableCardComponent } from './table-card';

@Component({
  selector: 'um-pos-gastro',
  standalone: true,
  imports: [FormsModule, UmIconComponent, TableCardComponent],
  styleUrl: './pos-gastro.scss',
  template: `
    <div class="gastro-page">
      <!-- Top Bar -->
      <div class="gastro-top-bar">
        <div class="session-info">
          <div class="gastro-mode-badge">🍽️ Gastro</div>
          @if (pos.currentSession()) {
            <div class="status-badge open">
              <um-icon name="check-circle" [size]="16"></um-icon>
              Caja: {{ pos.currentSession()!.userName }}
            </div>
            <button class="btn-text" (click)="posOpen = false; showCloseBoxModal = true">Cerrar Caja</button>
          } @else {
            <div class="status-badge closed">
              <um-icon name="x-circle" [size]="16"></um-icon>
              Caja Cerrada
            </div>
            <button class="btn-primary" (click)="posOpen = true; showOpenBoxModal = true">Abrir Caja</button>
          }
        </div>

        <div class="zone-tabs">
          @for (zone of gastro.zones(); track zone.id) {
            <button class="zone-tab" [class.active]="activeZoneId() === zone.id" (click)="activeZoneId.set(zone.id)">
              {{ zone.name }}
            </button>
          }
          <button class="btn-text" (click)="showSettingsModal = true">
            <um-icon name="settings" [size]="16"></um-icon>
          </button>
        </div>

        <div class="summary-stats">
          <div class="stat-badge"><div class="dot available"></div> Libres: {{ gastro.tableStatusSummary().available }}</div>
          <div class="stat-badge"><div class="dot occupied"></div> Ocupadas: {{ gastro.tableStatusSummary().occupied }}</div>
        </div>
      </div>

      <div class="gastro-body">
        <!-- Map Panel -->
        <div class="gastro-map">
          @for (table of activeZoneTables(); track table.id) {
            <um-table-card
              [table]="table"
              [order]="getOrderForTable(table.id)"
              [selected]="selectedTable()?.id === table.id"
              (tableClick)="onTableClick($event)"
              (positionChange)="onTablePositionChange($event)">
            </um-table-card>
          }
          <!-- Add Table Button -->
          <button class="add-table-card" (click)="showSettingsModal = true" title="Agregar mesa">
            <um-icon name="plus" [size]="32"></um-icon>
            <span>Nueva Mesa</span>
          </button>
        </div>

        <!-- Order Detail Panel -->
        <div class="gastro-order">
          @if (selectedTable()) {
            <div class="order-header">
              <div class="table-info">
                <h3>{{ selectedTable()!.label }}</h3>
                @if (activeOrder()) {
                  <span class="status open">Abierta</span>
                }
              </div>
              <div class="meta">
                <span title="Capacidad / Comensales">
                  <um-icon name="users" [size]="14"></um-icon>
                  {{ activeOrder() ? activeOrder()!.guestCount : selectedTable()!.capacity }}
                </span>
                @if (activeOrder()) {
                  <span>
                    <um-icon name="clock" [size]="14"></um-icon>
                    {{ formatTime(activeOrder()!.openedAt) }}
                  </span>
                }
              </div>
            </div>

            @if (activeOrder()) {
              <div class="order-items">
                @for (item of activeOrder()!.items; track item.id) {
                  <div class="order-item">
                    <div class="qty">{{ item.quantity }}</div>
                    <div class="details">
                      <div class="name">{{ item.name }}</div>
                      @if (item.notes) {
                        <div class="notes">{{ item.notes }}</div>
                      }
                    </div>
                    <div class="subtotal">{{ fmt(item.subtotal) }}</div>
                    <button class="btn-remove" (click)="removeItem(item.id)">
                      <um-icon name="x" [size]="16"></um-icon>
                    </button>
                  </div>
                } @empty {
                  <div class="empty-order">No hay productos en esta cuenta.</div>
                }

                <button class="btn-add-products" (click)="showProductModal = true">
                  <um-icon name="plus" [size]="18"></um-icon> Agregar Productos
                </button>
              </div>

              <div class="order-summary">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>{{ fmt(activeOrder()!.subtotal) }}</span>
                </div>
                <div class="summary-row tip-row">
                  <span>Propina</span>
                  <input type="number" [ngModel]="tipInput()" (ngModelChange)="updateTip($event)" min="0">
                </div>
                <div class="summary-row total">
                  <span>Total</span>
                  <span>{{ fmt(activeOrder()!.total) }}</span>
                </div>
                <button class="btn-checkout" (click)="showCheckoutModal = true" [disabled]="activeOrder()!.items.length === 0">
                  COBRAR {{ fmt(activeOrder()!.total) }}
                </button>
              </div>
            } @else {
              <!-- Empty state for un-opened table -->
              <div class="empty-selection" style="padding: 24px;">
                <p>Mesa Libre</p>
                <div class="form-group" style="width: 100%; margin-top: 20px;">
                  <label>Número de Comensales</label>
                  <input type="number" [(ngModel)]="guestCount" min="1" max="20" style="width: 100%; text-align: center; font-size: 20px;">
                </div>
                <button class="btn-primary" style="width: 100%; margin-top: 16px;" (click)="openTable()">Abrir Mesa</button>
              </div>
            }
          } @else {
            <div class="empty-selection">
              <um-icon name="layout" [size]="48"></um-icon>
              <p>Selecciona una mesa para ver detalles</p>
            </div>
          }
        </div>
      </div>

      <!-- Settings / Setup Modal -->
      @if (showSettingsModal) {
        <div class="modal-backdrop" (click)="showSettingsModal = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Configurar Zonas y Mesas</h2>
              <button class="btn-close" (click)="showSettingsModal = false"><um-icon name="x" [size]="24"></um-icon></button>
            </div>
            
            <div class="form-group">
              <label>Agregar Zona</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" [(ngModel)]="newZoneName" placeholder="Ej. Terraza">
                <button class="btn-primary" (click)="addZone()">Agregar</button>
              </div>
            </div>

            @if (gastro.zones().length > 0) {
              <div class="form-group" style="margin-top: 24px;">
                <label>Agregar Mesa a {{ activeZone()?.name }}</label>
                <div style="display: flex; gap: 8px;">
                  <input type="text" [(ngModel)]="newTableLabel" placeholder="Ej. T1">
                  <input type="number" [(ngModel)]="newTableCap" placeholder="Sillas" style="width: 80px;">
                  <button class="btn-primary" (click)="addTable()">Agregar</button>
                </div>
              </div>
            }

            <div class="modal-actions">
              <button class="btn-primary" (click)="showSettingsModal = false">Cerrar</button>
            </div>
          </div>
        </div>
      }

      <!-- Add Product Modal -->
      @if (showProductModal) {
        <div class="modal-backdrop" (click)="showProductModal = false">
          <div class="modal-card large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Agregar Productos a {{ selectedTable()?.label }}</h2>
              <button class="btn-close" (click)="showProductModal = false"><um-icon name="x" [size]="24"></um-icon></button>
            </div>
            
            <div class="product-selector">
              <input type="text" class="search-box" placeholder="Buscar producto..." [(ngModel)]="prodSearchQuery">
              
              <div class="category-pills">
                <button [class.active]="prodCategory() === 'all'" (click)="prodCategory.set('all')">Todos</button>
                @for (cat of pos.productCategories(); track cat) {
                  <button [class.active]="prodCategory() === cat" (click)="prodCategory.set(cat)">{{ cat }}</button>
                }
              </div>

              <div class="product-list">
                @for (p of filteredProducts(); track p.id) {
                  <div class="product-item" (click)="addProductToOrder(p)">
                    <span class="p-name">{{ p.name }}</span>
                    <span class="p-price">{{ fmt(p.salePrice) }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Item Add / Notes Modal -->
      @if (showItemAddModal && pendingItem) {
        <div class="modal-backdrop" (click)="showItemAddModal = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h2>{{ pendingItem.name }}</h2>
            <div class="form-group">
              <label>Cantidad</label>
              <input type="number" [(ngModel)]="pendingItemQty" min="1">
            </div>
            <div class="form-group">
              <label>Notas (opcional)</label>
              <input type="text" [(ngModel)]="pendingItemNotes" placeholder="Ej. Sin cebolla">
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showItemAddModal = false">Cancelar</button>
              <button class="btn-primary" (click)="confirmAddItem()">Agregar a la cuenta</button>
            </div>
          </div>
        </div>
      }

      <!-- Checkout Modal -->
      @if (showCheckoutModal && activeOrder()) {
        <div class="modal-backdrop" (click)="showCheckoutModal = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Cobrar Mesa {{ activeOrder()!.tableName }}</h2>
              <button class="btn-close" (click)="showCheckoutModal = false"><um-icon name="x" [size]="24"></um-icon></button>
            </div>
            
            <h1 style="text-align: center; font-size: 36px; color: var(--accent); margin: 20px 0;">
              {{ fmt(activeOrder()!.total) }}
            </h1>

            <div class="payment-methods">
              <button [class.active]="paymentMethod === 'efectivo'" (click)="paymentMethod = 'efectivo'">💵 Efectivo</button>
              <button [class.active]="paymentMethod === 'tarjeta'" (click)="paymentMethod = 'tarjeta'">💳 Tarjeta</button>
              <button [class.active]="paymentMethod === 'transferencia'" (click)="paymentMethod = 'transferencia'">🏦 Transf.</button>
            </div>

            @if (paymentMethod === 'efectivo') {
              <div class="form-group">
                <label>Efectivo Recibido</label>
                <input type="number" [(ngModel)]="cashReceived" min="0">
                @if (cashReceived > activeOrder()!.total) {
                  <div style="margin-top: 8px; color: var(--success); font-weight: 600;">
                    Cambio: {{ fmt(cashReceived - activeOrder()!.total) }}
                  </div>
                }
              </div>
            }

            <div class="modal-actions">
              <button class="btn-cancel" (click)="showCheckoutModal = false">Cancelar</button>
              <button class="btn-success" (click)="confirmCheckout()">Completar Pago</button>
            </div>
          </div>
        </div>
      }

      <!-- Open/Close Box Modals -->
      @if (showOpenBoxModal) {
        <div class="modal-backdrop" (click)="showOpenBoxModal = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h2>Abrir Caja</h2>
            <div class="form-group">
              <label>Efectivo inicial en caja</label>
              <input type="number" [(ngModel)]="openingCash" min="0">
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showOpenBoxModal = false">Cancelar</button>
              <button class="btn-primary" (click)="pos.openSession(openingCash); showOpenBoxModal = false">Abrir Caja</button>
            </div>
          </div>
        </div>
      }

      @if (showCloseBoxModal) {
        <div class="modal-backdrop" (click)="showCloseBoxModal = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h2>Cerrar Caja</h2>
            <div class="form-group">
              <label>Efectivo contado</label>
              <input type="number" [(ngModel)]="closingCash" min="0">
            </div>
            <div class="form-group">
              <label>Notas</label>
              <input type="text" [(ngModel)]="closingNotes">
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showCloseBoxModal = false">Cancelar</button>
              <button class="btn-danger" (click)="pos.closeSession(pos.currentSession()!.id, closingCash, closingNotes); showCloseBoxModal = false">Cerrar Caja</button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class PosGastroComponent {
  gastro = inject(GastroService);
  pos = inject(POSService);

  activeZoneId = signal<string | null>(this.gastro.zones()[0]?.id || null);
  selectedTable = signal<Table | null>(null);

  // Settings inputs
  showSettingsModal = false;
  newZoneName = '';
  newTableLabel = '';
  newTableCap = 4;

  // Box Modal states
  posOpen = false;
  showOpenBoxModal = false;
  showCloseBoxModal = false;
  openingCash = 0;
  closingCash = 0;
  closingNotes = '';

  // Order/Checkout states
  guestCount = 2;
  showCheckoutModal = false;
  paymentMethod: PaymentMethod = 'efectivo';
  cashReceived = 0;

  // Product addition
  showProductModal = false;
  prodSearchQuery = '';
  prodCategory = signal('all');
  
  showItemAddModal = false;
  pendingItem: Product | null = null;
  pendingItemQty = 1;
  pendingItemNotes = '';

  tipInput = signal(0);

  activeZone = computed(() => this.gastro.zones().find(z => z.id === this.activeZoneId()));
  
  activeZoneTables = computed(() => {
    const zid = this.activeZoneId();
    return zid ? this.gastro.tables().filter(t => t.zoneId === zid) : [];
  });

  activeOrder = computed(() => {
    const t = this.selectedTable();
    if (!t || t.status !== 'occupied' || !t.activeOrderId) return null;
    return this.gastro.orders().find(o => o.id === t.activeOrderId);
  });

  filteredProducts = computed(() => {
    let prods = this.pos.availableProducts();
    const q = this.prodSearchQuery.toLowerCase();
    const cat = this.prodCategory();
    if (cat !== 'all') prods = prods.filter(p => p.category === cat);
    if (q) prods = prods.filter(p => p.name.toLowerCase().includes(q));
    return prods;
  });

  constructor() {
    // Gastro POS always uses menu items, not catalog products
    this.pos.setProductSource('menu');

    // If we have zones but no active one selected, select the first
    if (!this.activeZoneId() && this.gastro.zones().length > 0) {
      this.activeZoneId.set(this.gastro.zones()[0].id);
    }
  }

  getOrderForTable(tableId: string): TableOrder | undefined {
    const t = this.gastro.tables().find(tbl => tbl.id === tableId);
    if (t?.activeOrderId) {
      return this.gastro.orders().find(o => o.id === t.activeOrderId);
    }
    return undefined;
  }

  onTableClick(table: Table) {
    this.selectedTable.set(table);
    if (table.status === 'occupied' && table.activeOrderId) {
      const o = this.getOrderForTable(table.id);
      if (o) this.tipInput.set(o.tip);
    }
  }

  onTablePositionChange(evt: { id: string, x: number, y: number }) {
    this.gastro.updateTable(evt.id, { x: evt.x, y: evt.y });
  }

  openTable() {
    const t = this.selectedTable();
    if (!t || !this.pos.currentSession()) return;
    this.gastro.openTable(t.id, this.guestCount);
    // Refresh selected table ref
    this.selectedTable.set(this.gastro.tables().find(tbl => tbl.id === t.id) || null);
    this.tipInput.set(0);
  }

  addProductToOrder(prod: Product) {
    this.pendingItem = prod;
    this.pendingItemQty = 1;
    this.pendingItemNotes = '';
    this.showItemAddModal = true;
  }

  confirmAddItem() {
    const o = this.activeOrder();
    if (!o || !this.pendingItem) return;
    this.gastro.addItemToOrder(o.id, this.pendingItem, this.pendingItemQty, this.pendingItemNotes);
    this.showItemAddModal = false;
    this.pendingItem = null;
    
    // Auto tip calculation if percentage is standard? Leaving manual for now
  }

  removeItem(itemId: string) {
    const o = this.activeOrder();
    if (o) this.gastro.removeItemFromOrder(o.id, itemId);
  }

  updateTip(amount: number) {
    const o = this.activeOrder();
    if (o) {
      this.tipInput.set(amount);
      this.gastro.updateOrderTotals(o.id, o.discount, amount);
    }
  }

  confirmCheckout() {
    const o = this.activeOrder();
    if (!o) return;
    const res = this.gastro.closeTable(o.id, this.paymentMethod, this.paymentMethod === 'efectivo' ? this.cashReceived : undefined);
    if (res?.success) {
      this.showCheckoutModal = false;
      this.selectedTable.set(this.gastro.tables().find(t => t.id === o.tableId) || null);
    } else {
      alert(res?.error || 'Unknown error');
    }
  }

  addZone() {
    if (this.newZoneName) {
      const z = this.gastro.addZone(this.newZoneName);
      if (!this.activeZoneId()) this.activeZoneId.set(z.id);
      this.newZoneName = '';
    }
  }

  addTable() {
    const zId = this.activeZoneId();
    if (zId && this.newTableLabel) {
      this.gastro.addTable(zId, this.newTableLabel, this.newTableCap);
      this.newTableLabel = '';
    }
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
  }
}
