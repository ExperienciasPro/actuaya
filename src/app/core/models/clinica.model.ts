// ═══════════════════════════════════════════
// Módulo Clínica — Modelos
// ═══════════════════════════════════════════

export type AppointmentStatus = 'confirmada' | 'pendiente' | 'cancelada' | 'completada' | 'no-asistio';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp?: string;            // For automated reminders
  birthDate: string;           // YYYY-MM-DD
  gender: 'M' | 'F' | 'Otro';
  occupation: string;
  emergencyContact: string;
  emergencyPhone: string;
  photo?: string;
  notes: string;
  active: boolean;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;                // YYYY-MM-DD
  startTime: string;           // HH:mm
  endTime: string;             // HH:mm
  type: AppointmentType;
  status: AppointmentStatus;
  modality: 'presencial' | 'virtual';
  meetingLink?: string;
  reason: string;
  cost: number;
  paid: boolean;
  notes: string;
  createdAt: string;
}

export type AppointmentType =
  | 'primera-vez'
  | 'seguimiento'
  | 'evaluacion'
  | 'crisis'
  | 'familiar'
  | 'pareja'
  | 'grupal';

export interface ClinicalNote {
  id: string;
  patientId: string;
  appointmentId?: string;
  date: string;
  type: NoteType;
  title: string;
  content: string;             // Supports HTML from rich editor
  tags: string[];
  confidential: boolean;
  fromTemplate?: string;       // Template used
  fromVoice?: boolean;         // Transcribed from voice
  attachments?: NoteAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteAttachment {
  id: string;
  name: string;
  type: string;                // MIME type
  dataUrl: string;             // Base64 data URL
  createdAt: string;
}

export type NoteType =
  | 'sesion'
  | 'evaluacion'
  | 'evolucion'
  | 'interconsulta'
  | 'plan-tratamiento'
  | 'alta';

export interface ClinicalHistory {
  patientId: string;

  // ── 1. Datos de Identificación ──
  civilStatus: string;               // Estado civil
  familyComposition: string;         // Composición del núcleo familiar
  educationLevel: string;            // Nivel educativo
  orientation: string;               // Orientación (si relevante)
  emergencyContactName: string;
  emergencyContactPhone: string;

  // ── 2. Motivo de Consulta ──
  motiveConsultation: string;        // Descripción literal del problema
  expectations: string;              // ¿Qué espera lograr?

  // ── 3. Historia del Problema Actual ──
  symptomOnsetDate: string;          // Fecha de inicio de síntomas
  triggers: string;                  // Desencadenantes / eventos estresantes
  frequencyIntensity: string;        // Frecuencia, intensidad y duración
  evolution: string;                 // ¿Ha mejorado o empeorado?
  previousAttempts: string;          // Intentos previos de solución

  // ── 4. Antecedentes Personales (Anamnesis) ──
  physicalHealth: string;            // Enfermedades crónicas, cirugías, sueño, alimentación
  psychiatricHistory: string;        // Procesos previos, diagnósticos, hospitalizaciones
  substanceUse: string;              // Alcohol, tabaco, fármacos, sustancias
  developmentalMilestones: string;   // Hitos del desarrollo (niños/adolescentes)

  // ── 5. Historia Familiar y Red de Apoyo ──
  familyStructure: string;           // Quiénes viven con el paciente
  familyDynamics: string;            // Relación con figuras de autoridad y pares
  familyMentalHealth: string;        // Antecedentes familiares de salud mental
  supportNetwork: string;            // Amigos, pareja, grupos de pertenencia

  // ── 6. Examen del Estado Mental ──
  appearanceAttitude: string;        // Aliño, contacto visual, cooperación
  consciousnessOrientation: string;  // Orientación en espacio, tiempo y persona
  thoughtProcess: string;            // Curso, velocidad, contenido (delirios, obsesiones)
  languageAffect: string;            // Tono de voz, congruencia emocional

  // ── 7. Valoración de Riesgo ──
  suicidalIdeation: string;          // Pensamientos, planes o intentos previos
  aggressionRisk: string;            // Riesgo de agresión a terceros

  // ── Campos generales ──
  currentSymptoms: string;
  personalHistory: string;
  familyHistory: string;
  medicalHistory: string;
  medications: string;
  allergies: string;
  diagnosis: string;
  treatmentPlan: string;
  objectives: string[];
  riskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  redFlags: RedFlag[];
  updatedAt: string;
}

export type RedFlagType = 'ideacion-suicida' | 'autolesion' | 'alergia-medicamento' | 'trauma' | 'medicacion-critica' | 'abuso' | 'otro';

export interface RedFlag {
  id: string;
  type: RedFlagType;
  description: string;
  severity: 'alta' | 'critica';
  createdAt: string;
  active: boolean;
}

export const RED_FLAG_TYPES: { value: RedFlagType; label: string; icon: string; color: string }[] = [
  { value: 'ideacion-suicida',    label: 'Ideación Suicida',       icon: '🚨', color: '#dc2626' },
  { value: 'autolesion',          label: 'Autolesión',             icon: '⚠️', color: '#ef4444' },
  { value: 'alergia-medicamento', label: 'Alergia a Medicamento',  icon: '💊', color: '#f59e0b' },
  { value: 'trauma',              label: 'Antecedente de Trauma',  icon: '🔒', color: '#8b5cf6' },
  { value: 'medicacion-critica',  label: 'Medicación Crítica',     icon: '💉', color: '#ef4444' },
  { value: 'abuso',               label: 'Situación de Abuso',     icon: '🛡️', color: '#dc2626' },
  { value: 'otro',                label: 'Otro',                   icon: '🔴', color: '#94a3b8' },
];

export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  content: string;  // HTML template
}

