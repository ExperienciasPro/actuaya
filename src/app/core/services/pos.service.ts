import { Injectable, inject, signal, computed, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { ProductCatalogService } from './product-catalog.service';
import { MenuService } from './menu.service';
import { CashflowService } from './cashflow.service';
import { UserService } from './user.service';
import { POSSale, POSSaleItem, POSSession, POSCartItem, PaymentMethod, CashAuditEntry } from '../models/pos.model';
import { Transaction } from '../models/cashflow.model';
import { DataSyncService } from './data-sync.service';

const SALES_KEY    = 'um_pos_sales';
const SESSIONS_KEY = 'um_pos_sessions';

@Injectable({ providedIn: 'root' })
export class POSService {
  private storage = inject(StorageService);
  private productService = inject(ProductCatalogService);
  private menuService = inject(MenuService);
  private cashflowService = inject(CashflowService);
  private userService = inject(UserService);

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  // ─── State ──────────────────────────────
  private _sales = signal<POSSale[]>(this.storage.get<POSSale[]>(SALES_KEY) || []);
  private _sessions = signal<POSSession[]>(this.storage.get<POSSession[]>(SESSIONS_KEY) || []);
  
  productSource = signal<'catalog' | 'menu'>(this.storage.get<'catalog' | 'menu'>('um_pos_source') || 'catalog');

  sales = this._sales.asReadonly();
  sessions = this._sessions.asReadonly();

  constructor() {
    this.migrateLegacyData();
  }

  private migrateLegacyData() {
    const activeProfile = this.userService.profile();
    if (!activeProfile) return;
    
    let needsUpdate = false;
    this._sessions.update(sessions => sessions.map(s => {
      if (!s.userId) {
        needsUpdate = true;
        return { ...s, userId: activeProfile.id, userName: activeProfile.name };
      }
      return s;
    }));
    if (needsUpdate) this.persistSessions();

    needsUpdate = false;
    this._sales.update(sales => sales.map(s => {
      if (!s.userId) {
        needsUpdate = true;
        return { ...s, userId: activeProfile.id, userName: activeProfile.name };
      }
      return s;
    }));
    if (needsUpdate) this.persistSales();
  }

  // ─── Computed ───────────────────────────
  setProductSource(source: 'catalog' | 'menu') {
    this.productSource.set(source);
    this.storage.set('um_pos_source', source);
  }
  currentSession = computed<POSSession | null>(() => {
    const activeUserId = this.userService.profile()?.id;
    return this._sessions().find(s => s.status === 'open' && s.userId === activeUserId) ?? null;
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
  availableProducts = computed(() => {
    if (this.productSource() === 'menu') {
      return this.menuService.availableItems().map(item => ({
        id: `menu-${item.id}`,
        name: item.name,
        description: item.description,
        sku: '',
        salePrice: item.price,
        costPrice: 0,
        unit: 'unidad',
        category: item.category,
        currentStock: 9999,
        minStock: 0,
        active: true,
        trackInventory: false,
        createdAt: new Date().toISOString(),
      }));
    }
    return this.productService.products().filter(p => p.active);
  });

  /** Product categories */
  productCategories = computed(() => {
    if (this.productSource() === 'menu') {
      return this.menuService.sortedCategories().map(c => c.name);
    }
    return this.productService.categories();
  });

  // ─── Session Management ─────────────────
  openSession(openingCash: number): POSSession {
    const activeProfile = this.userService.profile();
    if (!activeProfile) throw new Error('No user profile active.');

    // Close any open session for THIS user first
    const existing = this.currentSession();
    if (existing) {
      this.closeSession(existing.id, openingCash);
    }

    const session: POSSession = {
      id: 'ses-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      userId: activeProfile.id,
      userName: activeProfile.name,
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

  closeSession(sessionId: string, closingCash: number, notes?: string): void {
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
        notes
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
    const activeProfile = this.userService.profile();
    if (!session || !activeProfile) {
      return { success: false, error: 'No hay un turno de caja abierto para el usuario actual.' };
    }

    // Validate stock
    for (const item of items) {
      if (item.productId.startsWith('menu-') || item.productId.startsWith('manual-')) {
        continue; // Skip validation for menu and manual items
      }
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
      userId: activeProfile.id,
      userName: activeProfile.name,
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
      if (item.productId.startsWith('menu-') || item.productId.startsWith('manual-')) {
        continue;
      }
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
      if (item.productId.startsWith('menu-') || item.productId.startsWith('manual-')) {
        continue;
      }
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

  // ─── Audit ──────────────────────────────
  sessionsByUser(userId: string, startDate: string, endDate: string): POSSession[] {
    return this._sessions().filter(s => {
      const date = s.openedAt.split('T')[0];
      return s.userId === userId && date >= startDate && date <= endDate;
    });
  }

  salesByUser(userId: string, startDate: string, endDate: string): POSSale[] {
    return this._sales().filter(s =>
      s.userId === userId && s.date >= startDate && s.date <= endDate
    );
  }

  auditReport(startDate: string, endDate: string): CashAuditEntry[] {
    const sessions = this._sessions().filter(s => {
      const date = s.openedAt.split('T')[0];
      return s.status === 'closed' && date >= startDate && date <= endDate;
    });

    return sessions.map(s => ({
      sessionId: s.id,
      userId: s.userId,
      userName: s.userName,
      openedAt: s.openedAt,
      closedAt: s.closedAt!,
      openingCash: s.openingCash,
      closingCash: s.closingCash || 0,
      expectedCash: s.expectedCash || 0,
      difference: s.difference || 0,
      salesCount: s.salesCount,
      totalSales: s.totalSales,
      notes: s.notes
    }));
  }

  // ─── Persistence ────────────────────────
  private persistSales(): void {
    this.storage.set(SALES_KEY, this._sales());
    this.dataSync.trackLocalModification(SALES_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private persistSessions(): void {
    this.storage.set(SESSIONS_KEY, this._sessions());
    this.dataSync.trackLocalModification(SESSIONS_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
