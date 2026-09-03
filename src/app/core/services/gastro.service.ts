import { Injectable, inject, signal, computed, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { POSService } from './pos.service';
import { UserService } from './user.service';
import { Zone, Table, TableOrder, TableOrderItem, TableStatusSummary } from '../models/gastro.model';
import { PaymentMethod } from '../models/pos.model';
import { Product } from '../models/product.model';
import { DataSyncService } from './data-sync.service';
const ZONES_KEY = 'um_gastro_zones';
const TABLES_KEY = 'um_gastro_tables';
const ORDERS_KEY = 'um_gastro_orders';

@Injectable({ providedIn: 'root' })
export class GastroService {
  private storage = inject(StorageService);
  private posService = inject(POSService);
  private userService = inject(UserService);

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private _zonesSignal = signal<Zone[]>(this.storage.get<Zone[]>(ZONES_KEY) || []);
  private _tablesSignal = signal<Table[]>(this.storage.get<Table[]>(TABLES_KEY) || []);
  private _ordersSignal = signal<TableOrder[]>(this.storage.get<TableOrder[]>(ORDERS_KEY) || []);

  zones = computed(() => this._zonesSignal().filter(z => !z.isDeleted));
  tables = computed(() => this._tablesSignal().filter(t => !t.isDeleted));
  orders = computed(() => this._ordersSignal().filter(o => !o.isDeleted));

  zonesWithTables = computed(() => {
    const ts = this._tablesSignal();
    return this._zonesSignal().map(z => ({
      ...z,
      tables: ts.filter(t => t.zoneId === z.id).sort((a, b) => a.order - b.order)
    })).sort((a, b) => a.order - b.order);
  });

  tableStatusSummary = computed<TableStatusSummary>(() => {
    const ts = this._tablesSignal();
    const summary = { total: ts.length, available: 0, occupied: 0, reserved: 0, billing: 0 };
    for (const t of ts) {
      summary[t.status]++;
    }
    return summary;
  });

  activeOrders = computed(() => this._ordersSignal().filter(o => o.status === 'open'));

  // ─── Zonas ──────────────────────────────
  addZone(name: string, color: string = '#6c3ce9') {
    const zone: Zone = {
      id: 'zon-' + Date.now().toString(36),
      name,
      order: this._zonesSignal().length,
      color
    };
    this._zonesSignal.update(list => [...list, zone]);
    this.persistZones();
    return zone;
  }

  updateZone(id: string, changes: Partial<Zone>) {
    this._zonesSignal.update(list => list.map(z => z.id === id ? { ...z, ...changes } : z));
    this.persistZones();
  }

  removeZone(id: string) {
    this._zonesSignal.update(list => list.map(z => z.id === id ? { ...z, isDeleted: true, updatedAt: new Date().toISOString() } : z));
    this._tablesSignal.update(list => list.map(t => t.zoneId === id ? { ...t, isDeleted: true, updatedAt: new Date().toISOString() } : t)); // Cascading
    this.persistZones();
    this.persistTables();
    this.dataSync.saveToServerImmediate();
  }

  // ─── Mesas ──────────────────────────────
  addTable(zoneId: string, label: string, capacity: number = 4, x?: number, y?: number) {
    const tablesInZone = this._tablesSignal().filter(t => t.zoneId === zoneId).length;
    const table: Table = {
      id: 'tbl-' + Date.now().toString(36),
      zoneId,
      label,
      capacity,
      status: 'available',
      order: tablesInZone,
      x,
      y
    };
    this._tablesSignal.update(list => [...list, table]);
    this.persistTables();
    return table;
  }

  updateTable(id: string, changes: Partial<Table>) {
    this._tablesSignal.update(list => list.map(t => t.id === id ? { ...t, ...changes } : t));
    this.persistTables();
    this.dataSync.saveToServerImmediate();
  }

  removeTable(id: string) {
    this._tablesSignal.update(list => list.map(t => t.id === id ? { ...t, isDeleted: true, updatedAt: new Date().toISOString() } : t));
    this.persistTables();
    this.dataSync.saveToServerImmediate();
  }

  // ─── Cuentas / Órdenes ───────────────────
  openTable(tableId: string, guestCount: number = 1): TableOrder {
    const activeProfile = this.userService.profile();
    if (!activeProfile) throw new Error('No user profile active.');

    const table = this._tablesSignal().find(t => t.id === tableId);
    if (!table) throw new Error('Table not found');
    const zone = this._zonesSignal().find(z => z.id === table.zoneId);

    const order: TableOrder = {
      id: 'ord-' + Date.now().toString(36),
      tableId,
      tableName: table.label,
      zoneId: table.zoneId,
      zoneName: zone?.name || 'Unknown',
      items: [],
      status: 'open',
      openedAt: new Date().toISOString(),
      userId: activeProfile.id,
      userName: activeProfile.name,
      subtotal: 0,
      discount: 0,
      tip: 0,
      total: 0,
      guestCount
    };

    this._ordersSignal.update(list => [...list, order]);
    this.updateTable(tableId, { status: 'occupied', activeOrderId: order.id });
    this.persistOrders();
    return order;
  }

  addItemToOrder(orderId: string, product: Product, quantity: number, notes?: string) {
    const activeProfile = this.userService.profile();
    if (!activeProfile) return;

    this._ordersSignal.update(list => list.map(o => {
      if (o.id !== orderId) return o;

      const existingItem = o.items.find(i => i.productId === product.id && i.notes === notes);
      let newItems = [...o.items];

      if (existingItem) {
        newItems = newItems.map(i => i.id === existingItem.id ? {
          ...i,
          quantity: i.quantity + quantity,
          subtotal: (i.quantity + quantity) * i.unitPrice
        } : i);
      } else {
        const item: TableOrderItem = {
          id: 'itm-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
          productId: product.id,
          name: product.name,
          quantity,
          unitPrice: product.salePrice,
          costPrice: product.costPrice || 0,
          subtotal: quantity * product.salePrice,
          addedAt: new Date().toISOString(),
          addedBy: activeProfile.id,
          notes
        };
        newItems.push(item);
      }

      const subtotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);
      const total = Math.max(0, subtotal - o.discount) + o.tip;

      return { ...o, items: newItems, subtotal, total };
    }));
    this.persistOrders();
  }

  removeItemFromOrder(orderId: string, itemId: string) {
    this._ordersSignal.update(list => list.map(o => {
      if (o.id !== orderId) return o;
      const newItems = o.items.filter(i => i.id !== itemId);
      const subtotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);
      const total = Math.max(0, subtotal - o.discount) + o.tip;
      return { ...o, items: newItems, subtotal, total };
    }));
    this.persistOrders();
  }

  updateOrderTotals(orderId: string, discount: number, tip: number) {
    this._ordersSignal.update(list => list.map(o => {
      if (o.id !== orderId) return o;
      const total = Math.max(0, o.subtotal - discount) + tip;
      return { ...o, discount, tip, total };
    }));
    this.persistOrders();
  }

  closeTable(orderId: string, paymentMethod: PaymentMethod, cashReceived?: number, closingNotes?: string) {
    const order = this._ordersSignal().find(o => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found' };

    // Delegate to POSService to actually register the sale, move inventory, cashflow
    const cartItems = order.items.map(i => ({
      productId: i.productId,
      name: i.name,
      unitPrice: i.unitPrice,
      costPrice: i.costPrice,
      quantity: i.quantity,
      unit: 'unidad',
      maxStock: 9999
    }));

    // If there is a tip, add it as a manual cart item
    if (order.tip > 0) {
      cartItems.push({
        productId: 'manual-tip-' + Date.now(),
        name: 'Propina',
        unitPrice: order.tip,
        costPrice: 0,
        quantity: 1,
        unit: 'unidad',
        maxStock: 9999
      });
    }

    const posNotes = `Mesa: ${order.tableName} (${order.zoneName})${closingNotes ? ' - ' + closingNotes : ''}`;

    const result = this.posService.registerSale(
      cartItems,
      paymentMethod,
      order.discount,
      cashReceived,
      posNotes
    );

    if (result.success) {
      this._ordersSignal.update(list => list.map(o => 
        o.id === orderId ? { 
          ...o, 
          status: 'closed' as const, 
          closedAt: new Date().toISOString(), 
          paymentMethod 
        } : o
      ));
      this.updateTable(order.tableId, { status: 'available', activeOrderId: undefined });
      this.persistOrders();
    }

    return result;
  }

  moveTable(orderId: string, newTableId: string) {
    const order = this._ordersSignal().find(o => o.id === orderId);
    if (!order) return false;
    
    const oldTableId = order.tableId;
    const newTable = this._tablesSignal().find(t => t.id === newTableId);
    if (!newTable || newTable.status === 'occupied') return false;

    const zone = this._zonesSignal().find(z => z.id === newTable.zoneId);

    this._ordersSignal.update(list => list.map(o => 
      o.id === orderId ? {
        ...o,
        tableId: newTableId,
        tableName: newTable.label,
        zoneId: newTable.zoneId,
        zoneName: zone?.name || 'Unknown'
      } : o
    ));

    this.updateTable(oldTableId, { status: 'available', activeOrderId: undefined });
    this.updateTable(newTableId, { status: 'occupied', activeOrderId: orderId });
    this.persistOrders();
    return true;
  }

  private persistZones() {
    this.storage.set(ZONES_KEY, this._zonesSignal());
    this.dataSync.trackLocalModification(ZONES_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private persistTables() {
    this.storage.set(TABLES_KEY, this._tablesSignal());
    this.dataSync.trackLocalModification(TABLES_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private persistOrders() {
    this.storage.set(ORDERS_KEY, this._ordersSignal());
    this.dataSync.trackLocalModification(ORDERS_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
