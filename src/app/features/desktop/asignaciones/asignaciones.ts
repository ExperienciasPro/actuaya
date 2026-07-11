import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsignacionesService } from '../../../core/services/asignaciones.service';
import {
  Technician, Assignment, ASSIGNMENT_TYPES, STATUS_CONFIG, WEEKDAYS, WEEKDAYS_SHORT, AssignmentType, AssignmentStatus
} from '../../../core/models/asignaciones.model';

type MainTab = 'agenda' | 'tecnicos' | 'config';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  styleUrl: 'asignaciones.scss',
  template: `
    <div class="clinica-page">
      <!-- ═══════ MODULE HEADER ═══════ -->
      <div class="module-header">
        <div class="module-header-top">
          <div>
            <div class="module-title-row">
              <div class="module-icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <h1 class="module-title">Módulo Asignaciones</h1>
            </div>
            <p class="module-subtitle">Asignación de órdenes a técnicos</p>
          </div>
        </div>

        <div class="tabs-row">
          <button class="tab-btn" [class.active]="activeTab() === 'agenda'" (click)="setTab('agenda')">
            <span class="tab-icon">📅</span>
            Agenda
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'tecnicos'" (click)="setTab('tecnicos')">
            <span class="tab-icon">👨‍🔧</span>
            Técnicos
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'config'" (click)="setTab('config')">
            <span class="tab-icon">⚙️</span>
            Configuración
          </button>
        </div>
      </div>

      <!-- ═══════ TAB: AGENDA ═══════ -->
      <div *ngIf="activeTab() === 'agenda'" class="fade-in">

        <!-- KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">📅</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ stats().asignacionesHoy }}</div>
              <div class="kpi-label">Asignac. Hoy</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">👨‍🔧</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ stats().tecnicosActivos }}</div>
              <div class="kpi-label">Técnicos</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">✅</div>
            <div class="kpi-body">
              <div class="kpi-value">{{ stats().completadasHoy | number:'1.0-0' }}</div>
              <div class="kpi-label">Completadas</div>
            </div>
          </div>
          <div class="kpi-card" *ngIf="proxAsignacion()">
            <div class="kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">⏳</div>
            <div class="kpi-body">
              <div class="kpi-value" style="font-size: 1.1rem;">{{ proxAsignacion()!.startTime }}</div>
              <div class="kpi-label">Próxima: {{ proxAsignacion()!.technicianName.split(' ')[0] }}</div>
            </div>
          </div>
        </div>

        <!-- Header Navigation (View Toggle + Date Nav) -->
        <div class="calendar-header-nav">
          <div class="view-toggle">
            <button [class.active]="calendarView() === 'dia'" (click)="setView('dia')">Día</button>
            <button [class.active]="calendarView() === 'semana'" (click)="setView('semana')">Semana</button>
            <button [class.active]="calendarView() === 'mes'" (click)="setView('mes')">Mes</button>
          </div>
          
          <div class="week-nav">
            <button class="nav-btn" (click)="prevDate()">‹</button>
            <span class="week-label">{{ dateLabel() }}</span>
            <button class="nav-btn" (click)="nextDate()">›</button>
            <button class="btn-today" (click)="goToday()">Hoy</button>
          </div>
        </div>

        <!-- Day Timeline (Día) -->
        <div class="day-timeline" *ngIf="calendarView() === 'dia'">
          <div class="timeline-slot" *ngFor="let slot of daySlots()" [class.has-asg]="slot.assignment">
            <div class="timeline-time">{{ slot.time }}</div>
            <div class="timeline-content">
              <div class="timeline-card" *ngIf="slot.assignment" [style.border-left-color]="getTypeColor(slot.assignment.type)" (click)="openAssignmentDetail(slot.assignment)">
                <div>
                  <span class="timeline-technician-name">{{ slot.assignment.technicianName }}</span>
                  <span class="timeline-asg-type" [style.background]="getTypeColor(slot.assignment.type) + '15'" [style.color]="getTypeColor(slot.assignment.type)">
                    {{ getTypeLabel(slot.assignment.type) }}
                  </span>
                </div>
                <span class="timeline-status"
                  [style.background]="getStatusConfig(slot.assignment.status).bg"
                  [style.color]="getStatusConfig(slot.assignment.status).color">
                  {{ getStatusConfig(slot.assignment.status).icon }} {{ getStatusConfig(slot.assignment.status).label }}
                </span>
              </div>
              <div class="timeline-empty" *ngIf="!slot.assignment" (click)="openNewAsgModal(slot.time, slot.date)">
                + Asignar OT
              </div>
            </div>
          </div>
        </div>

        <!-- Week Grid (Semana) -->
        <div class="schedule-grid" *ngIf="calendarView() === 'semana'">
          <div class="grid-corner">Hora</div>
          <div class="grid-day-header" *ngFor="let day of weekGrid().days" [class.today]="day.isToday">
            <span class="day-name">{{ day.dayName }}</span>
            <span class="day-date">{{ day.dayOfMonth }}</span>
          </div>

          <ng-container *ngFor="let row of weekGrid().timeSlots">
            <div class="grid-time">{{ row.time }}</div>
            <div class="grid-cell" *ngFor="let cell of row.days" [class.today-col]="cell.isToday" (click)="!cell.assignment && openNewAsgModal(row.time, cell.date)">
              <div class="cell-add" *ngIf="!cell.assignment">+</div>
              <div class="asg-chip" *ngIf="cell.assignment" 
                   [style.border-left-color]="getTypeColor(cell.assignment.type)"
                   (click)="$event.stopPropagation(); openAssignmentDetail(cell.assignment)">
                <span class="asg-time">{{ cell.assignment.startTime }}</span>
                <span class="asg-name">{{ cell.assignment.technicianName }}</span>
                <button class="asg-remove" (click)="$event.stopPropagation(); deleteAssignment(cell.assignment.id)">×</button>
              </div>
            </div>
          </ng-container>
        </div>

        <!-- Month Grid (Mes) -->
        <div class="month-grid" *ngIf="calendarView() === 'mes'">
          <div class="month-header-day">Lun</div>
          <div class="month-header-day">Mar</div>
          <div class="month-header-day">Mié</div>
          <div class="month-header-day">Jue</div>
          <div class="month-header-day">Vie</div>
          <div class="month-header-day">Sáb</div>
          <div class="month-header-day">Dom</div>

          <div class="month-cell" *ngFor="let cell of monthGrid()" [class.empty]="!cell" [class.today-cell]="cell?.isToday" (click)="cell && openNewAsgModal(undefined, cell.date)">
            <span class="month-date" *ngIf="cell">{{ cell.day }}</span>
            <div class="month-asgs" *ngIf="cell && cell.assignments.length > 0">
              <div class="month-asg-chip" *ngFor="let a of cell.assignments"
                   [style.background]="getTypeColor(a.type) + '20'"
                   [style.color]="getTypeColor(a.type)"
                   (click)="$event.stopPropagation(); openAssignmentDetail(a)">
                {{ a.startTime }} - {{ a.technicianName.split(' ')[0] }}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ═══════ TAB: TÉCNICOS ═══════ -->
      <div *ngIf="activeTab() === 'tecnicos'" class="fade-in">

        <div class="search-row">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Buscar técnico por nombre, email o teléfono..." [ngModel]="technicianSearch()" (ngModelChange)="technicianSearch.set($event)">
          </div>
          <span class="counter-badge">{{ filteredTechnicians().length }} técnicos</span>
          <button class="btn-primary" (click)="openNewTechnicianModal()">
            + Nuevo Técnico
          </button>
        </div>

        <div class="technicians-grid" *ngIf="filteredTechnicians().length > 0">
          <div class="technician-card" *ngFor="let p of filteredTechnicians()" (click)="selectedTechnician.set(p)">
            <div class="technician-card-header">
              <div class="technician-avatar">{{ p.firstName[0] }}{{ p.lastName[0] }}</div>
              <div>
                <div class="technician-name">{{ p.firstName }} {{ p.lastName }}</div>
                <div class="technician-meta">{{ p.specialty || 'General' }}</div>
              </div>
            </div>
            <div class="technician-card-body">
              <div class="technician-info-row">
                📞 <span>{{ p.phone || 'Sin teléfono' }}</span>
              </div>
              <div class="technician-info-row">
                📧 <span>{{ p.email || 'Sin email' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: CONFIGURACIÓN ═══════ -->
      <div *ngIf="activeTab() === 'config'" class="fade-in">
        <div class="config-section">
          <h3 class="config-title">Configuración Próximamente</h3>
          <p>Opciones de configuración de Asignaciones irán aquí.</p>
        </div>
      </div>

      <!-- ═══════ MODAL: NUEVA ASIGNACIÓN ═══════ -->
      <div class="modal-overlay" *ngIf="showAsgModal()" (click)="showAsgModal.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">{{ isEditingAsg ? 'Editar Asignación' : 'Nueva Asignación' }}</h3>
          <p class="modal-subtitle">Detalles de la orden de trabajo</p>

          <div class="form-grid cols-2">
            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Técnico</label>
              <select [(ngModel)]="asgForm.technicianId" (ngModelChange)="onAsgTechnicianChange($event)">
                <option value="">Seleccionar técnico...</option>
                <option *ngFor="let p of asignacionesService.activeTechnicians()" [value]="p.id">{{ p.firstName }} {{ p.lastName }}</option>
              </select>
            </div>
            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Título / Tarea</label>
              <input type="text" [(ngModel)]="asgForm.title" placeholder="Revisión de generador...">
            </div>
            <div class="form-field">
              <label>Fecha</label>
              <input type="date" [(ngModel)]="asgForm.date">
            </div>
            <div class="form-field">
              <label>Hora Inicio</label>
              <input type="time" [(ngModel)]="asgForm.startTime">
            </div>
            <div class="form-field">
              <label>Hora Fin</label>
              <input type="time" [(ngModel)]="asgForm.endTime">
            </div>
            <div class="form-field">
              <label>Tipo</label>
              <select [(ngModel)]="asgForm.type">
                <option *ngFor="let t of assignmentTypes" [value]="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="form-field">
              <label>Prioridad</label>
              <select [(ngModel)]="asgForm.priority">
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div class="form-field">
              <label>Estado</label>
              <select [(ngModel)]="asgForm.status">
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="completada">Completada</option>
                <option value="retrasada">Retrasada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Dirección</label>
              <input type="text" [(ngModel)]="asgForm.address" placeholder="Domicilio del cliente...">
            </div>
            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Descripción</label>
              <textarea [(ngModel)]="asgForm.description" rows="2" placeholder="Detalles extra..."></textarea>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-secondary" (click)="showAsgModal.set(false)">Cancelar</button>
            <button class="btn-primary" (click)="saveAssignment()" [disabled]="!asgForm.technicianId || !asgForm.date || !asgForm.startTime || !asgForm.title">Guardar OT</button>
          </div>
        </div>
      </div>

      <!-- ═══════ MODAL: NUEVO TÉCNICO ═══════ -->
      <div class="modal-overlay" *ngIf="showTechnicianModal()" (click)="showTechnicianModal.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nuevo Técnico</h3>
          <p class="modal-subtitle">Registra personal operativo</p>

          <div class="form-grid cols-2">
            <div class="form-field">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="technicianForm.firstName" placeholder="Nombre">
            </div>
            <div class="form-field">
              <label>Apellido</label>
              <input type="text" [(ngModel)]="technicianForm.lastName" placeholder="Apellido">
            </div>
            <div class="form-field">
              <label>Email</label>
              <input type="email" [(ngModel)]="technicianForm.email" placeholder="correo@ejemplo.com">
            </div>
            <div class="form-field">
              <label>Teléfono</label>
              <input type="tel" [(ngModel)]="technicianForm.phone" placeholder="555-1234">
            </div>
            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Especialidad</label>
              <input type="text" [(ngModel)]="technicianForm.specialty" placeholder="Ej: Electricidad">
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-secondary" (click)="showTechnicianModal.set(false)">Cancelar</button>
            <button class="btn-primary" (click)="saveTechnician()" [disabled]="!technicianForm.firstName || !technicianForm.lastName">Registrar Técnico</button>
          </div>
        </div>
      </div>

    </div>
  `,
})
export class AsignacionesComponent implements OnInit {
  asignacionesService = inject(AsignacionesService);

