export enum FunnelStageEnum {
  LEAD = 'lead',
  CONTACT = 'contact',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export const FUNNEL_STAGE_LABELS: Record<FunnelStageEnum, string> = {
  [FunnelStageEnum.LEAD]: 'Lead',
  [FunnelStageEnum.CONTACT]: 'Contacto',
  [FunnelStageEnum.PROPOSAL]: 'Propuesta',
  [FunnelStageEnum.NEGOTIATION]: 'Negociación',
  [FunnelStageEnum.CLOSED_WON]: 'Cerrado (Ganado)',
  [FunnelStageEnum.CLOSED_LOST]: 'Cerrado (Perdido)',
};

export const DEFAULT_FUNNEL_COLORS: Record<FunnelStageEnum, string> = {
  [FunnelStageEnum.LEAD]: '#6366f1',
  [FunnelStageEnum.CONTACT]: '#8b5cf6',
  [FunnelStageEnum.PROPOSAL]: '#a855f7',
  [FunnelStageEnum.NEGOTIATION]: '#f59e0b',
  [FunnelStageEnum.CLOSED_WON]: '#10b981',
  [FunnelStageEnum.CLOSED_LOST]: '#ef4444',
};
