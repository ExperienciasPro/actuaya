// ═══════════════════════════════════════════
// Gestión de Turnos & Equipo — Modelos
// ═══════════════════════════════════════════

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  color: string;         // color badge for visual ID
  active: boolean;
  createdAt: string;
}

export interface Shift {
  id: string;
  memberId: string;
  memberName: string;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  note: string;
}

export const SHIFT_PRESETS = [
  { label: 'Mañana',     start: '06:00', end: '14:00' },
  { label: 'Tarde',      start: '14:00', end: '22:00' },
  { label: 'Noche',      start: '22:00', end: '06:00' },
  { label: 'Medio día',  start: '10:00', end: '18:00' },
  { label: 'Completo',   start: '08:00', end: '18:00' },
];

export const MEMBER_COLORS = [
  '#6c5ce7', '#00b4a6', '#e84393', '#f39c12',
  '#3498db', '#e74c3c', '#2ecc71', '#9b59b6',
  '#1abc9c', '#e67e22', '#2c3e50', '#16a085',
];

export const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const WEEKDAY_FULL  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
