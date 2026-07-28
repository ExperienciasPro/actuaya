import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';
import { POSService } from '../../../core/services/pos.service';
import { POSCartItem, PaymentMethod } from '../../../core/models/pos.model';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'um-pos',
  standalone: true,
  imports: [FormsModule, UmIconComponent],
  styleUrl: './pos.scss',
  template: `
    <div class="pos-page">
      <!-- Top Bar -->
      <div class="pos-top-bar">
        <div class="session-info">
          @if (pos.currentSession()) {
            <div class="status-badge open" title="Caja abierta por {{ pos.currentSession()!.userName }}">
              <um-icon name="check-circle" [size]="16"></um-icon>
              Caja: {{ pos.currentSession()!.userName }}
            </div>
            <button class="btn-text" (click)="showCloseModal.set(true)">Cerrar Caja</button>
          } @else {
            <div class="status-badge closed">
              <um-icon name="x-circle" [size]="16"></um-icon>
              Caja Cerrada
            </div>
            <button class="btn-primary" (click)="showOpenModal.set(true)">Abrir Caja</button>
          }
        </div>

        <div class="today-stats">
          <div class="stat-item">
            <span class="label">Ventas hoy:</span>
            <span class="value">{{ pos.todayCount() }}</span>
          </div>
          <div class="stat-item">
            <span class="label">Total hoy:</span>
            <span class="value">{{ fmt(pos.todayTotal()) }}</span>
          </div>
          @if (pos.lowStockAlerts().length > 0) {
            <div class="alert-badge">
              <um-icon name="alert-triangle" [size]="16"></um-icon>
              {{ pos.lowStockAlerts().length }} Stock bajo
            </div>
          }
        </div>
      </div>

      <div class="pos-body">
        <!-- Left Panel: Products -->
        <div class="pos-products">
          <!-- Source Selector -->
          <div class="source-selector animate-fadeInUp">
            <button [class.active]="uiSource() === 'menu'" (click)="setSource('menu')">
              <span class="emoji">🍽️</span> Menú
            </button>
            <button [class.active]="uiSource() === 'catalog'" (click)="setSource('catalog')">
              <span class="emoji">📦</span> Inventario
            </button>
            <button [class.active]="uiSource() === 'manual'" (click)="setSource('manual')">
              <span class="emoji">✏️</span> Manual
            </button>
          </div>

          @if (uiSource() !== 'manual') {
            <div class="search-bar animate-fadeInUp stagger-1">
              <um-icon name="search" [size]="20"></um-icon>
              <input
                type="text"
                placeholder="Buscar producto por nombre o código..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)">
            </div>

            <div class="category-filters animate-fadeInUp stagger-2">
              <button
                class="pill"
                [class.active]="selectedCategory() === 'all'"
                (click)="selectedCategory.set('all')">
                Todos
              </button>
              @for (cat of pos.productCategories(); track cat) {
                <button
                  class="pill"
                  [class.active]="selectedCategory() === cat"
                  (click)="selectedCategory.set(cat)">
                  {{ cat }}
                </button>
              }
            </div>

            <div class="product-grid animate-fadeInUp stagger-3">
              @for (product of filteredProducts(); track product.id) {
                <div class="product-card" (click)="addToCart(product)">
                  <div class="product-info">
                    <div class="product-name">{{ product.name }}</div>
                    <div class="product-price">{{ fmt(product.salePrice) }}</div>
                  </div>

                  <div class="product-meta">
                    @if (product.trackInventory) {
                      <div class="stock-badge" [class.low]="product.currentStock <= product.minStock" [class.out]="product.currentStock === 0">
                        {{ product.currentStock }} {{ product.unit }}
                      </div>
                    } @else {
                      <div class="stock-badge grey">∞</div>
                    }
                    <button class="btn-add">
                      <um-icon name="plus" [size]="16"></um-icon>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty-products">
                  <p>No se encontraron productos.</p>
                </div>
              }
            </div>
          } @else {
            <div class="manual-product-form animate-fadeInUp stagger-1">
              <h3>Agregar Producto Manual</h3>
              <p class="help-text">Usa esta opción para ventas esporádicas o servicios que no están en catálogo.</p>
              
              <div class="form-group">
                <label>Nombre del producto o servicio</label>
                <input type="text" [(ngModel)]="manualProductName" placeholder="Ej. Propina, Empaque, etc.">
              </div>
              
              <div class="form-group">
                <label>Precio</label>
                <input type="number" [(ngModel)]="manualProductPrice" placeholder="0" min="0">
              </div>
              
              <button class="btn-primary" 
                      [disabled]="!manualProductName || !manualProductPrice"
                      (click)="addManualProduct()">
                Agregar al pedido
              </button>
            </div>
          }
        </div>

        <!-- Right Panel: Cart -->
        <div class="pos-cart animate-fadeInUp stagger-4">
          <div class="cart-header">
            <h3>Pedido Actual</h3>
            @if (cartItemCount() > 0) {
              <span class="item-count">{{ cartItemCount() }} arts</span>
            }
          </div>

          <div class="cart-items">
            @for (item of cart(); track item.productId) {
              <div class="cart-item">
                <div class="item-details">
                  <div class="item-name">{{ item.name }}</div>
                  <div class="item-price">{{ fmt(item.unitPrice) }}</div>
                </div>

                <div class="qty-controls">
                  <button (click)="updateQty(item.productId, -1)">-</button>
                  <span>{{ item.quantity }}</span>
                  <button (click)="updateQty(item.productId, 1)">+</button>
                </div>

                <div class="item-subtotal">
                  {{ fmt(item.quantity * item.unitPrice) }}
                </div>

                <button class="btn-remove" (click)="removeFromCart(item.productId)">
                  <um-icon name="trash-2" [size]="16"></um-icon>
                </button>
              </div>
            } @empty {
              <div class="empty-cart">
                <um-icon name="shopping-cart" [size]="48"></um-icon>
                <p>El carrito está vacío</p>
              </div>
            }
          </div>

          <div class="cart-summary">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>{{ fmt(cartSubtotal()) }}</span>
            </div>

            <div class="summary-row discount-row">
              <span>Descuento</span>
              <input type="number" [(ngModel)]="discount" placeholder="0" min="0">
            </div>

            <div class="summary-row total-row">
              <span>Total</span>
              <span>{{ fmt(cartTotal()) }}</span>
            </div>

            <div class="payment-methods">
              <button
                [class.active]="paymentMethod() === 'efectivo'"
                (click)="paymentMethod.set('efectivo')">
                💵 Efectivo
              </button>
              <button
                [class.active]="paymentMethod() === 'tarjeta'"
                (click)="paymentMethod.set('tarjeta')">
                💳 Tarjeta
              </button>
              <button
                [class.active]="paymentMethod() === 'transferencia'"
                (click)="paymentMethod.set('transferencia')">
                🏦 Transfer.
              </button>
            </div>

            @if (paymentMethod() === 'efectivo') {
              <div class="cash-input">
                <label>Efectivo Recibido:</label>
                <input type="number" [(ngModel)]="cashReceived" min="0">
                @if (cashReceived > 0) {
                  <div class="change-display">
                    Cambio: <strong>{{ fmt(changeAmount()) }}</strong>
                  </div>
                }
              </div>
            }

            <button
              class="btn-checkout"
              [disabled]="cart().length === 0 || !pos.currentSession()"
              (click)="checkout()">
              COBRAR {{ fmt(cartTotal()) }}
            </button>

            @if (!pos.currentSession()) {
              <div class="session-warning">Abre la caja para poder cobrar</div>
            }

            @if (errorMsg()) {
              <div class="error-msg">{{ errorMsg() }}</div>
            }

            <button class="btn-history-toggle" (click)="showHistory.set(true)">
              Ver historial del día
            </button>
          </div>
        </div>
      </div>

      <!-- Open Session Modal -->
      @if (showOpenModal()) {
        <div class="session-modal-backdrop" (click)="showOpenModal.set(false)">
          <div class="session-modal-card animate-fadeInUp" (click)="$event.stopPropagation()">
            <h2>Abrir Caja</h2>
            <div class="form-group">
              <label>Efectivo inicial en caja</label>
              <input type="number" [(ngModel)]="openingCash" placeholder="0" min="0">
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showOpenModal.set(false)">Cancelar</button>
              <button class="btn-primary" (click)="openSession()">Abrir Caja</button>
            </div>
          </div>
        </div>
      }

      <!-- Close Session Modal -->
      @if (showCloseModal()) {
        <div class="session-modal-backdrop" (click)="showCloseModal.set(false)">
          <div class="session-modal-card animate-fadeInUp" (click)="$event.stopPropagation()">
            <h2>Cerrar Caja</h2>
            <div class="session-summary">
              <p>Ventas del turno: <strong>{{ pos.currentSession()!.salesCount }}</strong></p>
              <p>Total vendido: <strong>{{ fmt(pos.currentSession()!.totalSales) }}</strong></p>
            </div>
            <div class="form-group">
              <label>Efectivo contado en caja</label>
              <input type="number" [(ngModel)]="closingCash" placeholder="0" min="0">
            </div>
            <div class="form-group" style="margin-top: 16px;">
              <label>Notas (opcional)</label>
              <textarea [(ngModel)]="closingNotes" rows="2" placeholder="Ej. Faltante por..."></textarea>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showCloseModal.set(false)">Cancelar</button>
              <button class="btn-danger" (click)="closeSession()">Cerrar Caja</button>
            </div>
          </div>
        </div>
      }

      <!-- History Panel -->
      @if (showHistory()) {
        <div class="history-backdrop" (click)="showHistory.set(false)">
          <div class="history-panel animate-fadeInUp" (click)="$event.stopPropagation()">
            <div class="history-header">
              <h2>Historial del Día</h2>
              <button class="btn-close" (click)="showHistory.set(false)">
                <um-icon name="x" [size]="24"></um-icon>
              </button>
            </div>
            <div class="history-content">
              @for (sale of pos.todaySales(); track sale.id) {
                <div class="history-item" [class.voided]="sale.voided">
                  <div class="history-item-main">
                    <span class="time">{{ formatTime(sale.createdAt) }}</span>
                    <span class="total">{{ fmt(sale.total) }}</span>
                  </div>
                  <div class="history-item-sub">
                    <span class="method">{{ sale.paymentMethod }}</span>
                    <span class="items">{{ sale.items.length }} arts</span>
                    @if (!sale.voided) {
                      <button class="btn-void" (click)="voidSale(sale.id)">Anular</button>
                    } @else {
                      <span class="void-label">Anulada</span>
                    }
                  </div>
                </div>
              } @empty {
                <p class="empty-msg">No hay ventas todavía hoy.</p>
              }
            </div>
          </div>
        </div>
      }

      <!-- Success Flash -->
      @if (saleSuccess()) {
        <div class="sale-success-flash">
          <div class="success-content animate-fadeInUp">
            <um-icon name="check-circle" [size]="64"></um-icon>
            <h2>¡Venta Registrada!</h2>
          </div>
        </div>
      }
    </div>
  `
})
export class PosComponent {
  pos = inject(POSService);

