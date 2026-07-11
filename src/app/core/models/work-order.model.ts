// ═══════════════════════════════════════════
// Órdenes de Trabajo — Modelos (Técnicos en Campo)
// ═══════════════════════════════════════════

export type OtStatus =
  | 'abierta'
  | 'asignada'
  | 'en_camino'
  | 'en_ejecucion'
  | 'en_pausa'
  | 'completada'
  | 'cerrada';

export const OT_STATUS_LABELS: Record<OtStatus, string> = {
  abierta: 'Abierta/Pendiente',
  asignada: 'Asignada',
  en_camino: 'En Camino',
  en_ejecucion: 'En Ejecución',
  en_pausa: 'En Pausa',
  completada: 'Completada',
  cerrada: 'Cerrada/Auditada',
};

export const OT_STATUS_ICONS: Record<OtStatus, string> = {
  abierta: '📋',
  asignada: '👤',
  en_camino: '🚗',
  en_ejecucion: '🔧',
  en_pausa: '⏸️',
  completada: '✅',
  cerrada: '🔒',
};

export const OT_STATUS_COLORS: Record<OtStatus, string> = {
  abierta: '#3498db',
  asignada: '#9b59b6',
  en_camino: '#f39c12',
  en_ejecucion: '#00d592',
  en_pausa: '#e74c3c',
  completada: '#2ecc71',
  cerrada: '#7f8c8d',
};

export type OtPriority = 'baja' | 'media' | 'alta' | 'critica';

export const OT_PRIORITY_LABELS: Record<OtPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

export const OT_PRIORITY_COLORS: Record<OtPriority, string> = {
  baja: '#95a5a6',
  media: '#3498db',
  alta: '#f39c12',
  critica: '#e74c3c',
};

export interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: OtStatus;
  assigned_to: string | null;
  justification_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // ── CEO Dashboard extended fields ──
  priority?: OtPriority;
  tech_name?: string | null;
  tech_hourly_rate?: number;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  sla_hours?: number;
  parts_cost?: number;
  parts?: Array<{ sku: string; name: string; cost: number; qty: number }>;
  transitioned_to_en_camino_at?: string | null;
  execution_started_at?: string | null;
}

export interface OtEvidence {
  id: string;
  type: 'photo_before' | 'photo_after' | 'video';
  dataUrl: string;          // base64 or objectURL
  filename: string;
  timestamp: string;
}

export interface OtSparePart {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface OtCompletionData {
  evidence: OtEvidence[];
  spareParts: OtSparePart[];
  findings: string;
  signatureDataUrl: string | null;
  totalPartsCost: number;
}
