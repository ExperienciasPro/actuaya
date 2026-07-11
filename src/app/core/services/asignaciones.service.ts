import { Injectable, signal, computed } from '@angular/core';
import { Technician, Assignment, ASSIGNMENT_TYPES, STATUS_CONFIG } from '../models/asignaciones.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AsignacionesService {
  private readonly STORAGE_TECH_KEY = 'um_technicians_v1';
  private readonly STORAGE_ASS_KEY = 'um_assignments_v1';

  private _technicians = signal<Technician[]>([]);
  private _assignments = signal<Assignment[]>([]);

  technicians = this._technicians.asReadonly();
  assignments = this._assignments.asReadonly();

  // Active technicians (not archived or inactive)
  activeTechnicians = computed(() => this._technicians().filter(t => t.active));

  estadisticas = computed(() => {
    const asgs = this._assignments();
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
    const upcoming = this._assignments()
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
    this._technicians.update(t => [newTech, ...t]);
    this.persistTechnicians();
    return newTech;
  }

  updateTechnician(id: string, updates: Partial<Technician>): void {
    this._technicians.update(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t));
    this.persistTechnicians();
  }

  getTechnician(id: string): Technician | undefined {
    return this._technicians().find(t => t.id === id);
  }

  // ─── Assignments ────────────

  addAssignment(ass: Omit<Assignment, 'id' | 'createdAt'>): Assignment {
    const newAss: Assignment = {
      ...ass,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this._assignments.update(a => [...a, newAss]);
    this.persistAssignments();
    return newAss;
  }

  updateAssignment(id: string, updates: Partial<Assignment>): void {
    this._assignments.update(as => as.map(a => a.id === id ? { ...a, ...updates } : a));
    this.persistAssignments();
  }

  deleteAssignment(id: string): void {
    this._assignments.update(as => as.filter(a => a.id !== id));
    this.persistAssignments();
  }

  getAppointmentsForDate(dateStr: string): Assignment[] {
    return this._assignments().filter(a => a.date === dateStr);
  }

  // ─── Persistence ──────────

  private persistTechnicians(): void {
    this.storage.set(this.STORAGE_TECH_KEY, this._technicians());
  }

  private persistAssignments(): void {
    this.storage.set(this.STORAGE_ASS_KEY, this._assignments());
  }

  loadInitialData(): void {
    const storedTechs = this.storage.get<Technician[]>(this.STORAGE_TECH_KEY);
    const storedAss = this.storage.get<Assignment[]>(this.STORAGE_ASS_KEY);
    
    if (storedTechs && storedTechs.length > 0) {
      this._technicians.set(storedTechs);
    } else {
      this._technicians.set(this.getMockTechnicians());
      this.persistTechnicians();
    }

    if (storedAss && storedAss.length > 0) {
      this._assignments.set(storedAss);
    } else {
      this._assignments.set(this.getMockAssignments());
      this.persistAssignments();
    }
  }

  private getMockTechnicians(): Technician[] {
    return [
      {
        id: 't-001',
        firstName: 'Mario',
        lastName: 'Ramírez',
        email: 'mario.ramirez@actuaya.com',
        phone: '+52 555 123 4567',
        specialty: 'Electricidad e Instalaciones',
        active: true,
        notes: 'Especialista nivel senior.',
        createdAt: new Date().toISOString()
      },
      {
        id: 't-002',
        firstName: 'Sara',
        lastName: 'Gómez',
        email: 'sara.gomez@actuaya.com',
        phone: '+52 555 987 6543',
        specialty: 'Plomería y Aguas',
        active: true,
        notes: 'Herramienta propia.',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private getMockAssignments(): Assignment[] {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'a-001',
        technicianId: 't-001',
        technicianName: 'Mario Ramírez',
        date: today,
        startTime: '09:00',
        endTime: '11:00',
        type: 'preventivo',
        status: 'confirmada',
        priority: 'media',
        address: 'Av. Reforma #405, CDMX',
        title: 'Mantenimiento Preventivo Tablero Principal',
        description: 'Revisión y ajuste de interruptores principales.',
        clientName: 'Corporativo Viamonte',
        createdAt: new Date().toISOString()
      },
      {
        id: 'a-002',
        technicianId: 't-002',
        technicianName: 'Sara Gómez',
        date: today,
        startTime: '13:00',
        endTime: '15:00',
        type: 'emergencia',
        status: 'retrasada',
        priority: 'urgente',
        address: 'Plaza Galerías Sur, Local 42',
        title: 'Fuga de agua en matriz comercial',
        description: 'Acudir de emergencia para sellar rotura de matriz.',
        clientName: 'Grupo Retail SAB',
        createdAt: new Date().toISOString()
      }
    ];
  }
}
