import { Injectable, signal, computed, inject, Injector, effect, untracked } from '@angular/core';
import { Technician, Assignment } from '../models/asignaciones.model';
import { Tecnico } from '../models/tecnico.model';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';

@Injectable({ providedIn: 'root' })
export class AsignacionesService {
  private readonly STORAGE_TECH_KEY = 'um_technicians_v1';
  private readonly LEGACY_ADMIN_TECH_KEY = 'um_tecnicos';
  private readonly STORAGE_ASS_KEY = 'um_assignments_v1';

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
  private lastMergedPersistSignature = '';

  private get dataSync(): DataSyncService {
    if (!this._dataSync) {
      this._dataSync = this.injector.get(DataSyncService);
    }
    return this._dataSync;
  }

  private _techniciansSignal = signal<Technician[]>([]);
  private _assignmentsSignal = signal<Assignment[]>([]);

  technicians = computed(() => this._techniciansSignal().filter(t => !t.isDeleted));
  assignments = computed(() => this._assignmentsSignal().filter(a => !a.isDeleted));

  // Active technicians (not deleted and active !== false)
  activeTechnicians = computed(() => this.technicians().filter(t => t.active !== false));

  estadisticas = computed(() => {
    const asgs = this.assignments();
    const today = new Date().toISOString().split('T')[0];
    const hoy = asgs.filter(a => a.date === today);
    const completadas = asgs.filter(a => a.status === 'completada' && a.date === today).length;

    return {
      asignacionesHoy: hoy.length,
      completadasHoy: completadas,
      tecnicosActivos: this.activeTechnicians().length,
      retrasadas: asgs.filter(a => a.status === 'retrasada' && a.date === today).length,
    };
  });