export const DEFAULT_NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'primera-sesion',
    name: 'Primera Sesión',
    icon: '📋',
    description: 'Evaluación inicial, motivo de consulta, impresión diagnóstica',
    content: '<h3>Motivo de Consulta</h3><p>[Describir motivo principal]</p><h3>Historia del Problema</h3><p>[Cuándo inició, evolución, factores]</p><h3>Antecedentes Relevantes</h3><p>[Personales, familiares, médicos]</p><h3>Impresión Diagnóstica</h3><p>[Observaciones clínicas]</p><h3>Plan de Tratamiento Inicial</h3><p>[Objetivos, frecuencia, enfoque]</p>'
  },
  {
    id: 'seguimiento-tcc',
    name: 'Seguimiento TCC',
    icon: '🧠',
    description: 'Sesión de terapia cognitivo-conductual',
    content: '<h3>Agenda de Sesión</h3><p>[Temas a abordar]</p><h3>Revisión de Tarea</h3><p>[¿Completó? ¿Qué descubrió?]</p><h3>Trabajo en Sesión</h3><p>[Técnicas aplicadas, reestructuración]</p><h3>Pensamientos Automáticos Identificados</h3><ul><li>[Pensamiento 1]</li></ul><h3>Tarea Para Casa</h3><p>[Asignación para la próxima sesión]</p>'
  },
  {
    id: 'evolucion',
    name: 'Evolución',
    icon: '📈',
    description: 'Registro de estado emocional y avances',
    content: '<h3>Estado Emocional Actual</h3><p>[Observaciones del paciente]</p><h3>Avances</h3><ul><li>[Logro 1]</li></ul><h3>Áreas de Trabajo</h3><p>[Aspectos pendientes]</p><h3>Observaciones Clínicas</h3><p>[Notas del terapeuta]</p>'
  },
  {
    id: 'cierre-alta',
    name: 'Cierre / Alta',
    icon: '✅',
    description: 'Resumen de tratamiento y recomendaciones',
    content: '<h3>Resumen del Proceso</h3><p>[Duración, número de sesiones, enfoque]</p><h3>Objetivos Alcanzados</h3><ul><li>[Objetivo 1]</li></ul><h3>Objetivos Pendientes</h3><p>[Si aplica]</p><h3>Recomendaciones</h3><p>[Seguimiento, derivación, prevención de recaídas]</p>'
  }
];

export interface AvailabilitySlot {
  dayOfWeek: number;           // 0=Lun ... 6=Dom
  startTime: string;           // HH:mm
  endTime: string;             // HH:mm
  active: boolean;
}

export interface ClinicConfig {
  id: string;
  professionalName: string;
  specialty: string;
  licenseNumber: string;
  sessionDurationMinutes: number;
  bufferMinutes: number;
  defaultCost: number;
  currency: string;
  availability: AvailabilitySlot[];
  bookingMessage: string;
  bookingEnabled: boolean;
  remindersEnabled: boolean;
  reminderHoursBefore: number;  // e.g. 24
  customTemplates: NoteTemplate[];
}

// ─── Constantes ───────────────────────────

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string; color: string }[] = [
  { value: 'primera-vez',  label: 'Primera Vez',  color: '#8b5cf6' },
  { value: 'seguimiento',  label: 'Seguimiento',  color: '#51B6A5' },
  { value: 'evaluacion',   label: 'Evaluación',   color: '#3b82f6' },
  { value: 'crisis',       label: 'Crisis',        color: '#ef4444' },
  { value: 'familiar',     label: 'Familiar',      color: '#f59e0b' },
  { value: 'pareja',       label: 'Pareja',        color: '#ec4899' },
  { value: 'grupal',       label: 'Grupal',        color: '#06b6d4' },
];

export const NOTE_TYPES: { value: NoteType; label: string; icon: string }[] = [
  { value: 'sesion',           label: 'Nota de Sesión',       icon: '📝' },
  { value: 'evaluacion',      label: 'Evaluación',           icon: '🔍' },
  { value: 'evolucion',       label: 'Evolución',            icon: '📈' },
  { value: 'interconsulta',   label: 'Interconsulta',        icon: '🔄' },
  { value: 'plan-tratamiento', label: 'Plan de Tratamiento', icon: '🎯' },
  { value: 'alta',             label: 'Nota de Alta',        icon: '✅' },
];

export const RISK_LEVELS = [
  { value: 'bajo',    label: 'Bajo',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { value: 'medio',   label: 'Medio',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { value: 'alto',    label: 'Alto',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { value: 'critico', label: 'Crítico',   color: '#dc2626', bg: 'rgba(220,38,38,0.15)' },
];

export const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string; icon: string }> = {
  confirmada:  { label: 'Confirmada',  color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: '✓' },
  pendiente:   { label: 'Pendiente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '⏳' },
  cancelada:   { label: 'Cancelada',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '✕' },
  completada:  { label: 'Completada',  color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: '●' },
  'no-asistio': { label: 'No Asistió', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '○' },
};

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const DEFAULT_AVAILABILITY: AvailabilitySlot[] = [
  { dayOfWeek: 0, startTime: '09:00', endTime: '18:00', active: true  },
  { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', active: true  },
  { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', active: true  },
  { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', active: true  },
  { dayOfWeek: 4, startTime: '09:00', endTime: '14:00', active: true  },
  { dayOfWeek: 5, startTime: '09:00', endTime: '14:00', active: false },
  { dayOfWeek: 6, startTime: '09:00', endTime: '14:00', active: false },
];
