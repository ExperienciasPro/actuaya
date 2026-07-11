export interface SalesFunnel {
  id: string;
  goalId: string;
  name: string;
  stages: FunnelStage[];
  productId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FunnelStage {
  id: string;
  name: string;
  order: number;
  color: string;
  deals: Deal[];
  conversionRate?: number;
}

export interface Deal {
  id: string;
  funnelId: string;
  stageId: string;
  contactName: string;
  company?: string;
  value?: number;
  currency: string;
  status: DealStatus;
  productId?: string;
  dealSource?: string;
  notes: string[];
  lastContactDate?: Date;
  nextFollowUp?: Date;
  createdAt: Date;
  closedAt?: Date;
}

export type DealStatus = 'open' | 'won' | 'lost' | 'stalled';
