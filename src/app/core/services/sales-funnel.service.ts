import { Injectable, inject } from '@angular/core';
import { SalesService } from './sales.service';
import { SalesFunnel, Deal } from '../models/sales-funnel.model';

/**
 * @deprecated Use SalesService instead. This service is kept only for backward compatibility.
 * All funnel and deal operations should go through SalesService which is the single source of truth.
 */
@Injectable({ providedIn: 'root' })
export class SalesFunnelService {
  private salesService = inject(SalesService);

  /** @deprecated Use SalesService.funnels() instead */
  get funnels() {
    return this.salesService.funnels;
  }

  /** @deprecated Use SalesService.createFunnel() instead */
  createFunnel(funnel: Omit<SalesFunnel, 'id' | 'createdAt' | 'updatedAt'>): SalesFunnel {
    return this.salesService.createFunnel(funnel);
  }

  /** @deprecated Use SalesService.createDeal() instead */
  addDeal(funnelId: string, stageId: string, deal: Omit<Deal, 'id' | 'funnelId' | 'stageId' | 'createdAt'>): void {
    this.salesService.createDeal({
      ...deal,
      funnelId,
      stageId,
      status: deal.status || 'open' as any,
    } as any);
  }

  /** @deprecated Use SalesService.deleteFunnel() instead */
  delete(id: string): void {
    this.salesService.deleteFunnel(id);
  }

  /** @deprecated */
  getByGoalId(goalId: string): SalesFunnel[] {
    return this.salesService.funnels().filter(f => (f as any).goalId === goalId);
  }

  /** @deprecated */
  moveDeal(_funnelId: string, dealId: string, toStageId: string): void {
    this.salesService.updateDeal(dealId, { stageId: toStageId });
  }
}
