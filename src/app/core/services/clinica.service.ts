import { Injectable, signal, computed } from '@angular/core';
import {
  Patient, Appointment, ClinicalNote, ClinicalHistory, ClinicConfig,
  AppointmentStatus, AvailabilitySlot, DEFAULT_AVAILABILITY,
  RedFlag, RedFlagType, NoteTemplate, DEFAULT_NOTE_TEMPLATES
} from '../models/clinica.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ClinicaService {
  private readonly PATIENTS_KEY    = 'um_clinica_patients';
  private readonly APPOINTMENTS_KEY = 'um_clinica_appointments';
  private readonly NOTES_KEY       = 'um_clinica_notes';
  private readonly HISTORY_KEY     = 'um_clinica_histories';
  private readonly CONFIG_KEY      = 'um_clinica_config';

  // ─── State Signals ─────────────────────
  private _patients     = signal<Patient[]>([]);
  private _appointments = signal<Appointment[]>([]);
  private _notes        = signal<ClinicalNote[]>([]);
  private _histories    = signal<ClinicalHistory[]>([]);
  private _config       = signal<ClinicConfig>(this.defaultConfig());

  patients     = this._patients.asReadonly();
  appointments = this._appointments.asReadonly();
  notes        = this._notes.asReadonly();
  config       = this._config.asReadonly();

  // ─── Computed Queries ──────────────────

  activePatients = computed(() => this._patients().filter(p => p.active));

  todayStr = computed(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  citasHoy = computed(() => {
    const today = this.todayStr();
    return this._appointments()
      .filter(a => a.date === today && a.status !== 'cancelada')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  citasSemana = computed(() => {
    const { start, end } = this.getCurrentWeekRange();
    return this._appointments()
      .filter(a => a.date >= start && a.date <= end && a.status !== 'cancelada')
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date));
  });

  proximaCita = computed(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return this._appointments()
      .filter(a => a.status === 'confirmada' || a.status === 'pendiente')
      .filter(a => a.date > todayStr || (a.date === todayStr && a.startTime >= nowTime))
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date))[0] || null;
  });

  ingresosMes = computed(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this._appointments()
      .filter(a => a.date.startsWith(monthStr) && a.paid)
      .reduce((sum, a) => sum + a.cost, 0);
  });

  estadisticas = computed(() => {
    const hoy = this.citasHoy();
    const primeraVez = hoy.filter(a => a.type === 'primera-vez').length;
    const total = this._patients().length;
    const activos = this.activePatients().length;
    return { citasHoy: hoy.length, primeraVezHoy: primeraVez, totalPacientes: total, pacientesActivos: activos, ingresosMes: this.ingresosMes() };
  });

  constructor(private storage: StorageService) {
    this.load();
  }

  // ────────────────────────────────────────
  // Patients CRUD
  // ────────────────────────────────────────

  addPatient(data: Omit<Patient, 'id' | 'createdAt' | 'active'>): Patient {
    const patient: Patient = { ...data, id: crypto.randomUUID(), active: true, createdAt: new Date().toISOString() };
    this._patients.update(list => [patient, ...list]);
    this.persist(this.PATIENTS_KEY, this._patients());
    // Create empty clinical history
    this.initHistory(patient.id);
    return patient;
  }

  updatePatient(id: string, changes: Partial<Patient>): void {
    this._patients.update(list => list.map(p => p.id === id ? { ...p, ...changes } : p));
    this.persist(this.PATIENTS_KEY, this._patients());
  }

  removePatient(id: string): void {
    this.updatePatient(id, { active: false });
  }

  getPatient(id: string): Patient | undefined {
    return this._patients().find(p => p.id === id);
  }

  searchPatients(query: string): Patient[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.activePatients();
    return this.activePatients().filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  }

  // ────────────────────────────────────────
  // Appointments CRUD
  // ────────────────────────────────────────

  scheduleAppointment(data: Omit<Appointment, 'id' | 'createdAt'>): Appointment {
    const appt: Appointment = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this._appointments.update(list => [...list, appt]);
    this.persist(this.APPOINTMENTS_KEY, this._appointments());
    return appt;
  }

  updateAppointment(id: string, changes: Partial<Appointment>): void {
    this._appointments.update(list => list.map(a => a.id === id ? { ...a, ...changes } : a));
    this.persist(this.APPOINTMENTS_KEY, this._appointments());
  }

  cancelAppointment(id: string): void {
    this.updateAppointment(id, { status: 'cancelada' });
  }

  completeAppointment(id: string): void {
    this.updateAppointment(id, { status: 'completada' });
  }

  markNoShow(id: string): void {
    this.updateAppointment(id, { status: 'no-asistio' });
  }

  confirmAppointment(id: string): void {
    this.updateAppointment(id, { status: 'confirmada' });
  }

  getAppointmentsForDate(date: string): Appointment[] {
    return this._appointments()
      .filter(a => a.date === date && a.status !== 'cancelada')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  getAppointmentsForWeek(weekStart: string): Appointment[] {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split('T')[0];
    return this._appointments()
      .filter(a => a.date >= weekStart && a.date <= endStr && a.status !== 'cancelada')
      .sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date));
  }

  getPatientAppointments(patientId: string): Appointment[] {
    return this._appointments()
      .filter(a => a.patientId === patientId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  // ────────────────────────────────────────
  // Clinical Notes CRUD
  // ────────────────────────────────────────

  addNote(data: Omit<ClinicalNote, 'id' | 'createdAt' | 'updatedAt'>): ClinicalNote {
    const now = new Date().toISOString();
    const note: ClinicalNote = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    this._notes.update(list => [note, ...list]);
    this.persist(this.NOTES_KEY, this._notes());
    return note;
  }

  updateNote(id: string, changes: Partial<ClinicalNote>): void {
    this._notes.update(list => list.map(n => n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n));
    this.persist(this.NOTES_KEY, this._notes());
  }

  removeNote(id: string): void {
    this._notes.update(list => list.filter(n => n.id !== id));
    this.persist(this.NOTES_KEY, this._notes());
  }

  getPatientNotes(patientId: string): ClinicalNote[] {
    return this._notes()
      .filter(n => n.patientId === patientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ────────────────────────────────────────
  // Clinical History
  // ────────────────────────────────────────

  getHistory(patientId: string): ClinicalHistory | undefined {
    return this._histories().find(h => h.patientId === patientId);
  }

  updateHistory(patientId: string, changes: Partial<ClinicalHistory>): void {
    this._histories.update(list => {
      const idx = list.findIndex(h => h.patientId === patientId);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = { ...updated[idx], ...changes, updatedAt: new Date().toISOString() };
        return updated;
      }
      return list;
    });
    this.persist(this.HISTORY_KEY, this._histories());
  }

  private initHistory(patientId: string): void {
    const empty: ClinicalHistory = {
      patientId,
      // 1. Datos de Identificación
      civilStatus: '', familyComposition: '', educationLevel: '', orientation: '',
      emergencyContactName: '', emergencyContactPhone: '',
      // 2. Motivo de Consulta
      motiveConsultation: '', expectations: '',
      // 3. Historia del Problema Actual
      symptomOnsetDate: '', triggers: '', frequencyIntensity: '', evolution: '', previousAttempts: '',
      // 4. Antecedentes Personales
      physicalHealth: '', psychiatricHistory: '', substanceUse: '', developmentalMilestones: '',
      // 5. Historia Familiar y Red de Apoyo
      familyStructure: '', familyDynamics: '', familyMentalHealth: '', supportNetwork: '',
      // 6. Examen del Estado Mental
      appearanceAttitude: '', consciousnessOrientation: '', thoughtProcess: '', languageAffect: '',
      // 7. Valoración de Riesgo
      suicidalIdeation: '', aggressionRisk: '',
      // Campos generales
      currentSymptoms: '', personalHistory: '',
      familyHistory: '', medicalHistory: '', medications: '', allergies: '',
      diagnosis: '', treatmentPlan: '', objectives: [], riskLevel: 'bajo',
      redFlags: [],
      updatedAt: new Date().toISOString(),
    };
    this._histories.update(list => [...list, empty]);
    this.persist(this.HISTORY_KEY, this._histories());
  }

  // ────────────────────────────────────────
  // Red Flags
  // ────────────────────────────────────────

  addRedFlag(patientId: string, type: RedFlagType, description: string, severity: 'alta' | 'critica'): void {
    const flag: RedFlag = {
      id: crypto.randomUUID(), type, description, severity,
      createdAt: new Date().toISOString(), active: true
    };
    this._histories.update(list => {
      const idx = list.findIndex(h => h.patientId === patientId);
      if (idx >= 0) {
        const updated = [...list];
        const flags = [...(updated[idx].redFlags || []), flag];
        updated[idx] = { ...updated[idx], redFlags: flags, updatedAt: new Date().toISOString() };
        return updated;
      }
      return list;
    });
    this.persist(this.HISTORY_KEY, this._histories());
  }

  removeRedFlag(patientId: string, flagId: string): void {
    this._histories.update(list => {
      const idx = list.findIndex(h => h.patientId === patientId);
      if (idx >= 0) {
        const updated = [...list];
        const flags = (updated[idx].redFlags || []).map(f => f.id === flagId ? { ...f, active: false } : f);
        updated[idx] = { ...updated[idx], redFlags: flags, updatedAt: new Date().toISOString() };
        return updated;
      }
      return list;
    });
    this.persist(this.HISTORY_KEY, this._histories());
  }

  getActiveRedFlags(patientId: string): RedFlag[] {
    const h = this.getHistory(patientId);
    return (h?.redFlags || []).filter(f => f.active);
  }

  // ────────────────────────────────────────
  // Config
  // ────────────────────────────────────────

  updateConfig(changes: Partial<ClinicConfig>): void {
    this._config.update(c => ({ ...c, ...changes }));
    this.persist(this.CONFIG_KEY, this._config());
  }

  // ────────────────────────────────────────
  // Availability — for public booking portal
  // ────────────────────────────────────────

  getAvailableSlots(date: string): string[] {
    const dayOfWeek = this.dateToDayOfWeek(date);
    const cfg = this._config();
    const slot = cfg.availability.find(s => s.dayOfWeek === dayOfWeek);
    if (!slot || !slot.active) return [];

    const duration = cfg.sessionDurationMinutes;
    const buffer = cfg.bufferMinutes;
    const existingAppts = this.getAppointmentsForDate(date);

    const slots: string[] = [];
    let current = this.timeToMinutes(slot.startTime);
    const end = this.timeToMinutes(slot.endTime);

    while (current + duration <= end) {
      const timeStr = this.minutesToTime(current);
      const endTimeStr = this.minutesToTime(current + duration);
      const conflict = existingAppts.some(a =>
        (a.startTime < endTimeStr && a.endTime > timeStr)
      );
      if (!conflict) {
        slots.push(timeStr);
      }
      current += duration + buffer;
    }

    return slots;
  }

  isDateAvailable(date: string): boolean {
    const dayOfWeek = this.dateToDayOfWeek(date);
    const slot = this._config().availability.find(s => s.dayOfWeek === dayOfWeek);
    return !!slot && slot.active;
  }

  // ────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────

  private getCurrentWeekRange(): { start: string; end: string } {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] };
  }

  private dateToDayOfWeek(dateStr: string): number {
    const d = new Date(dateStr + 'T12:00:00');
    const jsDay = d.getDay(); // 0=Sun
    return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private defaultConfig(): ClinicConfig {
    return {
      id: 'default',
      professionalName: '',
      specialty: 'Psicología Clínica',
      licenseNumber: '',
      sessionDurationMinutes: 50,
      bufferMinutes: 10,
      defaultCost: 800,
      currency: 'MXN',
      availability: [...DEFAULT_AVAILABILITY],
      bookingMessage: '¡Bienvenido! Selecciona un horario disponible para agendar tu cita.',
      bookingEnabled: true,
      remindersEnabled: false,
      reminderHoursBefore: 24,
      customTemplates: [],
    };
  }

  // ─── Persistence ────────────────────────

  private load(): void {
    const patients = this.storage.get<Patient[]>(this.PATIENTS_KEY);
    if (patients) this._patients.set(patients);
    const appts = this.storage.get<Appointment[]>(this.APPOINTMENTS_KEY);
    if (appts) this._appointments.set(appts);
    const notes = this.storage.get<ClinicalNote[]>(this.NOTES_KEY);
    if (notes) this._notes.set(notes);
    const histories = this.storage.get<ClinicalHistory[]>(this.HISTORY_KEY);
    if (histories) this._histories.set(histories);
    const cfg = this.storage.get<ClinicConfig>(this.CONFIG_KEY);
    if (cfg) this._config.set(cfg);
  }

  private persist(key: string, data: any): void {
    this.storage.set(key, data);
  }
}
