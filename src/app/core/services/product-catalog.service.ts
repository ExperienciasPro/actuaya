import { Injectable, inject, signal, computed } from '@angular/core';
import { StorageService } from './storage.service';
import { Product, StockMovement, MovementType } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductCatalogService {
  private storage = inject(StorageService);

  private readonly STORAGE_KEY = 'um_products';
  private readonly MOVEMENTS_KEY = 'um_inventory_movements';

  // Signals reactivos
  private productsSignal = signal<Product[]>([]);
  private movementsSignal = signal<StockMovement[]>([]);

  // Computed signals expuestas
  products = computed(() => this.productsSignal());
  movements = computed(() => this.movementsSignal());
  activeProducts = computed(() => this.productsSignal().filter(p => p.active));
  criticalStockProducts = computed(() =>
    this.productsSignal().filter(p => p.trackInventory && p.currentStock <= p.minStock)
  );

  categories = computed(() => {
    const cats = this.productsSignal().map(p => p.category.trim());
    return Array.from(new Set(cats)).filter(Boolean).sort();
  });

  totalInventoryValue = computed(() => {
    return this.productsSignal().reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);
  });

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    // 1. Migración si es necesario
    this.checkAndMigrateLegacyData();

    // 2. Cargar productos
    const storedProducts = this.storage.get<Product[]>(this.STORAGE_KEY) || [];
    this.productsSignal.set(storedProducts);

    // 3. Cargar movimientos
    const storedMovements = this.storage.get<StockMovement[]>(this.MOVEMENTS_KEY) || [];
    this.movementsSignal.set(storedMovements);
  }

  private checkAndMigrateLegacyData(): void {
    const migratedKey = 'um_products_migrated_v2';
    if (this.storage.get(migratedKey)) return;

    const legacyCatalog = this.storage.get<any[]>('um_catalog') || [];
    const legacyInventory = this.storage.get<any[]>('um_inventory_products') || [];

    if (legacyCatalog.length === 0 && legacyInventory.length === 0) {
      this.storage.set(migratedKey, true);
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
        currentStock: item.currentStock || 0,
        minStock: item.minStock || 0,
        active: true,
        trackInventory: true,
        createdAt: item.createdAt || new Date().toISOString(),
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
          currentStock: 0,
          minStock: 0,
          active: item.active !== false,
          trackInventory: false,
          createdAt: item.createdAt || new Date().toISOString(),
        });
      }
    }

    this.storage.set(this.STORAGE_KEY, mergedProducts);
    this.storage.set(migratedKey, true);

    console.log(`[ProductMigration] Migrados exitosamente ${mergedProducts.length} productos.`);
  }

  getAllProducts(): Product[] {
    return this.productsSignal();
  }

  getProductById(id: string): Product | undefined {
    return this.productsSignal().find(p => p.id === id);
  }

  addProduct(product: Partial<Product>): Product {
    const newProduct: Product = {
      id: this.generateId(),
      name: product.name || 'Sin nombre',
      description: product.description || '',
      sku: product.sku || '',
      salePrice: product.salePrice || 0,
      costPrice: product.costPrice || 0,
      unit: product.unit || 'unidades',
      category: product.category || 'General',
      currentStock: product.currentStock || 0,
      minStock: product.minStock || 0,
      active: product.active !== false,
      trackInventory: product.trackInventory !== false,
      createdAt: new Date().toISOString(),
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
        true
      );
    }

    return newProduct;
  }

  updateProduct(id: string, changes: Partial<Product>): void {
    const list = this.productsSignal();
    const index = list.findIndex(p => p.id === id);
    if (index === -1) return;

    const oldProduct = list[index];
    const updatedProduct = { ...oldProduct, ...changes };

    if (changes.currentStock !== undefined && changes.currentStock !== oldProduct.currentStock) {
      const diff = changes.currentStock - oldProduct.currentStock;
      const type: MovementType = diff > 0 ? 'entrada' : 'salida';
      this.registerMovementInternal(
        id,
        type,
        Math.abs(diff),
        'Ajuste manual por edición',
        updatedProduct.name,
        false
      );
    }

    const updatedList = [...list];
    updatedList[index] = updatedProduct;
    this.saveProducts(updatedList);
  }

  deleteProduct(id: string): void {
    const updatedList = this.productsSignal().filter(p => p.id !== id);
    this.saveProducts(updatedList);

    const updatedMovements = this.movementsSignal().filter(m => m.productId !== id);
    this.saveMovements(updatedMovements);
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
    sourceTransactionId?: string
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
      autoGenerated,
      sourceQuoteId,
      sourceTransactionId,
    };

    const updatedMovements = [newMovement, ...this.movementsSignal()];
    this.saveMovements(updatedMovements);

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
        const updatedList = [...list];
        updatedList[index] = product;
        this.saveProducts(updatedList);
      }
    }

    return true;
  }

  private saveProducts(list: Product[]): void {
    this.productsSignal.set(list);
    this.storage.set(this.STORAGE_KEY, list);
  }

  private saveMovements(list: StockMovement[]): void {
    this.movementsSignal.set(list);
    this.storage.set(this.MOVEMENTS_KEY, list);
  }

  private generateId(): string {
    return 'prod-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }
}
