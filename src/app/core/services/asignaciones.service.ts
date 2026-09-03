import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { Technician, Assignment, ASSIGNMENT_TYPES, STATUS_CONFIG } from '../models/asignaciones.model';
import { StorageService } from './storage.service';
import { DataSyncService } from './data-sync.service';
@Injectable({ providedIn: 'root' })
export class AsignacionesService {
  private readonly STORAGE_TECH_KEY = 'um_technicians_v1';
  private readonly STORAGE_ASS_KEY = 'um_assignments_v1';

  private injector = inject(Injector);
  private _dataSync: DataSyncService | null = null;
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

  // Active technicians (not archived or inactive)
  activeTechnicians = computed(() => this._techniciansSignal().filter(t => t.active));

  estadisticas = computed(() => {
    const asgs = this._assignmentsSignal();
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
    const upcoming = this._assignmentsSignal()
      .filter(a => a.date === today && (a.status === 'pendiente' || a.status === 'confirmada'))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return upcoming.length > 0 ? upcoming[0] : null;
  });

  constructor(private storage: StorageService) {
    this.loadInitialData();
  }

  // ─── Technicians ────────────

  addTechnician(tech: Omit<Technician, 'id' | 'createdAt'>): Technician {
    const newTech: Technician = {
      ...tech,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this._techniciansSignal.update(t => [newTech, ...t]);
    this.persistTechnicians();
    return newTech;
  }

  updateTechnician(id: string, updates: Partial<Technician>): void {
    this._techniciansSignal.update(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t));
    this.persistTechnicians();
    this.dataSync.saveToServerImmediate();
  }

  getTechnician(id: string): Technician | undefined {
    return this._techniciansSignal().find(t => t.id === id);
  }

  deleteTechnician(id: string): void {
    this._techniciansSignal.update(ts => ts.map(t => t.id === id ? { ...t, isDeleted: true, updatedAt: new Date().toISOString() } : t));
    this.persistTechnicians();
    this.dataSync.saveToServerImmediate();
  }

  // ─── Assignments ────────────

  addAssignment(ass: Omit<Assignment, 'id' | 'createdAt'>): Assignment {
    const newAss: Assignment = {
      ...ass,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this._assignmentsSignal.update(a => [...a, newAss]);
    this.persistAssignments();
    return newAss;
  }

  updateAssignment(id: string, updates: Partial<Assignment>): void {
    this._assignmentsSignal.update(as => as.map(a => a.id === id ? { ...a, ...updates } : a));
    this.persistAssignments();
    this.dataSync.saveToServerImmediate();
  }

  deleteAssignment(id: string): void {
    this._assignmentsSignal.update(as => as.map(a => a.id === id ? { ...a, isDeleted: true, updatedAt: new Date().toISOString() } : a));
    this.persistAssignments();
    this.dataSync.saveToServerImmediate();
  }

  getAppointmentsForDate(dateStr: string): Assignment[] {
    return this._assignmentsSignal().filter(a => a.date === dateStr);
  }

  // ─── Persistence ──────────

  private persistTechnicians(): void {
    this.storage.set(this.STORAGE_TECH_KEY, this._techniciansSignal());
    this.dataSync.trackLocalModification(this.STORAGE_TECH_KEY);
    this.dataSync.saveToServerDebounced();
  }

  private persistAssignments(): void {
    this.storage.set(this.STORAGE_ASS_KEY, this._assignmentsSignal());
    this.dataSync.trackLocalModification(this.STORAGE_ASS_KEY);
    this.dataSync.saveToServerDebounced();
  }

  loadInitialData(): void {
    const storedTechs = this.storage.get<Technician[]>(this.STORAGE_TECH_KEY);
    const storedAss = this.storage.get<Assignment[]>(this.STORAGE_ASS_KEY);
    
    this._techniciansSignal.set(storedTechs && storedTechs.length > 0 ? storedTechs : []);
    this._assignmentsSignal.set(storedAss && storedAss.length > 0 ? storedAss : []);
  }

  private getMockTechnicians(): Technician[] {
    return [];
  }

  private getMockAssignments(): Assignment[] {
    return [];
  }
}
