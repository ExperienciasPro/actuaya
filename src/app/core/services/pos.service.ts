import { Injectable, inject, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { ProductCatalogService } from './product-catalog.service';
import { CashflowService } from './cashflow.service';
import { POSSale, POSSaleItem, POSSession, POSCartItem, PaymentMethod } from '../models/pos.model';
import { Transaction } from '../models/cashflow.model';

const SALES_KEY    = 'um_pos_sales';
const SESSIONS_KEY = 'um_pos_sessions';

@Injectable({ providedIn: 'root' })
export class POSService {
  private storage = inject(StorageService);
  private productService = inject(ProductCatalogService);
  private cashflowService = inject(CashflowService);

  // ─── State ──────────────────────────────
  private _sales = signal<POSSale[]>(this.storage.get<POSSale[]>(SALES_KEY) || []);
  private _sessions = signal<POSSession[]>(this.storage.get<POSSession[]>(SESSIONS_KEY) || []);

  sales = this._sales.asReadonly();
  sessions = this._sessions.asReadonly();

  // ─── Computed ───────────────────────────
  currentSession = computed<POSSession | null>(() => {
    return this._sessions().find(s => s.status === 'open') ?? null;
  });

  todaySales = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this._sales().filter(s => s.date === today && !s.voided);
  });

  todayTotal = computed(() =>
    this.todaySales().reduce((sum, s) => sum + s.total, 0)
  );

  todayCount = computed(() => this.todaySales().length);

  /** Products with stock at or below minimum */
  lowStockAlerts = computed(() =>
    this.productService.products().filter(
      p => p.trackInventory && p.active && p.currentStock <= p.minStock
    )
  );

  /** All active products available for sale */
  availableProducts = computed(() =>
    this.productService.products().filter(p => p.active)
  );

  /** Product categories */
  productCategories = computed(() =>
    this.productService.categories()
  );

  // ─── Session Management ─────────────────
  openSession(openingCash: number): POSSession {
    // Close any open session first
    const existing = this.currentSession();
    if (existing) {
      this.closeSession(existing.id, openingCash);
    }

    const session: POSSession = {
      id: 'ses-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      openedAt: new Date().toISOString(),
      openingCash,
      salesCount: 0,
      totalSales: 0,
      status: 'open',
    };

    this._sessions.update(list => [session, ...list]);
    this.persistSessions();
    return session;
  }

  closeSession(sessionId: string, closingCash: number): void {
    this._sessions.update(list => list.map(s => {
      if (s.id !== sessionId) return s;

      // Calculate expected cash: opening + cash sales - change given
      const sessionSales = this._sales().filter(
        sale => sale.sessionId === sessionId && !sale.voided
      );
      const cashSalesTotal = sessionSales
        .filter(sale => sale.paymentMethod === 'efectivo' || sale.paymentMethod === 'mixto')
        .reduce((sum, sale) => sum + sale.total, 0);

      const expectedCash = s.openingCash + cashSalesTotal;

      return {
        ...s,
        closedAt: new Date().toISOString(),
        closingCash,
        expectedCash,
        difference: closingCash - expectedCash,
        salesCount: sessionSales.length,
        totalSales: sessionSales.reduce((sum, sale) => sum + sale.total, 0),
        status: 'closed' as const,
      };
    }));
    this.persistSessions();
  }

  // ─── Sale Registration ──────────────────
  registerSale(
    items: POSCartItem[],
    paymentMethod: PaymentMethod,
    discount: number = 0,
    cashReceived?: number,
    notes?: string
  ): { success: boolean; sale?: POSSale; error?: string } {
    const session = this.currentSession();
    if (!session) {
      return { success: false, error: 'No hay un turno de caja abierto.' };
    }

    // Validate stock
    for (const item of items) {
      const product = this.productService.getProductById(item.productId);
      if (!product) {
        return { success: false, error: `Producto "${item.name}" no encontrado.` };
      }
      if (product.trackInventory && product.currentStock < item.quantity) {
        return {
          success: false,
          error: `Stock insuficiente para "${item.name}". Disponible: ${product.currentStock} ${product.unit}.`,
        };
      }
    }

    // Build sale items
    const saleItems: POSSaleItem[] = items.map(item => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: item.costPrice,
      subtotal: item.quantity * item.unitPrice,
    }));

    const subtotal = saleItems.reduce((sum, i) => sum + i.subtotal, 0);
    const total = Math.max(0, subtotal - discount);
    const change = (paymentMethod === 'efectivo' && cashReceived) ? cashReceived - total : 0;

    const sale: POSSale = {
      id: 'pos-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      items: saleItems,
      subtotal,
      discount,
      total,
      paymentMethod,
      cashReceived: paymentMethod === 'efectivo' ? cashReceived : undefined,
      change: change > 0 ? change : undefined,
      sessionId: session.id,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      notes,
    };

    // 1. Save sale
    this._sales.update(list => [sale, ...list]);
    this.persistSales();

    // 2. Deduct inventory for each item
    for (const item of saleItems) {
      const product = this.productService.getProductById(item.productId);
      if (product && product.trackInventory) {
        this.productService.registerMovement(
          item.productId,
          'salida',
          item.quantity,
          `Venta POS #${sale.id.slice(-6)}`,
          true,  // autoGenerated
          undefined,
          sale.id
        );
      }
    }

    // 3. Register income in cashflow
    const tx: Omit<Transaction, 'id' | 'createdAt'> = {
      type: 'ingreso',
      category: 'ventas',
      description: `Venta POS — ${saleItems.map(i => `${i.name} x${i.quantity}`).join(', ')}`,
      amount: total,
      currency: 'COP',
      date: sale.date,
      notes: `POS #${sale.id.slice(-6)} · ${paymentMethod}${notes ? ' · ' + notes : ''}`,
      autoGenerated: true,
    };
    this.cashflowService.add(tx);

    // 4. Update session counters
    this._sessions.update(list => list.map(s =>
      s.id === session.id
        ? { ...s, salesCount: s.salesCount + 1, totalSales: s.totalSales + total }
        : s
    ));
    this.persistSessions();

    return { success: true, sale };
  }

  // ─── Void Sale ──────────────────────────
  voidSale(saleId: string): boolean {
    const sale = this._sales().find(s => s.id === saleId);
    if (!sale || sale.voided) return false;

    // Mark as voided
    this._sales.update(list => list.map(s =>
      s.id === saleId
        ? { ...s, voided: true, voidedAt: new Date().toISOString() }
        : s
    ));
    this.persistSales();

    // Restore inventory
    for (const item of sale.items) {
      const product = this.productService.getProductById(item.productId);
      if (product && product.trackInventory) {
        this.productService.registerMovement(
          item.productId,
          'entrada',
          item.quantity,
          `Anulación venta POS #${saleId.slice(-6)}`,
          true
        );
      }
    }

    return true;
  }

  // ─── Reports Data ───────────────────────
  salesForPeriod(startDate: string, endDate: string): POSSale[] {
    return this._sales().filter(s =>
      !s.voided && s.date >= startDate && s.date <= endDate
    );
  }

  topProducts(startDate: string, endDate: string, limit: number = 10) {
    const sales = this.salesForPeriod(startDate, endDate);
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productId) || { name: item.name, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.subtotal;
        productMap.set(item.productId, existing);
      }
    }

    return [...productMap.entries()]
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  salesByPaymentMethod(startDate: string, endDate: string) {
    const sales = this.salesForPeriod(startDate, endDate);
    const methods: Record<string, { count: number; total: number }> = {};
    for (const sale of sales) {
      const m = sale.paymentMethod;
      if (!methods[m]) methods[m] = { count: 0, total: 0 };
      methods[m].count++;
      methods[m].total += sale.total;
    }
    return methods;
  }

  dailySales(startDate: string, endDate: string) {
    const sales = this.salesForPeriod(startDate, endDate);
    const dayMap = new Map<string, number>();
    for (const sale of sales) {
      dayMap.set(sale.date, (dayMap.get(sale.date) || 0) + sale.total);
    }
    return [...dayMap.entries()]
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ─── Persistence ────────────────────────
  private persistSales(): void {
    this.storage.set(SALES_KEY, this._sales());
  }

  private persistSessions(): void {
    this.storage.set(SESSIONS_KEY, this._sessions());
  }
}
