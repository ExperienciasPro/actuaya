import { Injectable, inject, signal, computed, Injector, effect, untracked } from '@angular/core';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';
import { Product, ProductOfferType, StockMovement, MovementType } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductCatalogService {
  private storage = inject(StorageService);
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private lastSelfSaveToken = -1;

  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private readonly STORAGE_KEY = 'um_products';
  private readonly LEGACY_SALES_PRODUCTS_KEY = 'um_sales_products';
  private readonly MOVEMENTS_KEY = 'um_inventory_movements';

  // Signals reactivos
  private productsSignal = signal<Product[]>([]);
  private movementsSignal = signal<StockMovement[]>([]);

  // Computed signals expuestas
  products = computed(() => this.productsSignal().filter(p => !p.isDeleted));
  movements = computed(() => this.movementsSignal().filter(m => !m.isDeleted));
  
  activeProducts = computed(() => this.products().filter(p => p.active));
  criticalStockProducts = computed(() =>
    this.products().filter(p => p.trackInventory && p.currentStock <= p.minStock)
  );

  categories = computed(() => {
    const cats = this.products().map(p => (p.category || '').trim());
    return Array.from(new Set(cats)).filter(Boolean).sort();
  });

  totalInventoryValue = computed(() => {
    return this.products().reduce((acc, p) => acc + ((p.trackInventory ? p.currentStock : 0) * p.costPrice), 0);
  });

  constructor() {
    this.loadData();
    effect(() => {
      const token = this.storage.updateToken();
      if (token >= 0 && token !== this.lastSelfSaveToken) {
        untracked(() => {
          this.loadData();
        });
      }
    });
  }

  private loadData(): void {
    // 1. Migración legacy (um_catalog / um_inventory_products) si es necesario
    this.checkAndMigrateLegacyData();

    // 2. Cargar productos unificados y fusionar um_sales_products si existen registros previos
    let storedProducts = this.storage.get<Product[]>(this.STORAGE_KEY) || [];
    const { products: unifiedProducts, changed } = this.mergeSalesProductsIfNeeded(storedProducts);
    if (changed) {
      storedProducts = unifiedProducts;
      this.storage.set(this.STORAGE_KEY, storedProducts);
      this.lastSelfSaveToken = this.storage.updateToken();
      this.dataSync.trackLocalModification(this.STORAGE_KEY);
      this.dataSync.saveToServerDebounced();
    }
    this.productsSignal.set(storedProducts);

    // 3. Cargar movimientos
    const storedMovements = this.storage.get<StockMovement[]>(this.MOVEMENTS_KEY) || [];
    this.movementsSignal.set(storedMovements);
  }

  /**
   * Unifica cualquier producto o servicio creado previamente en "Productos y Servicios" (um_sales_products)
   * dentro del almacén canónico um_products preservando su ID original (para no romper embudos ni deals).
   */
  private mergeSalesProductsIfNeeded(currentProducts: Product[]): { products: Product[]; changed: boolean } {
    const legacySalesProducts = this.storage.get<any[]>(this.LEGACY_SALES_PRODUCTS_KEY);
    if (!Array.isArray(legacySalesProducts) || legacySalesProducts.length === 0) {
      return { products: currentProducts, changed: false };
    }

    const existingIds = new Set(currentProducts.map(p => p.id));
    const merged = [...currentProducts];
    let changed = false;

    for (const sp of legacySalesProducts) {
      if (!sp || !sp.id || existingIds.has(sp.id) || sp.isDeleted) {
        continue;
      }

      const itemType: ProductOfferType = sp.category || 'servicio';
      const isPhysical = itemType === 'producto';
      const trackInventory = sp.trackInventory !== undefined ? Boolean(sp.trackInventory) : false;

      merged.push({
        id: sp.id,
        name: (sp.name || 'Sin nombre').trim(),
        description: (sp.description || '').trim(),
        sku: (sp.sku || '').trim(),
        salePrice: Number(sp.price) || 0,
        costPrice: Number(sp.costPrice) || 0,
        unit: sp.unit || (isPhysical ? 'unidad' : itemType === 'suscripcion' ? 'mes' : 'servicio'),
        category: sp.commercialCategory || this.getDefaultCategoryLabel(itemType),
        itemType,
        currency: sp.currency || 'COP',
        icon: sp.icon || this.getDefaultOfferIcon(itemType),
        color: sp.color || '#6366f1',
        taxRate: sp.taxRate !== undefined ? Number(sp.taxRate) : undefined,
        deliveryTime: sp.deliveryTime || '',
        includesOrDeliverables: sp.includesOrDeliverables || '',
        currentStock: trackInventory ? (Number(sp.currentStock) || 0) : 0,
        minStock: trackInventory ? (Number(sp.minStock) || 0) : 0,
        active: sp.isActive !== false,
        trackInventory,
        createdAt: sp.createdAt || new Date().toISOString(),
        updatedAt: sp.updatedAt || new Date().toISOString(),
      });

      existingIds.add(sp.id);
      changed = true;
    }

    return { products: merged, changed };
  }

  private getDefaultCategoryLabel(itemType?: ProductOfferType): string {
    const labels: Record<string, string> = {
      producto: 'Productos',
      servicio: 'Servicios',
      curso: 'Cursos y Digital',
      suscripcion: 'Suscripciones',
      consultoria: 'Consultoría',
      otro: 'General',
    };
    return (itemType && labels[itemType]) || 'General';
  }

  private getDefaultOfferIcon(itemType?: ProductOfferType): string {
    const icons: Record<string, string> = {
      producto: '📦',
      servicio: '✨',
      curso: '🎓',
      suscripcion: '🔄',
      consultoria: '💼',
      otro: '🏷️',
    };
    return (itemType && icons[itemType]) || '📦';
  }

  private checkAndMigrateLegacyData(): void {
    const migratedKey = 'um_products_migrated_v2';
    if (this.storage.get(migratedKey)) return;

    const legacyCatalog = this.storage.get<any[]>('um_catalog') || [];
    const legacyInventory = this.storage.get<any[]>('um_inventory_products') || [];

    if (legacyCatalog.length === 0 && legacyInventory.length === 0) {
      this.storage.set(migratedKey, true);
      this.lastSelfSaveToken = this.storage.updateToken();
      return;
    }

    const mergedProducts: Product[] = [];

    // Mapear los del inventario primero
    for (const item of legacyInventory) {
      const matchedCatalog = legacyCatalog.find(
        c => c.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      mergedProducts.push({
        id: item.id || this.generateId(),
        name: item.name,
        description: matchedCatalog ? matchedCatalog.description : '',
        sku: item.sku || '',
        salePrice: matchedCatalog ? matchedCatalog.price : (item.costPerUnit * 1.3),
        costPrice: item.costPerUnit || 0,
        unit: item.unit || 'unidades',
        category: item.category || 'General',
        itemType: 'producto',
        currency: 'COP',
        icon: '📦',
        color: '#3b82f6',
        currentStock: item.currentStock || 0,
        minStock: item.minStock || 0,
        active: true,
        trackInventory: true,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Agregar los del catálogo que no están en inventario
    for (const item of legacyCatalog) {
      const exists = mergedProducts.some(
        p => p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      if (!exists) {
        mergedProducts.push({
          id: item.id || this.generateId(),
          name: item.name,
          description: item.description || '',
          sku: '',
          salePrice: item.price || 0,
          costPrice: 0,
          unit: item.unit || 'unidad',
          category: item.category || 'General',
          itemType: 'servicio',
          currency: 'COP',
          icon: '✨',
          color: '#6366f1',
          currentStock: 0,
          minStock: 0,
          active: item.active !== false,
          trackInventory: false,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    this.storage.set(this.STORAGE_KEY, mergedProducts);
    this.storage.set(migratedKey, true);
    this.lastSelfSaveToken = this.storage.updateToken();

    console.log(`[ProductMigration] Migrados exitosamente ${mergedProducts.length} productos.`);
  }

  getAllProducts(): Product[] {
    return this.products();
  }

  getProductById(id: string): Product | undefined {
    return this.products().find(p => p.id === id);
  }

  addProduct(product: Partial<Product>): Product {
    const itemType: ProductOfferType =
      product.itemType || (product.trackInventory === false ? 'servicio' : 'producto');
    const trackInventory =
      product.trackInventory !== undefined ? Boolean(product.trackInventory) : itemType === 'producto';

    const newProduct: Product = {
      id: product.id || this.generateId(),
      name: (product.name || 'Sin nombre').trim(),
      description: (product.description || '').trim(),
      sku: (product.sku || '').trim(),
      salePrice: Number(product.salePrice) || 0,
      costPrice: Number(product.costPrice) || 0,
      unit: product.unit || (trackInventory ? 'unidad' : itemType === 'suscripcion' ? 'mes' : 'servicio'),
      category: (product.category || this.getDefaultCategoryLabel(itemType)).trim(),
      itemType,
      currency: product.currency || 'COP',
      icon: product.icon || this.getDefaultOfferIcon(itemType),
      color: product.color || '#6366f1',
      taxRate: product.taxRate !== undefined ? Number(product.taxRate) : undefined,
      deliveryTime: (product.deliveryTime || '').trim(),
      includesOrDeliverables: (product.includesOrDeliverables || '').trim(),
      currentStock: trackInventory ? (Number(product.currentStock) || 0) : 0,
      minStock: trackInventory ? (Number(product.minStock) || 0) : 0,
      active: product.active !== false,
      trackInventory,
      createdAt: product.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...this.productsSignal(), newProduct];
    this.saveProducts(updatedList);

    if (newProduct.currentStock > 0 && newProduct.trackInventory) {
      this.registerMovementInternal(
        newProduct.id,
        'entrada',
        newProduct.currentStock,
        'Inventario inicial',
        newProduct.name,
        true,
        undefined,
        undefined,
        true // skipStockUpdate — stock already set in the product creation above
      );
    }

    return newProduct;
  }

  updateProduct(id: string, changes: Partial<Product>): void {
    const list = this.productsSignal();
    const index = list.findIndex(p => p.id === id);
    if (index === -1) return;

    const oldProduct = list[index];
    const updatedProduct = { ...oldProduct, ...changes, updatedAt: new Date().toISOString() };

    if (
      changes.currentStock !== undefined &&
      changes.currentStock !== oldProduct.currentStock &&
      updatedProduct.trackInventory
    ) {
      const diff = changes.currentStock - oldProduct.currentStock;
      const type: MovementType = diff > 0 ? 'entrada' : 'salida';
      this.registerMovementInternal(
        id,
        type,
        Math.abs(diff),
        'Ajuste manual por edición',
        updatedProduct.name,
        false,
        undefined,
        undefined,
        true
      );
    }

    const updatedList = [...list];
    updatedList[index] = updatedProduct;
    this.saveProducts(updatedList);
  }

  deleteProduct(id: string): void {
    const updatedList = this.productsSignal().map(p => 
      p.id === id ? { ...p, isDeleted: true, updatedAt: new Date().toISOString() } : p
    );
    this.saveProducts(updatedList);

    const updatedMovements = this.movementsSignal().map(m => 
      m.productId === id ? { ...m, isDeleted: true, updatedAt: new Date().toISOString() } : m
    );
    this.saveMovements(updatedMovements);

    this.dataSync.saveToServerImmediate(); // Sincronización prioritaria para borrados
  }

  registerMovement(
    productId: string,
    type: MovementType,
    quantity: number,
    reason: string,
    autoGenerated = false,
    sourceQuoteId?: string,
    sourceTransactionId?: string
  ): boolean {
    const product = this.getProductById(productId);
    if (!product) return false;

    return this.registerMovementInternal(
      productId,
      type,
      quantity,
      reason,
      product.name,
      autoGenerated,
      sourceQuoteId,
      sourceTransactionId
    );
  }

  private registerMovementInternal(
    productId: string,
    type: MovementType,
    quantity: number,
    reason: string,
    productName: string,
    autoGenerated = false,
    sourceQuoteId?: string,
    sourceTransactionId?: string,
    skipStockUpdate = false
  ): boolean {
    const newMovement: StockMovement = {
      id: 'mov-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      productId,
      productName,
      type,
      quantity,
      reason,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoGenerated,
      sourceQuoteId,
      sourceTransactionId,
    };

    const updatedMovements = [newMovement, ...this.movementsSignal()];
    this.saveMovements(updatedMovements);

    if (!skipStockUpdate) {
      const list = this.productsSignal();
      const index = list.findIndex(p => p.id === productId);
      if (index !== -1) {
        const product = { ...list[index] };
        if (product.trackInventory) {
          if (type === 'entrada') {
            product.currentStock += quantity;
          } else {
            product.currentStock = Math.max(0, product.currentStock - quantity);
          }
          product.updatedAt = new Date().toISOString();
          const updatedList = [...list];
          updatedList[index] = product;
          this.saveProducts(updatedList);
        }
      }
    }

    return true;
  }

  private saveProducts(list: Product[]): void {
    this.productsSignal.set(list);
    this.storage.set(this.STORAGE_KEY, list);
    this.lastSelfSaveToken = this.storage.updateToken();
    this.dataSync.trackLocalModification(this.STORAGE_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private saveMovements(list: StockMovement[]): void {
    this.movementsSignal.set(list);
    this.storage.set(this.MOVEMENTS_KEY, list);
    this.lastSelfSaveToken = this.storage.updateToken();
    this.dataSync.trackLocalModification(this.MOVEMENTS_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private generateId(): string {
    return 'prod-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }
}
