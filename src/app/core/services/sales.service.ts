import { Injectable, signal, computed } from '@angular/core';
import { SalesFunnel, FunnelStage, Deal, DealStatus } from '../models/sales-funnel.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly FUNNELS_KEY = 'um_funnels';
  private readonly DEALS_KEY = 'um_deals';

  private funnelsSignal = signal<SalesFunnel[]>([]);
  private dealsSignal = signal<Deal[]>([]);

  readonly funnels = this.funnelsSignal.asReadonly();
  readonly deals = this.dealsSignal.asReadonly();

  readonly openDeals = computed(() => this.dealsSignal().filter(d => d.status === 'open'));
  readonly wonDeals = computed(() => this.dealsSignal().filter(d => d.status === 'won'));
  readonly lostDeals = computed(() => this.dealsSignal().filter(d => d.status === 'lost'));

  readonly totalPipelineValue = computed(() =>
    this.openDeals().reduce((s, d) => s + (d.value || 0), 0)
  );

  readonly totalWonRevenue = computed(() =>
    this.wonDeals().reduce((s, d) => s + (d.value || 0), 0)
  );

  constructor(private storage: StorageService) {
    this.loadFromStorage();
  }

  // — Funnels —
  createFunnel(funnel: Omit<SalesFunnel, 'id' | 'createdAt' | 'updatedAt'>): SalesFunnel {
    const newFunnel: SalesFunnel = {
      ...funnel,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.funnelsSignal.update(f => [...f, newFunnel]);
    this.saveFunnels();
    return newFunnel;
  }

  updateFunnel(id: string, changes: Partial<SalesFunnel>): void {
    this.funnelsSignal.update(fs =>
      fs.map(f => (f.id === id ? { ...f, ...changes, updatedAt: new Date() } : f))
    );
    this.saveFunnels();
  }

  deleteFunnel(id: string): void {
    this.funnelsSignal.update(fs => fs.filter(f => f.id !== id));
    this.dealsSignal.update(ds => ds.filter(d => d.funnelId !== id));
    this.saveFunnels();
    this.saveDeals();
  }

  getFunnelById(id: string): SalesFunnel | undefined {
    return this.funnelsSignal().find(f => f.id === id);
  }

  // — Deals —
  createDeal(deal: Omit<Deal, 'id' | 'createdAt' | 'notes'>): Deal {
    const newDeal: Deal = {
      ...deal,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      notes: [],
    };
    this.dealsSignal.update(ds => [...ds, newDeal]);
    this.saveDeals();
    return newDeal;
  }

  updateDeal(id: string, changes: Partial<Deal>): void {
    this.dealsSignal.update(ds =>
      ds.map(d => (d.id === id ? { ...d, ...changes } : d))
    );
    this.saveDeals();
  }

  moveDealToStage(dealId: string, stageId: string): void {
    this.updateDeal(dealId, { stageId });
  }

  closeDeal(id: string, status: 'won' | 'lost'): void {
    this.updateDeal(id, { status, closedAt: new Date() });
  }

  deleteDeal(id: string): void {
    this.dealsSignal.update(ds => ds.filter(d => d.id !== id));
    this.saveDeals();
  }

  getByFunnel(funnelId: string): Deal[] {
    return this.dealsSignal().filter(d => d.funnelId === funnelId);
  }

  getByStage(stageId: string): Deal[] {
    return this.dealsSignal().filter(d => d.stageId === stageId && d.status === 'open');
  }

  getDealById(id: string): Deal | undefined {
    return this.dealsSignal().find(d => d.id === id);
  }

  private loadFromStorage(): void {
    const funnels = this.storage.get<SalesFunnel[]>(this.FUNNELS_KEY);
    const deals = this.storage.get<Deal[]>(this.DEALS_KEY);
    if (funnels) this.funnelsSignal.set(funnels);
    if (deals) this.dealsSignal.set(deals);
  }

  private saveFunnels(): void {
    this.storage.set(this.FUNNELS_KEY, this.funnelsSignal());
  }

  private saveDeals(): void {
    this.storage.set(this.DEALS_KEY, this.dealsSignal());
  }
}
