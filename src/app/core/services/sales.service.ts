import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { SalesFunnel, FunnelStage, Deal, DealStatus } from '../models/sales-funnel.model';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly FUNNELS_KEY = 'um_funnels';
  private readonly DEALS_KEY = 'um_deals';
  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;

  /** Lazy-resolve DataSyncService to avoid circular dependency */
  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private funnelsSignal = signal<SalesFunnel[]>([]);
  private dealsSignal = signal<Deal[]>([]);

  readonly funnels = this.funnelsSignal.asReadonly();
  readonly deals = this.dealsSignal.asReadonly();

  readonly openDeals = computed(() => this.dealsSignal().filter(d => d.status === 'open'));
  readonly wonDeals = computed(() => this.dealsSignal().filter(d => d.status === 'won'));
  readonly lostDeals = computed(() => this.dealsSignal().filter(d => d.status === 'lost'));

  readonly totalPipelineValue = computed(() =>
    this.openDeals()
      .filter(d => !d.currency || d.currency === 'COP')
      .reduce((s, d) => s + (d.value || 0), 0)
  );

  readonly totalPipelineValueUSD = computed(() =>
    this.openDeals()
      .filter(d => d.currency === 'USD')
      .reduce((s, d) => s + (d.value || 0), 0)
  );

  readonly totalWonRevenue = computed(() =>
    this.wonDeals()
      .filter(d => !d.currency || d.currency === 'COP')
      .reduce((s, d) => s + (d.value || 0), 0)
  );

  readonly totalWonRevenueUSD = computed(() =>
    this.wonDeals()
      .filter(d => d.currency === 'USD')
      .reduce((s, d) => s + (d.value || 0), 0)
  );

  constructor(private storage: StorageService) {
    this.loadFromStorage();
    this.migrateLegacySalesFunnels();
  }

  /**
   * One-time migration: absorb data from the old `um_sales_funnels` key
   * (used by the now-deprecated SalesFunnelService) into the canonical
   * `um_funnels` + `um_deals` keys.
   */
  private migrateLegacySalesFunnels(): void {
    const MIGRATION_FLAG = 'um_sales_funnels_migrated';
    if (this.storage.get(MIGRATION_FLAG)) return;

    const legacyFunnels = this.storage.get<any[]>('um_sales_funnels') || [];
    if (legacyFunnels.length === 0) {
      this.storage.set(MIGRATION_FLAG, true);
      return;
    }

    const existingFunnelIds = new Set(this.funnelsSignal().map(f => f.id));
    const existingDealIds = new Set(this.dealsSignal().map(d => d.id));
    let addedFunnels = 0;
    let addedDeals = 0;

    for (const lf of legacyFunnels) {
      if (!lf?.id || existingFunnelIds.has(lf.id)) continue;

      // Extract funnel (without embedded deals)
      const funnel: any = {
        id: lf.id,
        name: lf.name,
        stages: (lf.stages || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          color: s.color,
        })),
        goalId: lf.goalId,
        createdAt: lf.createdAt,
        updatedAt: lf.updatedAt,
      };
      this.funnelsSignal.update(fs => [...fs, funnel]);
      addedFunnels++;

      // Extract embedded deals from stages
      for (const stage of lf.stages || []) {
        for (const deal of stage.deals || []) {
          if (!deal?.id || existingDealIds.has(deal.id)) continue;
          this.dealsSignal.update(ds => [...ds, {
            ...deal,
            funnelId: lf.id,
            stageId: stage.id,
            status: deal.status || 'open',
          }]);
          addedDeals++;
        }
      }
    }

    if (addedFunnels > 0 || addedDeals > 0) {
      this.saveFunnels();
      this.saveDeals();
      console.log(`[Sales Migration] Migrated ${addedFunnels} funnels and ${addedDeals} deals from um_sales_funnels.`);
    }

    this.storage.set(MIGRATION_FLAG, true);
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
    // Prevent syncFromServer from resurrecting deleted data
    this.dataSync.trackLocalModification(this.FUNNELS_KEY);
    this.dataSync.trackLocalModification(this.DEALS_KEY);
    this.dataSync.saveToServerImmediate();
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
    // Prevent syncFromServer from resurrecting deleted data
    this.dataSync.trackLocalModification(this.DEALS_KEY);
    this.dataSync.saveToServerImmediate();
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
