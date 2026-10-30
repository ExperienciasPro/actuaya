import { Injectable, signal, inject, computed, Injector, effect, untracked } from '@angular/core';
import { CatalogItem, Quote } from '../models/catalog.model';
import { StorageService } from './storage.service';
import { ProductCatalogService } from './product-catalog.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private storage = inject(StorageService);
  private productService = inject(ProductCatalogService);

  private readonly QUOTES_KEY = 'um_quotes';
  private lastSelfSaveToken = -1;

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  // Sincronizar catálogo desde ProductService
  items = computed<CatalogItem[]>(() => {
    return this.productService.products().map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: p.salePrice,
      unit: p.unit,
      category: p.category,
      active: p.active,
      createdAt: p.createdAt,
    }));
  });

  private _quotesSignal = signal<Quote[]>([]);
  quotes = computed(() => this._quotesSignal().filter(q => !q.isDeleted));

  activeItems = computed<CatalogItem[]>(() => {
    return this.items().filter(i => i.active);
  });

  categories = computed(() => {
    return this.productService.categories();
  });

  constructor() {
    this.load();
    effect(() => {
      const token = this.storage.updateToken();
      if (token >= 0 && token !== this.lastSelfSaveToken) {
        untracked(() => {
          this.load();
        });
      }
    });
  }

  // ─── Catalog CRUD ───────────────────────

  addItem(item: Omit<CatalogItem, 'id' | 'createdAt' | 'active'>): void {
    this.productService.addProduct({
      name: item.name,
      description: item.description,
      salePrice: item.price,
      unit: item.unit,
      category: item.category,
      active: true,
      trackInventory: false, // Default false si se crea desde Catálogo, se puede activar luego
    });
  }

  updateItem(id: string, changes: Partial<CatalogItem>): void {
    const pChanges: any = {};
    if (changes.name !== undefined) pChanges.name = changes.name;
    if (changes.description !== undefined) pChanges.description = changes.description;
    if (changes.price !== undefined) pChanges.salePrice = changes.price;
    if (changes.unit !== undefined) pChanges.unit = changes.unit;
    if (changes.category !== undefined) pChanges.category = changes.category;
    if (changes.active !== undefined) pChanges.active = changes.active;

    this.productService.updateProduct(id, pChanges);
  }

  removeItem(id: string): void {
    this.productService.deleteProduct(id);
  }

  // ─── Quotes ─────────────────────────────

  private normalizeClientName(name?: string): string {
    return (name || 'Cliente').trim().toLowerCase();
  }

  /**
   * Guarda o actualiza una cotización asegurando que en el historial solo quede
   * la última cotización (la más reciente) para esa cotización/cliente pendiente.
   */
  saveQuote(quote: Omit<Quote, 'id' | 'createdAt'>, existingId?: string | null): Quote {
    const now = new Date().toISOString();
    const normClient = this.normalizeClientName(quote.clientName);
    const currentList = untracked(() => this._quotesSignal());

    // Buscar si ya existe por ID explícito o una cotización pendiente del mismo cliente
    const targetQuote = currentList.find(q =>
      !q.isDeleted &&
      ((existingId && q.id === existingId) ||
        (q.status !== 'sold' && this.normalizeClientName(q.clientName) === normClient))
    );

    if (targetQuote) {
      const updatedQuote: Quote = {
        ...targetQuote,
        ...quote,
        id: targetQuote.id,
        createdAt: now,
        updatedAt: now,
        status: targetQuote.status === 'sold' ? 'sold' : (quote.status || 'draft'),
        isDeleted: false,
      };

      const nextList = [
        updatedQuote,
        ...currentList
          .filter(q => q.id !== targetQuote.id)
          .map(q => {
            if (!q.isDeleted && q.status !== 'sold' && this.normalizeClientName(q.clientName) === normClient) {
              return { ...q, isDeleted: true, updatedAt: now };
            }
            return q;
          }),
      ];

      this._quotesSignal.set(nextList);
      this.persistQuotes();
      return updatedQuote;
    }

    const newQuote: Quote = {
      ...quote,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: quote.status || 'draft',
    };
    this._quotesSignal.update(list => [newQuote, ...list]);
    this.persistQuotes();
    return newQuote;
  }

  removeQuote(id: string): void {
    const now = new Date().toISOString();
    this._quotesSignal.update(list => list.map(q => q.id === id ? { ...q, isDeleted: true, updatedAt: now } : q));
    this.storage.set(this.QUOTES_KEY, this._quotesSignal());
    this.lastSelfSaveToken = this.storage.updateToken();
    this.dataSync.trackLocalModification(this.QUOTES_KEY);
    this.dataSync.saveToServerImmediate(); // Prioridad a los borrados
  }

  updateQuote(id: string, quote: Partial<Quote>): Quote | undefined {
    const existing = untracked(() => this._quotesSignal()).find(q => q.id === id);
    if (!existing) return undefined;
    return this.saveQuote(
      {
        clientName: quote.clientName ?? existing.clientName,
        clientPhone: quote.clientPhone ?? existing.clientPhone,
        clientEmail: quote.clientEmail ?? existing.clientEmail,
        items: quote.items ?? existing.items,
        notes: quote.notes ?? existing.notes,
        validDays: quote.validDays ?? existing.validDays,
        status: (quote.status ?? existing.status) as any,
      },
      id,
    );
  }

  getQuoteTotal(quote: Quote): number {
    return (quote.items || []).reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  }

  generateWhatsAppLink(quote: Quote): string {
    const lines = [
      `*Cotización — ${new Date(quote.createdAt).toLocaleDateString('es-CO')}*`,
      ``,
      `Para: ${quote.clientName}`,
      ``,
      ...quote.items.map((item, i) =>
        `${i + 1}. ${item.name} — ${item.quantity} ${item.unit} × $${item.unitPrice.toLocaleString('es-CO')} = *$${(item.quantity * item.unitPrice).toLocaleString('es-CO')}*`
      ),
      ``,
      `*TOTAL: $${this.getQuoteTotal(quote).toLocaleString('es-CO')}*`,
    ];

    if (quote.notes) lines.push(``, `_${quote.notes}_`);
    if (quote.validDays) lines.push(``, `Válida por ${quote.validDays} días.`);

    const text = encodeURIComponent(lines.join('\n'));
    const phone = quote.clientPhone.replace(/\D/g, '');
    return `https://wa.me/${phone}?text=${text}`;
  }

  generateEmailLink(quote: Quote): string {
    const subject = encodeURIComponent(`Cotización ActuaYa — ${quote.clientName}`);
    const lines = [
      `Estimado(a) ${quote.clientName},`,
      ``,
      `Adjuntamos el resumen de su cotización generada el ${new Date(quote.createdAt).toLocaleDateString('es-CO')}:`,
      ``,
      ...quote.items.map((item, i) =>
        `${i + 1}. ${item.name} (${item.quantity} ${item.unit}) — $${(item.quantity * item.unitPrice).toLocaleString('es-CO')}`
      ),
      ``,
      `TOTAL A PAGAR: $${this.getQuoteTotal(quote).toLocaleString('es-CO')}`,
      ``,
      `Validez: ${quote.validDays} days.`,
      `Notas adicionales: ${quote.notes || 'Ninguna'}`,
      ``,
      `Quedamos atentos a cualquier duda.`,
    ];
    const body = encodeURIComponent(lines.join('\n'));
    return `mailto:${quote.clientEmail}?subject=${subject}&body=${body}`;
  }

  // ─── Persistence & Deduplication ────────

  private deduplicatePendingQuotes(quotes: Quote[]): { list: Quote[]; changed: boolean } {
    const sorted = [...quotes].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const seenPendingClients = new Set<string>();
    let changed = false;
    const now = new Date().toISOString();

    const deduplicated = sorted.map(q => {
      if (q.isDeleted || q.status === 'sold') {
        return q;
      }
      const normClient = this.normalizeClientName(q.clientName);
      if (seenPendingClients.has(normClient)) {
        changed = true;
        return { ...q, isDeleted: true, updatedAt: now };
      }
      seenPendingClients.add(normClient);
      return q;
    });

    return { list: deduplicated, changed };
  }

  private load(): void {
    const quotes = this.storage.get<Quote[]>(this.QUOTES_KEY);
    if (!Array.isArray(quotes)) return;

    const { list, changed } = this.deduplicatePendingQuotes(quotes);
    this._quotesSignal.set(list);
    if (changed) {
      this.persistQuotes();
    }
  }

  private persistQuotes(): void {
    const current = untracked(() => this._quotesSignal());
    this.storage.set(this.QUOTES_KEY, current);
    this.lastSelfSaveToken = this.storage.updateToken();
    this.dataSync.trackLocalModification(this.QUOTES_KEY);
    this.dataSync.saveToServerDebounced();
  }
}
