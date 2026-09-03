export interface SalesFunnel {
  id: string;
  goalId: string;
  name: string;
  stages: FunnelStage[];
  productId?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
}

export interface FunnelStage {
  id: string;
  name: string;
  order: number;
  color: string;
  deals: Deal[];
  conversionRate?: number;
  isDeleted?: boolean;
  updatedAt?: string;
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
  updatedAt?: Date;
  closedAt?: Date;
  isDeleted?: boolean;
}

export type DealStatus = 'open' | 'won' | 'lost' | 'stalled';