  // ─── State ──────────────────────
  activeTab = signal<MainTab>('agenda');
  
  selectedTechnician = signal<Technician | null>(null);
  technicianSearch = signal('');
  
  calendarView = signal<'dia' | 'semana' | 'mes'>('semana');
  dateOffset = signal(0);

  // Modals
  showAsgModal = signal(false);
  showTechnicianModal = signal(false);
  isEditingAsg = false;

  // Constants
  assignmentTypes = ASSIGNMENT_TYPES;

  // Form data
  asgForm = this.emptyAsgForm();
  technicianForm = this.emptyTechnicianForm();

  // ─── Computed ───────────────────

  stats = this.asignacionesService.estadisticas;
  proxAsignacion = this.asignacionesService.proximaAsignacion;

  filteredTechnicians = computed(() => {
    const q = this.technicianSearch().toLowerCase().trim();
    const all = this.asignacionesService.activeTechnicians();
    if (!q) return all;
    return all.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  dateLabel = computed(() => {
    const view = this.calendarView();
    const offset = this.dateOffset();
    const now = new Date();
    
    if (view === 'dia') {
      now.setDate(now.getDate() + offset);
      const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    } else if (view === 'semana') {
      const { start, end } = this.getWeekRange(offset);
      const s = new Date(start + 'T12:00:00');
      const e = new Date(end + 'T12:00:00');
      const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
    } else {
      now.setDate(1);
      now.setMonth(now.getMonth() + offset);
      const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
    }
  });

  daySlots = computed(() => {
    const today = new Date();
    today.setDate(today.getDate() + (this.calendarView() === 'dia' ? this.dateOffset() : 0));
    const targetDate = today.toISOString().split('T')[0];
    const asgs = this.asignacionesService.getAppointmentsForDate(targetDate);
    const slots: { time: string; date: string; assignment: Assignment | null }[] = [];

    for (let h = 7; h <= 20; h++) {
      const time = `${String(h).padStart(2, '0')}:00`;
      const asg = asgs.find(a => a.startTime === time) || null;
      slots.push({ time, date: targetDate, assignment: asg });
    }
    return slots;
  });

  weekGrid = computed(() => {
    const { start } = this.getWeekRange(this.calendarView() === 'semana' ? this.dateOffset() : 0);
    const sDate = new Date(start + 'T12:00:00');
    
    const days = [];
    const weekdaysShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    for (let i = 0; i < 7; i++) {
       const d = new Date(sDate);
       d.setDate(sDate.getDate() + i);
       const dateStr = d.toISOString().split('T')[0];
       days.push({
         date: dateStr,
         isToday: dateStr === new Date().toISOString().split('T')[0],
         dayOfMonth: d.getDate(),
         dayName: weekdaysShort[i],
         assignments: this.asignacionesService.getAppointmentsForDate(dateStr)
       });
    }
    
    const timeSlots = [];
    for (let h = 7; h <= 20; h++) {
      const time = `${String(h).padStart(2, '0')}:00`;
      const row = { time, days: [] as any[] };
      for (const day of days) {
        row.days.push({
           date: day.date,
           isToday: day.isToday,
           assignment: day.assignments.find((a: any) => a.startTime === time) || null
        });
      }
      timeSlots.push(row);
    }
    return { days, timeSlots };
  });

  monthGrid = computed(() => {
    const now = new Date();
    now.setDate(1); 
    now.setMonth(now.getMonth() + (this.calendarView() === 'mes' ? this.dateOffset() : 0));
    
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
       const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
       const assignments = this.asignacionesService.getAppointmentsForDate(dateStr);
       days.push({ 
          date: dateStr, 
          day: d, 
          isToday: dateStr === new Date().toISOString().split('T')[0],
          assignments 
       });
    }
    
    return days;
  });

  ngOnInit(): void {}

  // ─── Calendars & Logic ────────

  setTab(tab: MainTab): void {
    this.activeTab.set(tab);
  }

  setView(view: 'dia' | 'semana' | 'mes'): void {
    this.calendarView.set(view);
    this.dateOffset.set(0);
  }

  prevDate(): void { this.dateOffset.update(v => v - 1); }
  nextDate(): void { this.dateOffset.update(v => v + 1); }
  goToday(): void { this.dateOffset.set(0); }

  private getWeekRange(offset: number): { start: string; end: string } {
    const now = new Date();
    now.setDate(now.getDate() + offset * 7);
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] };
  }

  getTypeColor(type: AssignmentType): string {
    return ASSIGNMENT_TYPES.find(t => t.value === type)?.color || 'var(--accent)';
  }

  getTypeLabel(type: AssignmentType): string {
    return ASSIGNMENT_TYPES.find(t => t.value === type)?.label || type;
  }

  getStatusConfig(status: AssignmentStatus) {
    return STATUS_CONFIG[status] || STATUS_CONFIG['pendiente'];
  }

  openNewTechnicianModal(): void {
    this.technicianForm = this.emptyTechnicianForm();
    this.showTechnicianModal.set(true);
  }

  saveTechnician(): void {
    this.asignacionesService.addTechnician(this.technicianForm as any);
    this.showTechnicianModal.set(false);
  }

  openNewAsgModal(time?: string, dateStr?: string): void {
    this.asgForm = this.emptyAsgForm();
    this.isEditingAsg = false;
    if (time) this.asgForm.startTime = time;
    this.asgForm.date = dateStr || new Date().toISOString().split('T')[0];
    this.showAsgModal.set(true);
  }

  openAssignmentDetail(asg: Assignment): void {
    this.asgForm = { ...asg };
    this.isEditingAsg = true;
    this.showAsgModal.set(true);
  }

  deleteAssignment(id: string): void {
    if (confirm('¿Seguro que deseas eliminar esta asignación?')) {
      this.asignacionesService.deleteAssignment(id);
    }
  }

  onAsgTechnicianChange(techId: string): void {
    const t = this.asignacionesService.getTechnician(techId);
    if (t) this.asgForm.technicianName = `${t.firstName} ${t.lastName}`;
  }

  saveAssignment(): void {
    if (this.isEditingAsg) {
      if (!this.asgForm.id) return;
      this.asignacionesService.updateAssignment(this.asgForm.id, this.asgForm as any);
    } else {
      this.asignacionesService.addAssignment(this.asgForm as any);
    }
    this.showAsgModal.set(false);
  }

  private emptyTechnicianForm(): Partial<Technician> {
    return {
      firstName: '', lastName: '', email: '', phone: '',
      active: true, specialty: ''
    };
  }

  private emptyAsgForm(): Partial<Assignment> {
    return {
      id: '', technicianId: '', technicianName: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '', endTime: '12:00', type: 'preventivo',
      status: 'pendiente', title: '', description: '',
      address: '', priority: 'media'
    };
  }
}
