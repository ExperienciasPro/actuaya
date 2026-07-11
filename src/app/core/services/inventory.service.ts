import { Injectable, inject, computed } from '@angular/core';
import { ProductCatalogService } from './product-catalog.service';
import {
  InventoryProduct,
  StockMovement,
  MovementType,
} from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private productService = inject(ProductCatalogService);

  // Mapear señales computadas desde ProductService para no romper la UI
  products = computed<InventoryProduct[]>(() => {
    return this.productService.products().map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      category: p.category,
      currentStock: p.currentStock,
      minStock: p.minStock,
      unit: p.unit,
      costPerUnit: p.costPrice,
      createdAt: p.createdAt,
    }));
  });

  movements = computed<StockMovement[]>(() => {
    return this.productService.movements().map(m => ({
      id: m.id,
      productId: m.productId,
      productName: m.productName,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      date: m.date,
      createdAt: m.createdAt,
    }));
  });

  criticalProducts = computed<InventoryProduct[]>(() => {
    return this.productService.criticalStockProducts().map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      category: p.category,
      currentStock: p.currentStock,
      minStock: p.minStock,
      unit: p.unit,
      costPerUnit: p.costPrice,
      createdAt: p.createdAt,
    }));
  });

  totalValue = computed(() => this.productService.totalInventoryValue());

  stats = computed(() => {
    const prods = this.productService.products();
    const critical = this.productService.criticalStockProducts();
    return {
      totalProducts: prods.length,
      totalItems: prods.reduce((sum, p) => sum + p.currentStock, 0),
      criticalCount: critical.length,
      totalValue: this.totalValue(),
    };
  });

  addProduct(product: Omit<InventoryProduct, 'id' | 'createdAt'>): void {
    this.productService.addProduct({
      name: product.name,
      sku: product.sku,
      category: product.category,
      currentStock: product.currentStock,
      minStock: product.minStock,
      unit: product.unit,
      costPrice: product.costPerUnit,
      trackInventory: true,
      active: true,
    });
  }

  updateProduct(id: string, changes: Partial<InventoryProduct>): void {
    const productChanges: any = {};
    if (changes.name !== undefined) productChanges.name = changes.name;
    if (changes.sku !== undefined) productChanges.sku = changes.sku;
    if (changes.category !== undefined) productChanges.category = changes.category;
    if (changes.currentStock !== undefined) productChanges.currentStock = changes.currentStock;
    if (changes.minStock !== undefined) productChanges.minStock = changes.minStock;
    if (changes.unit !== undefined) productChanges.unit = changes.unit;
    if (changes.costPerUnit !== undefined) productChanges.costPrice = changes.costPerUnit;

    this.productService.updateProduct(id, productChanges);
  }

  removeProduct(id: string): void {
    this.productService.deleteProduct(id);
  }

  registerMovement(
    productId: string,
    type: MovementType,
    quantity: number,
    reason: string,
  ): void {
    this.productService.registerMovement(productId, type, quantity, reason);
  }

  getProductMovements(productId: string): StockMovement[] {
    return this.movements().filter(m => m.productId === productId);
  }

  getRecentMovements(count: number = 20): StockMovement[] {
    return this.movements().slice(0, count);
  }
}