  uiSource = signal<'menu' | 'catalog' | 'manual'>(this.pos.productSource());

  searchQuery = signal('');
  selectedCategory = signal('all');
  cart = signal<POSCartItem[]>([]);
  paymentMethod = signal<PaymentMethod>('efectivo');
  errorMsg = signal('');

  manualProductName = '';
  manualProductPrice: number | null = null;

  cashReceived: number = 0;
  discount: number = 0;
  openingCash: number = 0;
  closingCash: number = 0;
  closingNotes: string = '';

  showOpenModal = signal(false);
  showCloseModal = signal(false);
  showHistory = signal(false);
  saleSuccess = signal(false);

  filteredProducts = computed(() => {
    let products = this.pos.availableProducts();
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();

    if (category !== 'all') {
      products = products.filter(p => p.category === category);
    }

    if (query) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query))
      );
    }

    return products;
  });

  cartSubtotal = computed(() =>
    this.cart().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  );

  cartTotal = computed(() =>
    Math.max(0, this.cartSubtotal() - this.discount)
  );

  cartItemCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0)
  );

  changeAmount = computed(() =>
    Math.max(0, this.cashReceived - this.cartTotal())
  );

  setSource(source: 'menu' | 'catalog' | 'manual') {
    this.uiSource.set(source);
    if (source === 'menu' || source === 'catalog') {
      this.pos.setProductSource(source);
    }
  }

  addManualProduct() {
    if (!this.manualProductName || !this.manualProductPrice || this.manualProductPrice <= 0) {
      return;
    }
    
    const manualProduct: Product = {
      id: 'manual-' + Date.now(),
      name: this.manualProductName,
      description: 'Producto ingresado manualmente',
      sku: '',
      salePrice: this.manualProductPrice,
      costPrice: 0,
      unit: 'unidad',
      category: 'General',
      currentStock: 9999,
      minStock: 0,
      active: true,
      trackInventory: false,
      createdAt: new Date().toISOString()
    };
    
    this.addToCart(manualProduct);
    
    // Reset form
    this.manualProductName = '';
    this.manualProductPrice = null;
  }

  addToCart(product: Product) {
    this.cart.update(items => {
      const existing = items.find(i => i.productId === product.id);
      if (existing) {
        return items.map(i => i.productId === product.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
        );
      }
      return [...items, {
        productId: product.id,
        name: product.name,
        unitPrice: product.salePrice,
        costPrice: product.costPrice,
        quantity: 1,
        maxStock: product.currentStock,
        unit: product.unit,
      }];
    });
  }

  removeFromCart(productId: string) {
    this.cart.update(items => items.filter(i => i.productId !== productId));
  }

  updateQty(productId: string, delta: number) {
    this.cart.update(items => items.map(i => {
      if (i.productId === productId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  }

  clearCart() {
    this.cart.set([]);
    this.discount = 0;
    this.cashReceived = 0;
    this.errorMsg.set('');
  }

  checkout() {
    if (this.cart().length === 0 || !this.pos.currentSession()) return;

    const result = this.pos.registerSale(
      this.cart(),
      this.paymentMethod(),
      this.discount,
      this.paymentMethod() === 'efectivo' ? this.cashReceived : undefined
    );

    if (result.success) {
      this.errorMsg.set('');
      this.saleSuccess.set(true);
      setTimeout(() => {
        this.saleSuccess.set(false);
        this.clearCart();
      }, 1500);
    } else {
      this.errorMsg.set(result.error || 'Error al registrar la venta.');
    }
  }

  voidSale(saleId: string) {
    this.pos.voidSale(saleId);
  }

  openSession() {
    this.pos.openSession(this.openingCash);
    this.showOpenModal.set(false);
    this.openingCash = 0;
  }

  closeSession() {
    const session = this.pos.currentSession();
    if (session) {
      this.pos.closeSession(session.id, this.closingCash, this.closingNotes);
    }
    this.showCloseModal.set(false);
    this.closingCash = 0;
    this.closingNotes = '';
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(n || 0);
  }
}
