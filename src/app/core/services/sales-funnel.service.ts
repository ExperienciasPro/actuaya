import { Injectable, signal, computed } from '@angular/core';
import { SalesFunnel, Deal, FunnelStage } from '../models/sales-funnel.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class SalesFunnelService {
  private readonly STORAGE_KEY = 'um_sales_funnels';

  private funnelsSignal = signal<SalesFunnel[]>([]);

  readonly funnels = this.funnelsSignal.asReadonly();

  constructor(private storage: StorageService) {
    this.loadFromStorage();
  }

  createFunnel(funnel: Omit<SalesFunnel, 'id' | 'createdAt' | 'updatedAt'>): SalesFunnel {
    const newFunnel: SalesFunnel = {
      ...funnel,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.funnelsSignal.update((f) => [...f, newFunnel]);
    this.saveToStorage();
    return newFunnel;
  }

  addDeal(funnelId: string, stageId: string, deal: Omit<Deal, 'id' | 'funnelId' | 'stageId' | 'createdAt'>): void {
    const newDeal: Deal = {
      ...deal,
      id: crypto.randomUUID(),
      funnelId,
      stageId,
      createdAt: new Date(),
    };
    this.funnelsSignal.update((funnels) =>
      funnels.map((f) => {
        if (f.id !== funnelId) return f;
        return {
          ...f,
          updatedAt: new Date(),
          stages: f.stages.map((s) =>
            s.id === stageId ? { ...s, deals: [...s.deals, newDeal] } : s
          ),
        };
      })
    );
    this.saveToStorage();
  }

  moveDeal(funnelId: string, dealId: string, toStageId: string): void {
    this.funnelsSignal.update((funnels) =>
      funnels.map((f) => {
        if (f.id !== funnelId) return f;
        let deal: Deal | undefined;
        const stages = f.stages.map((s) => {
          const found = s.deals.find((d) => d.id === dealId);
          if (found) deal = { ...found, stageId: toStageId };
          return { ...s, deals: s.deals.filter((d) => d.id !== dealId) };
        });
        if (deal) {
          return {
            ...f,
            updatedAt: new Date(),
            stages: stages.map((s) =>
              s.id === toStageId ? { ...s, deals: [...s.deals, deal!] } : s
            ),
          };
        }
        return f;
      })
    );
    this.saveToStorage();
  }

  getByGoalId(goalId: string): SalesFunnel[] {
    return this.funnelsSignal().filter((f) => f.goalId === goalId);
  }

  delete(id: string): void {
    this.funnelsSignal.update((f) => f.filter((funnel) => funnel.id !== id));
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    const data = this.storage.get<SalesFunnel[]>(this.STORAGE_KEY);
    if (data) this.funnelsSignal.set(data);
  }

  private saveToStorage(): void {
    this.storage.set(this.STORAGE_KEY, this.funnelsSignal());
  }
}
