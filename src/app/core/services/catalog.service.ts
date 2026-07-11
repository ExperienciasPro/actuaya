import { Injectable, signal, inject, computed } from '@angular/core';
import { CatalogItem, Quote } from '../models/catalog.model';
import { StorageService } from './storage.service';
import { ProductCatalogService } from './product-catalog.service';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private storage = inject(StorageService);
  private productService = inject(ProductCatalogService);

  private readonly QUOTES_KEY = 'um_quotes';

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

  private _quotes = signal<Quote[]>([]);
  quotes = this._quotes.asReadonly();

  activeItems = computed<CatalogItem[]>(() => {
    return this.items().filter(i => i.active);
  });

  categories = computed(() => {
    return this.productService.categories();
  });

  constructor() {
    this.load();
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

  saveQuote(quote: Omit<Quote, 'id' | 'createdAt'>): Quote {
    const newQuote: Quote = {
      ...quote,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: quote.status || 'draft',
    };
    this._quotes.update(list => [newQuote, ...list]);
    this.persistQuotes();
    return newQuote;
  }

  removeQuote(id: string): void {
    this._quotes.update(list => list.filter(q => q.id !== id));
    this.persistQuotes();
  }

  updateQuote(id: string, quote: Partial<Quote>): void {
    this._quotes.update(list =>
      list.map(q => (q.id === id ? { ...q, ...quote } : q))
    );
    this.persistQuotes();
  }

  getQuoteTotal(quote: Quote): number {
    return quote.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
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

  // ─── Persistence ────────────────────────

  private load(): void {
    const quotes = this.storage.get<Quote[]>(this.QUOTES_KEY);
    if (quotes) this._quotes.set(quotes);
  }

  private persistQuotes(): void {
    this.storage.set(this.QUOTES_KEY, this._quotes());
  }
}
