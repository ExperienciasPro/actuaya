import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { MenuItem, MenuCategory, MenuConfig, DEFAULT_MENU_CONFIG } from '../models/menu.model';
import { DataSyncService } from './data-sync.service';
const ITEMS_KEY = 'um_menu_items';
const CATS_KEY  = 'um_menu_categories';
const CFG_KEY   = 'um_menu_config';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private storage = inject(StorageService);

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  // Default categories that must always exist
  private readonly DEFAULT_CATEGORIES: MenuCategory[] = [
    { id: 'entradas',  name: 'Entradas',  emoji: '🥗', order: 1 },
    { id: 'platos',    name: 'Platos',    emoji: '🍽️', order: 2 },
    { id: 'bebidas',   name: 'Bebidas',   emoji: '🥤', order: 3 },
    { id: 'postres',   name: 'Postres',   emoji: '🍰', order: 4 },
  ];

  // ─── State ──────────────────────────────
  private itemsSignal = signal<MenuItem[]>(this.load<MenuItem[]>(ITEMS_KEY, []));
  private categoriesSignal = signal<MenuCategory[]>(this.ensureDefaultCategories(
    this.load<MenuCategory[]>(CATS_KEY, this.DEFAULT_CATEGORIES)
  ));
  items = computed(() => this.itemsSignal().filter(i => !i.isDeleted));
  categories = computed(() => this.categoriesSignal().filter(c => !c.isDeleted));
  config     = signal<MenuConfig>({ ...DEFAULT_MENU_CONFIG, ...this.load<MenuConfig>(CFG_KEY, DEFAULT_MENU_CONFIG) });

  // ─── Computed ───────────────────────────
  availableItems = computed(() => this.itemsSignal().filter(i => i.available));

  itemsByCategory = computed(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of this.availableItems()) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  });

  sortedCategories = computed(() =>
    [...this.categoriesSignal()].sort((a, b) => a.order - b.order)
  );

  private generateId(): string {
    return 'm-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  // ─── Items CRUD ─────────────────────────
  addItem(data: Omit<MenuItem, 'id'>): void {
    const item: MenuItem = { ...data, id: this.generateId() };
    this.itemsSignal.update(list => [item, ...list]);
    this.persist(ITEMS_KEY, this.itemsSignal());
    this.dataSync.saveToServerImmediate();
  }

  updateItem(id: string, data: Partial<MenuItem>): void {
    this.itemsSignal.update(list => list.map(i => i.id === id ? { ...i, ...data } : i));
    this.persist(ITEMS_KEY, this.itemsSignal());
    this.dataSync.saveToServerImmediate();
  }

  deleteItem(id: string): void {
    this.itemsSignal.update(list => list.map(i => i.id === id ? { ...i, isDeleted: true, updatedAt: new Date().toISOString() } : i));
    this.persist(ITEMS_KEY, this.itemsSignal());
    this.dataSync.saveToServerImmediate();
  }

  toggleAvailable(id: string): void {
    this.itemsSignal.update(list => list.map(i => i.id === id ? { ...i, available: !i.available } : i));
    this.persist(ITEMS_KEY, this.itemsSignal());
    this.dataSync.saveToServerImmediate();
  }

  // ─── Categories CRUD ────────────────────
  addCategory(data: Omit<MenuCategory, 'id'>): void {
    const cat: MenuCategory = { ...data, id: this.generateId() };
    this.categoriesSignal.update(list => [...list, cat]);
    this.persist(CATS_KEY, this.categoriesSignal());
    this.dataSync.saveToServerImmediate();
  }

  updateCategory(id: string, data: Partial<MenuCategory>): void {
    this.categoriesSignal.update(list => list.map(c => c.id === id ? { ...c, ...data } : c));
    this.persist(CATS_KEY, this.categoriesSignal());
    this.dataSync.saveToServerImmediate();
  }

  deleteCategory(id: string): void {
    this.categoriesSignal.update(list => list.map(c => c.id === id ? { ...c, isDeleted: true, updatedAt: new Date().toISOString() } : c));
    this.persist(CATS_KEY, this.categoriesSignal());
    this.dataSync.saveToServerImmediate();
  }

  // ─── Config ─────────────────────────────
  saveConfig(cfg: Partial<MenuConfig>): void {
    this.config.update(c => ({ ...c, ...cfg, lastUpdated: new Date().toISOString() }));
    this.persist(CFG_KEY, this.config());
  }

  // ─── Helpers ────────────────────────────
  private load<T extends object>(key: string, fallback: T): T {
    try {
      const stored = this.storage.get<Partial<T>>(key);
      if (stored !== null && stored !== undefined && typeof stored === 'object') {
        if (Array.isArray(stored)) return stored as unknown as T;
        return { ...fallback, ...stored };
      }
      return fallback;
    } catch { return fallback; }
  }

  private persist(key: string, value: unknown): void {
    this.storage.set(key, value);
    this.dataSync.trackLocalModification(key);
    this.dataSync.saveToServerDebounced();
  }

  /** Re-add any missing default categories (e.g. after sync issues) */
  private ensureDefaultCategories(loaded: MenuCategory[]): MenuCategory[] {
    const existingIds = new Set(loaded.map(c => c.id));
    let changed = false;
    const result = [...loaded];
    for (const def of this.DEFAULT_CATEGORIES) {
      if (!existingIds.has(def.id)) {
        result.push(def);
        changed = true;
      }
    }
    if (changed) {
      this.storage.set(CATS_KEY, result);
      this.dataSync.trackLocalModification(CATS_KEY);
    }
    return result;
  }
}
