export type AssignmentStatus = 'confirmada' | 'pendiente' | 'completada' | 'retrasada' | 'cancelada';

export interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  specialty: string;
  photo?: string;
  active: boolean;
  notes: string;
  createdAt: string;
}

export interface Assignment {
  id: string;
  technicianId: string;
  technicianName: string;
  date: string;                // YYYY-MM-DD
  startTime: string;           // HH:mm
  endTime: string;             // HH:mm
  type: AssignmentType;
  status: AssignmentStatus;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  address: string;
  title: string;
  description: string;
  clientName: string;
  createdAt: string;
}

export type AssignmentType =
  | 'preventivo'
  | 'correctivo'
  | 'instalacion'
  | 'inspeccion'
  | 'emergencia';

export const ASSIGNMENT_TYPES: { value: AssignmentType; label: string; color: string }[] = [
  { value: 'preventivo', label: 'Mantenimiento Preventivo', color: '#0ea5e9' },
  { value: 'correctivo', label: 'Mantenimiento Correctivo', color: '#f59e0b' },
  { value: 'instalacion', label: 'Instalación', color: '#10b981' },
  { value: 'inspeccion', label: 'Inspección', color: '#8b5cf6' },
  { value: 'emergencia', label: 'Emergencia (SLA 2H)', color: '#ef4444' },
];

export const STATUS_CONFIG: Record<AssignmentStatus, { label: string; bg: string; color: string; icon: string }> = {
  'pendiente': { label: 'Por asignar', bg: '#fef3c7', color: '#d97706', icon: '⏳' },
  'confirmada': { label: 'Técnico Asignado', bg: '#e0f2fe', color: '#0284c7', icon: '👨‍🔧' },
  'completada': { label: 'Trabajo Completado', bg: '#d1fae5', color: '#059669', icon: '✅' },
  'retrasada': { label: 'Aumento de SLA', bg: '#fee2e2', color: '#dc2626', icon: '⚠️' },
  'cancelada': { label: 'Cancelada', bg: '#f1f5f9', color: '#475569', icon: '❌' },
};

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
