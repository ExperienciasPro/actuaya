import { Injectable, inject, computed } from '@angular/core';
import { ProductService, ProductCategory } from '../models/product-service.model';
import { Product } from '../models/product.model';
import { ProductCatalogService } from './product-catalog.service';

@Injectable({
  providedIn: 'root',
})
export class ProductDataService {
  private productCatalog = inject(ProductCatalogService);

  products = computed<ProductService[]>(() =>
    this.productCatalog.products().map(p => this.toProductService(p))
  );

  activeProducts = computed<ProductService[]>(() =>
    this.products().filter(p => p.isActive)
  );

  getById(id: string): ProductService | undefined {
    const found = this.productCatalog.getProductById(id);
    return found ? this.toProductService(found) : undefined;
  }

  create(product: Omit<ProductService, 'id' | 'createdAt' | 'isActive'> & { isActive?: boolean }): ProductService {
    const itemType: ProductCategory = product.category || 'servicio';
    const created = this.productCatalog.addProduct({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      salePrice: product.price ?? 0,
      costPrice: product.costPrice ?? 0,
      unit: product.unit || (itemType === 'producto' ? 'unidad' : itemType === 'suscripcion' ? 'mes' : 'servicio'),
      category: product.commercialCategory || this.getCategoryLabel(itemType),
      itemType,
      currency: product.currency || 'COP',
      icon: product.icon || (itemType === 'producto' ? '📦' : '✨'),
      color: product.color || '#6366f1',
      taxRate: product.taxRate,
      deliveryTime: product.deliveryTime,
      includesOrDeliverables: product.includesOrDeliverables,
      trackInventory: product.trackInventory !== undefined ? product.trackInventory : itemType === 'producto',
      currentStock: product.currentStock ?? 0,
      minStock: product.minStock ?? 0,
      active: product.isActive !== false,
    });
    return this.toProductService(created);
  }

  update(id: string, changes: Partial<ProductService>): void {
    const mapped: Partial<Product> = {};
    if (changes.name !== undefined) mapped.name = changes.name;
    if (changes.description !== undefined) mapped.description = changes.description;
    if (changes.sku !== undefined) mapped.sku = changes.sku;
    if (changes.category !== undefined) mapped.itemType = changes.category;
    if (changes.commercialCategory !== undefined) mapped.category = changes.commercialCategory;
    if (changes.price !== undefined) mapped.salePrice = changes.price;
    if (changes.costPrice !== undefined) mapped.costPrice = changes.costPrice;
    if (changes.unit !== undefined) mapped.unit = changes.unit;
    if (changes.currency !== undefined) mapped.currency = changes.currency;
    if (changes.icon !== undefined) mapped.icon = changes.icon;
    if (changes.color !== undefined) mapped.color = changes.color;
    if (changes.taxRate !== undefined) mapped.taxRate = changes.taxRate;
    if (changes.deliveryTime !== undefined) mapped.deliveryTime = changes.deliveryTime;
    if (changes.includesOrDeliverables !== undefined) mapped.includesOrDeliverables = changes.includesOrDeliverables;
    if (changes.trackInventory !== undefined) mapped.trackInventory = changes.trackInventory;
    if (changes.currentStock !== undefined) mapped.currentStock = changes.currentStock;
    if (changes.minStock !== undefined) mapped.minStock = changes.minStock;
    if (changes.isActive !== undefined) mapped.active = changes.isActive;

    this.productCatalog.updateProduct(id, mapped);
  }

  delete(id: string): void {
    this.productCatalog.deleteProduct(id);
  }

  private toProductService(p: Product): ProductService {
    const inferredType: ProductCategory =
      p.itemType || (p.trackInventory ? 'producto' : 'servicio');
    return {
      id: p.id,
      name: p.name,
      description: p.description || undefined,
      sku: p.sku || undefined,
      category: inferredType,
      commercialCategory: p.category,
      price: p.salePrice,
      costPrice: p.costPrice,
      unit: p.unit,
      currency: p.currency || 'COP',
      icon: p.icon || (inferredType === 'producto' ? '📦' : '✨'),
      color: p.color || '#6366f1',
      taxRate: p.taxRate,
      deliveryTime: p.deliveryTime || undefined,
      includesOrDeliverables: p.includesOrDeliverables || undefined,
      trackInventory: p.trackInventory,
      currentStock: p.currentStock,
      minStock: p.minStock,
      isActive: p.active,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isDeleted: p.isDeleted,
    };
  }

  private getCategoryLabel(cat: ProductCategory): string {
    const labels: Record<ProductCategory, string> = {
      producto: 'Productos',
      servicio: 'Servicios',
      curso: 'Cursos y Digital',
      suscripcion: 'Suscripciones',
      consultoria: 'Consultoría',
      otro: 'General',
    };
    return labels[cat] || 'General';
  }
}