  proximaAsignacion = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = this.assignments()
      .filter(a => a.date === today && (a.status === 'pendiente' || a.status === 'confirmada'))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return upcoming.length > 0 ? upcoming[0] : null;
  });

  private storage = inject(StorageService);

  constructor() {
    this.loadInitialData();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        untracked(() => this.loadInitialData());
      }
    });
  }

  // ─── Mapping Helpers (Technician <-> Tecnico) ────────────

  static splitFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  static formatFullName(tech: Pick<Technician, 'firstName' | 'lastName'>): string {
    return `${tech.firstName || ''} ${tech.lastName || ''}`.trim();
  }

  static toTecnico(t: Technician): Tecnico {
    const now = new Date().toISOString();
    return {
      id: t.id,
      nombre: AsignacionesService.formatFullName(t),
      telefono: t.phone || '',
      correo: t.email || '',
      especialidad: t.specialty || 'General',
      estatus: t.active !== false ? 'Activo' : 'Inactivo',
      createdAt: t.createdAt || now,
      updatedAt: t.updatedAt || t.createdAt || now,
      isDeleted: t.isDeleted,
    };
  }

  static fromTecnico(lt: Tecnico): Technician {
    const now = new Date().toISOString();
    const { firstName, lastName } = AsignacionesService.splitFullName(lt.nombre);
    return {
      id: lt.id,
      firstName,
      lastName,
      email: lt.correo || '',
      phone: lt.telefono || '',
      specialty: lt.especialidad || 'General',
      active: lt.estatus !== 'Inactivo',
      notes: '',
      createdAt: lt.createdAt || now,
      updatedAt: lt.updatedAt || lt.createdAt || now,
      isDeleted: lt.isDeleted,
    };
  }

  // ─── Technicians ────────────

  addTechnician(tech: Omit<Technician, 'id' | 'createdAt'>): Technician {
    const now = new Date().toISOString();
    const rawFirst = (tech.firstName || '').trim();
    const rawLast = (tech.lastName || '').trim();
    // If user put full name into firstName and left lastName empty, split cleanly
    const { firstName, lastName } = !rawLast && rawFirst.includes(' ')
      ? AsignacionesService.splitFullName(rawFirst)
      : { firstName: rawFirst, lastName: rawLast };

    const newTech: Technician = {
      ...tech,
      firstName,
      lastName,
      email: (tech.email || '').trim(),
      phone: (tech.phone || '').trim(),
      specialty: (tech.specialty || '').trim() || 'General',
      notes: tech.notes || '',
      active: tech.active !== false,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this._techniciansSignal.update(t => [newTech, ...t]);
    this.persistTechnicians();
    return newTech;
  }

  updateTechnician(id: string, updates: Partial<Technician>): void {
    const now = new Date().toISOString();
    let updatedFullName: string | null = null;

    this._techniciansSignal.update(ts =>
      ts.map(t => {
        if (t.id !== id) return t;
        const merged: Technician = {
          ...t,
          ...updates,
          updatedAt: now,
        };
        updatedFullName = AsignacionesService.formatFullName(merged);
        return merged;
      })
    );
    this.persistTechnicians();

    // Keep technicianName synchronized on existing assignments
    if (updatedFullName) {
      const nameToApply = updatedFullName;
      const hasStaleAssignmentName = this._assignmentsSignal().some(
        a => a.technicianId === id && a.technicianName !== nameToApply
      );
      if (hasStaleAssignmentName) {
        this._assignmentsSignal.update(as =>
          as.map(a => (a.technicianId === id ? { ...a, technicianName: nameToApply, updatedAt: now } : a))
        );
        this.persistAssignments();
      }
    }
  }

  getTechnician(id: string): Technician | undefined {
    return this.technicians().find(t => t.id === id) || this._techniciansSignal().find(t => t.id === id);
  }

  deleteTechnician(id: string): void {
    const now = new Date().toISOString();
    this._techniciansSignal.update(ts =>
      ts.map(t => (t.id === id ? { ...t, active: false, isDeleted: true, updatedAt: now } : t))
    );
    this.persistTechnicians();
  }

  // ─── Assignments ────────────

  addAssignment(ass: Omit<Assignment, 'id' | 'createdAt'>): Assignment {
    const now = new Date().toISOString();
    const tech = ass.technicianId ? this.getTechnician(ass.technicianId) : undefined;
    const resolvedTechName = tech ? AsignacionesService.formatFullName(tech) : (ass.technicianName || '');

    const newAss: Assignment = {
      ...ass,
      technicianName: resolvedTechName,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this._assignmentsSignal.update(a => [...a, newAss]);
    this.persistAssignments();
    return newAss;
  }

  updateAssignment(id: string, updates: Partial<Assignment>): void {
    const now = new Date().toISOString();
    const tech = updates.technicianId ? this.getTechnician(updates.technicianId) : undefined;
    const resolvedUpdates: Partial<Assignment> = {
      ...updates,
      ...(tech ? { technicianName: AsignacionesService.formatFullName(tech) } : {}),
      updatedAt: now,
    };
    this._assignmentsSignal.update(as => as.map(a => (a.id === id ? { ...a, ...resolvedUpdates } : a)));
    this.persistAssignments();
  }

  deleteAssignment(id: string): void {
    const now = new Date().toISOString();
    this._assignmentsSignal.update(as =>
      as.map(a => (a.id === id ? { ...a, isDeleted: true, updatedAt: now } : a))
    );
    this.persistAssignments();
  }

  getAppointmentsForDate(dateStr: string): Assignment[] {
    return this.assignments().filter(a => a.date === dateStr);
  }

  // ─── Persistence & Bidirectional Merge ──────────

  private persistTechnicians(): void {
    const allTechs = this._techniciansSignal();
    const asAdminTecnicos = allTechs.map(t => AsignacionesService.toTecnico(t));
    this.lastMergedPersistSignature = JSON.stringify(allTechs.map(t => `${t.id}:${t.updatedAt}:${t.isDeleted}`));
    this.storage.set(this.STORAGE_TECH_KEY, allTechs);
    this.storage.set(this.LEGACY_ADMIN_TECH_KEY, asAdminTecnicos);
    this.dataSync.trackLocalModification(this.STORAGE_TECH_KEY);
    this.dataSync.trackLocalModification(this.LEGACY_ADMIN_TECH_KEY);
    this.dataSync.saveToServerImmediate();
  }

  private persistAssignments(): void {
    this.storage.set(this.STORAGE_ASS_KEY, this._assignmentsSignal());
    this.dataSync.trackLocalModification(this.STORAGE_ASS_KEY);
    this.dataSync.saveToServerImmediate();
  }

  loadInitialData(): void {
    const storedTechsRaw = this.storage.get<Technician[]>(this.STORAGE_TECH_KEY);
    const legacyAdminTechsRaw = this.storage.get<Tecnico[]>(this.LEGACY_ADMIN_TECH_KEY);
    const storedAssRaw = this.storage.get<Assignment[]>(this.STORAGE_ASS_KEY);

    const baseTechs = Array.isArray(storedTechsRaw) ? storedTechsRaw : [];
    const adminTechs = Array.isArray(legacyAdminTechsRaw) ? legacyAdminTechsRaw : [];
    const storedAss = Array.isArray(storedAssRaw) ? storedAssRaw : [];

    const byId = new Map<string, Technician>();
    const activeEmails = new Set<string>();
    const activeNamePhones = new Set<string>();

    for (const raw of baseTechs) {
      if (!raw?.id) continue;
      const normalized: Technician = {
        ...raw,
        firstName: raw.firstName || '',
        lastName: raw.lastName || '',
        email: raw.email || '',
        phone: raw.phone || '',
        specialty: raw.specialty || 'General',
        notes: raw.notes || '',
        active: raw.isDeleted ? false : raw.active !== false,
      };
      byId.set(normalized.id, normalized);
      if (!normalized.isDeleted) {
        const em = normalized.email.toLowerCase().trim();
        const nm = AsignacionesService.formatFullName(normalized).toLowerCase();
        const ph = normalized.phone.replace(/\D/g, '');
        if (em) activeEmails.add(em);
        if (nm && ph) activeNamePhones.add(`${nm}|${ph}`);
      }
    }

    let needsSyncPersist = false;
    for (const lt of adminTechs) {
      if (!lt?.id) continue;
      const existing = byId.get(lt.id);
      if (existing) {
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const ltTime = new Date(lt.updatedAt || lt.createdAt || 0).getTime();
        if (lt.isDeleted && !existing.isDeleted && ltTime >= existingTime) {
          byId.set(lt.id, { ...existing, active: false, isDeleted: true, updatedAt: lt.updatedAt || existing.updatedAt });
          needsSyncPersist = true;
        } else if (ltTime > existingTime) {
          const converted = AsignacionesService.fromTecnico(lt);
          byId.set(lt.id, {
            ...existing,
            ...converted,
            specialty: lt.especialidad || existing.specialty || 'General',
            notes: existing.notes || '',
          });
          needsSyncPersist = true;
        }
      } else {
        const ltEmail = (lt.correo || '').toLowerCase().trim();
        const ltName = (lt.nombre || '').toLowerCase().trim();
        const ltDigits = (lt.telefono || '').replace(/\D/g, '');
        const isDuplicateActive =
          !lt.isDeleted &&
          ((ltEmail && activeEmails.has(ltEmail)) ||
            (ltName && ltDigits && activeNamePhones.has(`${ltName}|${ltDigits}`)));

        const converted = AsignacionesService.fromTecnico(lt);
        if (!isDuplicateActive) {
          byId.set(converted.id, converted);
          if (!converted.isDeleted) {
            if (ltEmail) activeEmails.add(ltEmail);
            if (ltName && ltDigits) activeNamePhones.add(`${ltName}|${ltDigits}`);
          }
          needsSyncPersist = true;
        } else {
          // Soft-delete duplicate legacy ID so server mergeArrayById never resurrects it
          byId.set(converted.id, {
            ...converted,
            active: false,
            isDeleted: true,
            updatedAt: new Date().toISOString(),
          });
          needsSyncPersist = true;
        }
      }
    }

    const adminIdSet = new Set(adminTechs.map(a => a?.id).filter(Boolean));
    const missingInAdminStore = Array.from(byId.keys()).some(id => !adminIdSet.has(id));

    const mergedTechs = Array.from(byId.values());
    this._techniciansSignal.set(mergedTechs);
    this._assignmentsSignal.set(storedAss);

    if ((needsSyncPersist || missingInAdminStore) && mergedTechs.length > 0 && this.storage.getActiveUserId()) {
      const sig = JSON.stringify(mergedTechs.map(t => `${t.id}:${t.updatedAt}:${t.isDeleted}`));
      if (sig !== this.lastMergedPersistSignature) {
        this.persistTechnicians();
      }
    }
  }
}
