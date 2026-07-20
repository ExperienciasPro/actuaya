import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { StorageService } from './storage.service';
import { ProductService, ProductCategory } from '../models/product-service.model';

@Injectable({
  providedIn: 'root',
})
export class ProductDataService {
  private storage = inject(StorageService);
  private readonly STORAGE_KEY = 'um_sales_products';

  private _products = signal<ProductService[]>([]);
  products = this._products.asReadonly();

  activeProducts = computed(() => this._products().filter(p => p.isActive));

  constructor() {
    this.load();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.load();
      }
    });
  }

  getById(id: string): ProductService | undefined {
    return this._products().find(p => p.id === id);
  }

  create(product: Omit<ProductService, 'id' | 'createdAt' | 'isActive'>): void {
    const newProduct: ProductService = {
      ...product,
      id: crypto.randomUUID(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this._products.update(list => [newProduct, ...list]);
    this.persist();
  }

  update(id: string, changes: Partial<ProductService>): void {
    this._products.update(list =>
      list.map(p => (p.id === id ? { ...p, ...changes, updatedAt: new Date().toISOString() } : p))
    );
    this.persist();
  }

  delete(id: string): void {
    this._products.update(list => list.filter(p => p.id !== id));
    this.persist();
  }

  private load(): void {
    const saved = this.storage.get<ProductService[]>(this.STORAGE_KEY);
    if (saved) {
      this._products.set(saved);
    } else {
      this._products.set([]);
      this.storage.set(this.STORAGE_KEY, []);
    }
  }

  private persist(): void {
    this.storage.set(this.STORAGE_KEY, this._products());
  }
}
