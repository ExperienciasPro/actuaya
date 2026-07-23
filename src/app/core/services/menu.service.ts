import { Injectable, signal, computed, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { MenuItem, MenuCategory, MenuConfig, DEFAULT_MENU_CONFIG } from '../models/menu.model';

const ITEMS_KEY = 'um_menu_items';
const CATS_KEY  = 'um_menu_categories';
const CFG_KEY   = 'um_menu_config';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private storage = inject(StorageService);

  // ─── State ──────────────────────────────
  items      = signal<MenuItem[]>(this.load<MenuItem[]>(ITEMS_KEY, []));
  categories = signal<MenuCategory[]>(this.load<MenuCategory[]>(CATS_KEY, [
    { id: 'entradas',  name: 'Entradas',  emoji: '🥗', order: 1 },
    { id: 'platos',    name: 'Platos',    emoji: '🍽️', order: 2 },
    { id: 'bebidas',   name: 'Bebidas',   emoji: '🥤', order: 3 },
    { id: 'postres',   name: 'Postres',   emoji: '🍰', order: 4 },
  ]));
  config     = signal<MenuConfig>({ ...DEFAULT_MENU_CONFIG, ...this.load<MenuConfig>(CFG_KEY, DEFAULT_MENU_CONFIG) });

  // ─── Computed ───────────────────────────
  availableItems = computed(() => this.items().filter(i => i.available));

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
    [...this.categories()].sort((a, b) => a.order - b.order)
  );

  private generateId(): string {
    return 'm-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  // ─── Items CRUD ─────────────────────────
  addItem(data: Omit<MenuItem, 'id'>): void {
    const item: MenuItem = { ...data, id: this.generateId() };
    this.items.update(list => [item, ...list]);
    this.persist(ITEMS_KEY, this.items());
  }

  updateItem(id: string, data: Partial<MenuItem>): void {
    this.items.update(list => list.map(i => i.id === id ? { ...i, ...data } : i));
    this.persist(ITEMS_KEY, this.items());
  }

  deleteItem(id: string): void {
    this.items.update(list => list.filter(i => i.id !== id));
    this.persist(ITEMS_KEY, this.items());
  }

  toggleAvailable(id: string): void {
    this.items.update(list => list.map(i => i.id === id ? { ...i, available: !i.available } : i));
    this.persist(ITEMS_KEY, this.items());
  }

  // ─── Categories CRUD ────────────────────
  addCategory(data: Omit<MenuCategory, 'id'>): void {
    const cat: MenuCategory = { ...data, id: this.generateId() };
    this.categories.update(list => [...list, cat]);
    this.persist(CATS_KEY, this.categories());
  }

  updateCategory(id: string, data: Partial<MenuCategory>): void {
    this.categories.update(list => list.map(c => c.id === id ? { ...c, ...data } : c));
    this.persist(CATS_KEY, this.categories());
  }

  deleteCategory(id: string): void {
    this.categories.update(list => list.filter(c => c.id !== id));
    this.persist(CATS_KEY, this.categories());
  }

  // ─── Config ─────────────────────────────
  saveConfig(cfg: Partial<MenuConfig>): void {
    this.config.update(c => ({ ...c, ...cfg, lastUpdated: new Date().toISOString() }));
    this.persist(CFG_KEY, this.config());
  }

  // ─── Helpers ────────────────────────────
  private load<T>(key: string, fallback: T): T {
    try {
      const stored = this.storage.get<T>(key);
      return stored !== null && stored !== undefined ? stored : fallback;
    } catch { return fallback; }
  }

  private persist(key: string, value: unknown): void {
    this.storage.set(key, value);
  }

  // fix: addItem update pattern correction
  private save(_key: string, _val: MenuItem[] | undefined): void { /* no-op shim */ }
}
