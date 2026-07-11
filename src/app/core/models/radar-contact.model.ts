// ═══════════════════════════════════════════
// El Radar — Contact Radar Model
// ═══════════════════════════════════════════

export interface RadarContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  relationshipTag: RelationshipTag;
  status: RadarStatus;
  snoozedUntil?: Date;
  snoozeMonths?: number;
  contactedAt?: Date;
  promotedAt?: Date;
  dealId?: string;                // If promoted to Sales Pipeline
  notes?: string;
  profession?: string;
  city?: string;
  interests?: string;
  socialLinks?: string;
  address?: string;
  // — Persistence Loop Fields —
  hasTappedContactButton: boolean; // Only true when WhatsApp deep link is triggered
  overduesSince?: Date;            // When the contact became overdue (not contacted by EOD)
  assignedDate?: Date;             // Which day this was assigned to the daily list
  whatsappTemplate?: string;       // Custom pre-fill message template
  createdAt: Date;
  updatedAt: Date;
}

export type RelationshipTag =
  | 'family'
  | 'university'
  | 'former_colleague'
  | 'acquaintance'
  | 'client'
  | 'referral'
  | 'event'
  | 'other';

export type RadarStatus =
  | 'radar'               // Added, not contacted yet
  | 'contacted'           // Message sent, waiting for reply
  | 'snoozed'             // Not a good time, remind me later
  | 'promoted';           // Moved to Sales Pipeline as Deal

export const RELATIONSHIP_LABELS: Record<RelationshipTag, string> = {
  family: 'Familia',
  university: 'Universidad',
  former_colleague: 'Ex Colega',
  acquaintance: 'Conocido',
  client: 'Cliente',
  referral: 'Referido',
  event: 'Evento',
  other: 'Otro',
};

export const RELATIONSHIP_ICONS: Record<RelationshipTag, string> = {
  family: '👨‍👩‍👧',
  university: '🎓',
  former_colleague: '💼',
  acquaintance: '🤝',
  client: '👔',
  referral: '🔗',
  event: '🎪',
  other: '📌',
};

export const STATUS_LABELS: Record<RadarStatus, string> = {
  radar: 'En el Radar',
  contacted: 'Contacto Iniciado',
  snoozed: 'En Espera',
  promoted: 'Promovido a Deal',
};
