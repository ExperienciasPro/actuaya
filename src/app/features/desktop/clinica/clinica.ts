import { Component, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicaService } from '../../../core/services/clinica.service';
import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';
import {
  Patient, Appointment, ClinicalNote, ClinicalHistory,
  APPOINTMENT_TYPES, NOTE_TYPES, STATUS_CONFIG, RISK_LEVELS,
  WEEKDAYS, WEEKDAYS_SHORT, AppointmentType, AppointmentStatus, NoteType,
  RedFlag, RedFlagType, RED_FLAG_TYPES, NoteTemplate, DEFAULT_NOTE_TEMPLATES
} from '../../../core/models/clinica.model';

type MainTab = 'agenda' | 'pacientes' | 'expediente' | 'config';
type ExpTab = 'historia' | 'notas' | 'timeline' | 'banderas' | 'evaluaciones';

@Component({
  selector: 'app-clinica',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CurrencyInputDirective],
  styleUrl: 'clinica.scss',
  template: `
    <div class="clinica-page">
      <!-- ═══════ MODULE HEADER ═══════ -->
      <div class="module-header">
        <div class="module-header-top">
          <div>
            <div class="module-title-row">
              <div class="module-icon-box">
                <svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="10" y1="11" x2="14" y2="11"/></svg>
              </div>
              <h1 class="module-title">Módulo Clínica</h1>
            </div>
            <p class="module-subtitle">Gestión de pacientes, citas e historias clínicas</p>
          </div>
        </div>

        <div class="tabs-row">
          <button class="tab-btn" [class.active]="activeTab() === 'agenda'" (click)="setTab('agenda')">
            <span class="tab-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
            Agenda
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'pacientes'" (click)="setTab('pacientes')">
            <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            Pacientes
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'expediente'" (click)="setTab('expediente')" *ngIf="selectedPatient()">
            <span class="tab-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
            Expediente
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'config'" (click)="setTab('config')">
            <span class="tab-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
            Configuración
          </button>

        </div>
      </div>

      <!-- ═══════ TAB: AGENDA ═══════ -->
      <div *ngIf="activeTab() === 'agenda'" class="fade-in">

        <!-- KPIs -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon" style="background: rgba(var(--accent-rgb, 14, 165, 233), 0.1); color: var(--accent);">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div class="kpi-body">
              <div class="kpi-value">{{ stats().citasHoy }}</div>
              <div class="kpi-label">Citas Hoy</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">
              <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div class="kpi-body">
              <div class="kpi-value">{{ stats().primeraVezHoy }}</div>
              <div class="kpi-label">Primera Vez</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">
              <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="kpi-body">
              <div class="kpi-value">{{ stats().ingresosMes | number:'1.0-0' }}</div>
              <div class="kpi-label">Ingresos Mes</div>
            </div>
          </div>
          <div class="kpi-card" *ngIf="proxCita()">
            <div class="kpi-icon" style="background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="kpi-body">
              <div class="kpi-value" style="font-size: 1.1rem;">{{ proxCita()!.startTime }}</div>
              <div class="kpi-label">Próxima: {{ proxCita()!.patientName }}</div>
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
          <div class="timeline-slot" *ngFor="let slot of daySlots()" [class.has-appt]="slot.appointment">
            <div class="timeline-time">{{ slot.time }}</div>
            <div class="timeline-content">
              <div class="timeline-card" *ngIf="slot.appointment" [style.border-left-color]="getTypeColor(slot.appointment.type)" (click)="openAppointmentDetail(slot.appointment)">
                <div>
                  <span class="timeline-patient-name">{{ slot.appointment.patientName }}</span>
                  <span class="timeline-appt-type" [style.background]="getTypeColor(slot.appointment.type) + '15'" [style.color]="getTypeColor(slot.appointment.type)">
                    {{ getTypeLabel(slot.appointment.type) }}
                  </span>
                </div>
                <span class="timeline-status"
                  [style.background]="getStatusConfig(slot.appointment.status).bg"
                  [style.color]="getStatusConfig(slot.appointment.status).color">
                  {{ getStatusConfig(slot.appointment.status).icon }} {{ getStatusConfig(slot.appointment.status).label }}
                </span>
              </div>
              <div class="timeline-empty" *ngIf="!slot.appointment" (click)="openNewApptModal(slot.time, slot.date)">
                + Agendar cita
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
            <div class="grid-cell" *ngFor="let cell of row.days" [class.today-col]="cell.isToday" (click)="!cell.appointment && openNewApptModal(row.time, cell.date)">
              <div class="cell-add" *ngIf="!cell.appointment">+</div>
              <div class="appt-chip" *ngIf="cell.appointment" 
                   [style.border-left-color]="getTypeColor(cell.appointment.type)"
                   (click)="$event.stopPropagation(); openAppointmentDetail(cell.appointment)">
                <span class="appt-time">{{ cell.appointment.startTime }}</span>
                <span class="appt-name">{{ cell.appointment.patientName }}</span>
                <button class="appt-remove" (click)="$event.stopPropagation()">×</button>
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

          <div class="month-cell" *ngFor="let cell of monthGrid()" [class.empty]="!cell" [class.today-cell]="cell?.isToday" (click)="cell && openNewApptModal(undefined, cell.date)">
            <span class="month-date" *ngIf="cell">{{ cell.day }}</span>
            <div class="month-appts" *ngIf="cell && cell.appointments.length > 0">
              <div class="month-appt-chip" *ngFor="let a of cell.appointments"
                   [style.background]="getTypeColor(a.type) + '20'"
                   [style.color]="getTypeColor(a.type)"
                   (click)="$event.stopPropagation(); openAppointmentDetail(a)">
                {{ a.startTime }} - {{ a.patientName.split(' ')[0] }}
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ═══════ TAB: PACIENTES ═══════ -->
      <div *ngIf="activeTab() === 'pacientes'" class="fade-in">

        <!-- Search + Add -->
        <div class="search-row">
          <div class="search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Buscar paciente por nombre, email o teléfono..." [ngModel]="patientSearch()" (ngModelChange)="patientSearch.set($event)">
          </div>
          <span class="counter-badge">{{ filteredPatients().length }} pacientes</span>
          <button class="btn-primary" (click)="openNewPatientModal()">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo Paciente
          </button>
        </div>

        <!-- Patient Cards Grid -->
        <div class="patients-grid" *ngIf="filteredPatients().length > 0">
          <div class="patient-card" *ngFor="let p of filteredPatients()" (click)="openExpediente(p)">
            <div class="patient-card-header">
              <div class="patient-avatar">{{ getInitials(p) }}</div>
              <div>
                <div class="patient-name">{{ p.firstName }} {{ p.lastName }}</div>
                <div class="patient-meta">{{ calcAge(p.birthDate) }} años · {{ p.gender === 'M' ? 'Masculino' : p.gender === 'F' ? 'Femenino' : 'Otro' }}</div>
              </div>
            </div>
            <div class="patient-card-body">
              <div class="patient-info-row">
                <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>{{ p.phone || 'Sin teléfono' }}</span>
              </div>
              <div class="patient-info-row">
                <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>{{ p.email || 'Sin email' }}</span>
              </div>
              <span class="patient-dx" *ngIf="getPatientDx(p.id)">{{ getPatientDx(p.id) }}</span>
              <span class="patient-flags-count" *ngIf="getPatientFlagCount(p.id) > 0">
                🚩 {{ getPatientFlagCount(p.id) }} alerta{{ getPatientFlagCount(p.id) > 1 ? 's' : '' }}
              </span>
            </div>
            <div class="patient-card-footer">
              <button class="btn-link" (click)="openExpediente(p); $event.stopPropagation()">Ver Expediente →</button>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div class="empty-state" *ngIf="filteredPatients().length === 0">
          <div class="empty-illustration">
            <svg viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="55" fill="rgba(var(--accent-rgb, 14, 165, 233), 0.06)"/>
              <circle cx="60" cy="60" r="38" fill="rgba(var(--accent-rgb, 14, 165, 233), 0.04)"/>
              <path d="M60 35a20 20 0 1 0 0 40 20 20 0 0 0 0-40z" stroke="var(--accent)" stroke-width="2" fill="none"/>
              <path d="M60 50v10M55 55h10" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M45 80a25 25 0 0 1 30 0" stroke="var(--accent)" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>Sin pacientes registrados</h3>
          <p>Agrega tu primer paciente para comenzar a gestionar su historia clínica y agendar citas.</p>
          <button class="btn-primary" style="margin-top: 16px;" (click)="openNewPatientModal()">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar Paciente
          </button>
        </div>
      </div>

      <!-- ═══════ TAB: EXPEDIENTE ═══════ -->
      <div *ngIf="activeTab() === 'expediente' && selectedPatient()" class="fade-in">

        <button class="expediente-back" (click)="setTab('pacientes'); selectedPatient.set(null)">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          Volver a Pacientes
        </button>

        <div class="expediente-header">
          <div class="patient-avatar" style="width: 56px; height: 56px; font-size: 1.2rem;">{{ getInitials(selectedPatient()!) }}</div>
          <div class="expediente-profile">
            <h2 class="exp-name">{{ selectedPatient()!.firstName }} {{ selectedPatient()!.lastName }}</h2>
            <p class="exp-detail">{{ calcAge(selectedPatient()!.birthDate) }} años · {{ selectedPatient()!.gender === 'M' ? 'Masculino' : selectedPatient()!.gender === 'F' ? 'Femenino' : 'Otro' }} · {{ selectedPatient()!.occupation || 'Sin ocupación' }}</p>
          </div>
          <div class="exp-actions">
            <button class="btn-danger-sm" (click)="openRedFlagModal()" title="Agregar Bandera Roja">
              🚩 Bandera
            </button>
            <button class="btn-secondary" (click)="openNewApptModalForPatient(selectedPatient()!)">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Agendar Cita
            </button>
            <button class="btn-primary" (click)="openNewNoteModal()">
              <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Nueva Nota
            </button>
          </div>
        </div>

        <!-- 🚩 RED FLAGS BANNER -->
        <div class="red-flags-banner" *ngIf="patientRedFlags().length > 0">
          <div class="red-flag-item" *ngFor="let flag of patientRedFlags()">
            <span class="rfl-icon">{{ getRedFlagIcon(flag.type) }}</span>
            <div class="rfl-body">
              <strong>{{ getRedFlagLabel(flag.type) }}</strong>
              <span>{{ flag.description }}</span>
            </div>
            <span class="rfl-severity" [class.critica]="flag.severity === 'critica'">{{ flag.severity === 'critica' ? 'CRÍTICO' : 'ALTO' }}</span>
          </div>
        </div>

        <!-- Sub-tabs -->
        <div class="exp-tabs">
          <button class="exp-tab" [class.active]="expTab() === 'historia'" (click)="expTab.set('historia')">Historia Clínica</button>
          <button class="exp-tab" [class.active]="expTab() === 'notas'" (click)="expTab.set('notas')">Notas de Sesión</button>
          <button class="exp-tab" [class.active]="expTab() === 'timeline'" (click)="expTab.set('timeline')">Línea de Tiempo</button>
          <button class="exp-tab" [class.active]="expTab() === 'banderas'" (click)="expTab.set('banderas')">
            🚩 Alertas
            <span class="tab-count" *ngIf="patientRedFlags().length > 0">{{ patientRedFlags().length }}</span>
          </button>
          <button class="exp-tab" [class.active]="expTab() === 'evaluaciones'" (click)="expTab.set('evaluaciones')">
            🧪 Evaluaciones
            <span class="tab-count" style="background:var(--accent)" *ngIf="patientEvals().length > 0">{{ patientEvals().length }}</span>
          </button>
        </div>

        <!-- Sub: Historia Clínica -->
        <div *ngIf="expTab() === 'historia'" class="fade-in">

          <!-- ── Edit Mode ── -->
          <div *ngIf="editingHistory(); else historyView">
            <div class="hc-edit-header">
              <h3 class="hc-edit-title">✏️ Editando Historia Clínica</h3>
              <div class="hc-edit-actions">
                <button class="btn-secondary" (click)="cancelEditHistory()">Cancelar</button>
                <button class="btn-primary" (click)="saveHistory()">💾 Guardar Cambios</button>
              </div>
            </div>

            <!-- S1: Datos de Identificación -->
            <div class="hc-section">
              <h4 class="hc-section-header" (click)="toggleHcSection(0)">
                <span>👤</span> 1. Datos de Identificación
                <span class="hc-chevron" [class.open]="hcSections()[0]">▸</span>
              </h4>
              <div class="hc-section-body" *ngIf="hcSections()[0]">
                <div class="form-grid cols-2">
                  <div class="form-field">
                    <label>Estado Civil</label>
                    <select [(ngModel)]="historyForm.civilStatus">
                      <option value="">Seleccionar...</option>
                      <option value="Soltero/a">Soltero/a</option>
                      <option value="Casado/a">Casado/a</option>
                      <option value="Unión libre">Unión libre</option>
                      <option value="Divorciado/a">Divorciado/a</option>
                      <option value="Viudo/a">Viudo/a</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label>Nivel Educativo</label>
                    <select [(ngModel)]="historyForm.educationLevel">
                      <option value="">Seleccionar...</option>
                      <option value="Primaria">Primaria</option>
                      <option value="Secundaria">Secundaria</option>
                      <option value="Bachillerato">Bachillerato</option>
                      <option value="Técnico">Técnico</option>
                      <option value="Universitario">Universitario</option>
                      <option value="Posgrado">Posgrado</option>
                    </select>
                  </div>
                  <div class="form-field" style="grid-column: 1 / -1;">
                    <label>Composición del Núcleo Familiar</label>
                    <textarea [(ngModel)]="historyForm.familyComposition" rows="2" placeholder="Quiénes conforman su núcleo familiar..."></textarea>
                  </div>
                  <div class="form-field" style="grid-column: 1 / -1;">
                    <label>Orientación (si relevante para el motivo de consulta)</label>
                    <input type="text" [(ngModel)]="historyForm.orientation" placeholder="Opcional...">
                  </div>
                  <div class="form-field">
                    <label>Contacto de Emergencia</label>
                    <input type="text" [(ngModel)]="historyForm.emergencyContactName" placeholder="Nombre del contacto">
                  </div>
                  <div class="form-field">
                    <label>Teléfono de Emergencia</label>
                    <input type="tel" [(ngModel)]="historyForm.emergencyContactPhone" placeholder="555-0000">
                  </div>
                </div>
              </div>
            </div>

            <!-- S2: Motivo de Consulta -->
            <div class="hc-section">
              <h4 class="hc-section-header" (click)="toggleHcSection(1)">
                <span>💬</span> 2. Motivo de Consulta
                <span class="hc-chevron" [class.open]="hcSections()[1]">▸</span>
              </h4>
              <div class="hc-section-body" *ngIf="hcSections()[1]">
                <div class="form-grid">
                  <div class="form-field">
                    <label>¿Qué le trae a consulta hoy? <small>(registrar de forma literal)</small></label>
                    <textarea [(ngModel)]="historyForm.motiveConsultation" rows="3" placeholder="En palabras del paciente..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>¿Qué espera lograr con el proceso terapéutico?</label>
                    <textarea [(ngModel)]="historyForm.expectations" rows="2" placeholder="Expectativas del paciente..."></textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- S3: Historia del Problema Actual -->
            <div class="hc-section">
              <h4 class="hc-section-header" (click)="toggleHcSection(2)">
                <span>📅</span> 3. Historia del Problema Actual
                <span class="hc-chevron" [class.open]="hcSections()[2]">▸</span>
              </h4>
              <div class="hc-section-body" *ngIf="hcSections()[2]">
                <div class="form-grid cols-2">
                  <div class="form-field">
                    <label>Fecha de Inicio de Síntomas</label>
                    <input type="text" [(ngModel)]="historyForm.symptomOnsetDate" placeholder="Ej: Hace 6 meses, desde enero 2025...">
                  </div>
                  <div class="form-field">
                    <label>Desencadenantes</label>
                    <textarea [(ngModel)]="historyForm.triggers" rows="2" placeholder="Eventos vitales estresantes asociados..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Frecuencia, Intensidad y Duración</label>
                    <textarea [(ngModel)]="historyForm.frequencyIntensity" rows="2" placeholder="¿Qué tan seguido ocurre y cuánto le afecta?"></textarea>
                  </div>
                  <div class="form-field">
                    <label>Evolución</label>
                    <textarea [(ngModel)]="historyForm.evolution" rows="2" placeholder="¿Ha mejorado o empeorado con el tiempo?"></textarea>
                  </div>
                  <div class="form-field" style="grid-column: 1 / -1;">
                    <label>Intentos Previos de Solución</label>
                    <textarea [(ngModel)]="historyForm.previousAttempts" rows="2" placeholder="¿Qué ha hecho el paciente para intentar sentirse mejor?"></textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- S4: Antecedentes Personales -->
            <div class="hc-section">
              <h4 class="hc-section-header" (click)="toggleHcSection(3)">
                <span>🏥</span> 4. Antecedentes Personales (Anamnesis)
                <span class="hc-chevron" [class.open]="hcSections()[3]">▸</span>
              </h4>
              <div class="hc-section-body" *ngIf="hcSections()[3]">
                <div class="form-grid">
                  <div class="form-field">
                    <label>Salud Física</label>
                    <textarea [(ngModel)]="historyForm.physicalHealth" rows="2" placeholder="Enfermedades crónicas, cirugías, calidad del sueño y alimentación..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Antecedentes Psiquiátricos / Psicológicos</label>
                    <textarea [(ngModel)]="historyForm.psychiatricHistory" rows="2" placeholder="Procesos previos, diagnósticos pasados, hospitalizaciones..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Consumo de Sustancias</label>
                    <textarea [(ngModel)]="historyForm.substanceUse" rows="2" placeholder="Alcohol, tabaco, fármacos o sustancias psicoactivas..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Hitos del Desarrollo <small>(especialmente niños/adolescentes)</small></label>
                    <textarea [(ngModel)]="historyForm.developmentalMilestones" rows="2" placeholder="Parto, control de esfínteres, lenguaje..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Medicación Actual</label>
                    <textarea [(ngModel)]="historyForm.medications" rows="2" placeholder="Medicamentos, dosis, frecuencia..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Alergias</label>
                    <input type="text" [(ngModel)]="historyForm.allergies" placeholder="Alergias conocidas...">
                  </div>
                </div>
              </div>
            </div>

            <!-- S5: Historia Familiar -->
            <div class="hc-section">
              <h4 class="hc-section-header" (click)="toggleHcSection(4)">
                <span>👨‍👩‍👧‍👦</span> 5. Historia Familiar y Red de Apoyo
                <span class="hc-chevron" [class.open]="hcSections()[4]">▸</span>
              </h4>
              <div class="hc-section-body" *ngIf="hcSections()[4]">
                <div class="form-grid cols-2">
                  <div class="form-field">
                    <label>Estructura Familiar</label>
                    <textarea [(ngModel)]="historyForm.familyStructure" rows="2" placeholder="Quiénes viven con él/ella..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Dinámica Relacional</label>
                    <textarea [(ngModel)]="historyForm.familyDynamics" rows="2" placeholder="Relación con figuras de autoridad y pares..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Antecedentes Familiares de Salud Mental</label>
                    <textarea [(ngModel)]="historyForm.familyMentalHealth" rows="2" placeholder="Genética y modelado de conducta..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Red Social / Apoyo</label>
                    <textarea [(ngModel)]="historyForm.supportNetwork" rows="2" placeholder="Amigos, pareja o grupos de pertenencia..."></textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- S6: Examen del Estado Mental -->
            <div class="hc-section">
              <h4 class="hc-section-header" (click)="toggleHcSection(5)">
                <span>🧠</span> 6. Examen del Estado Mental
                <span class="hc-chevron" [class.open]="hcSections()[5]">▸</span>
              </h4>
              <div class="hc-section-body" *ngIf="hcSections()[5]">
                <div class="form-grid cols-2">
                  <div class="form-field">
                    <label>Apariencia y Actitud</label>
                    <textarea [(ngModel)]="historyForm.appearanceAttitude" rows="2" placeholder="Aliño, contacto visual, cooperación..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Conciencia y Orientación</label>
                    <textarea [(ngModel)]="historyForm.consciousnessOrientation" rows="2" placeholder="Espacio, tiempo y persona..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Pensamiento</label>
                    <textarea [(ngModel)]="historyForm.thoughtProcess" rows="2" placeholder="Curso, velocidad, contenido (delirios, ideas obsesivas)..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Lenguaje y Afecto</label>
                    <textarea [(ngModel)]="historyForm.languageAffect" rows="2" placeholder="Tono de voz, congruencia de las emociones..."></textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- S7: Valoración de Riesgo -->
            <div class="hc-section hc-section-critical">
              <h4 class="hc-section-header hc-critical" (click)="toggleHcSection(6)">
                <span>🚨</span> 7. Valoración de Riesgo (Ítem Crítico)
                <span class="hc-chevron" [class.open]="hcSections()[6]">▸</span>
              </h4>
              <div class="hc-section-body" *ngIf="hcSections()[6]">
                <div class="form-grid">
                  <div class="form-field">
                    <label>Ideación Suicida / Autolesiva</label>
                    <textarea [(ngModel)]="historyForm.suicidalIdeation" rows="3" placeholder="Presencia de pensamientos, planes o intentos previos..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Riesgo de Agresión a Terceros</label>
                    <textarea [(ngModel)]="historyForm.aggressionRisk" rows="2" placeholder="Evaluar riesgo heteroagresivo..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Nivel de Riesgo Global</label>
                    <select [(ngModel)]="historyForm.riskLevel">
                      <option value="bajo">🟢 Bajo</option>
                      <option value="medio">🟡 Medio</option>
                      <option value="alto">🟠 Alto</option>
                      <option value="critico">🔴 Crítico</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- S-Extra: Diagnóstico y Plan -->
            <div class="hc-section">
              <h4 class="hc-section-header" (click)="toggleHcSection(7)">
                <span>🎯</span> Diagnóstico y Plan de Tratamiento
                <span class="hc-chevron" [class.open]="hcSections()[7]">▸</span>
              </h4>
              <div class="hc-section-body" *ngIf="hcSections()[7]">
                <div class="form-grid">
                  <div class="form-field">
                    <label>Diagnóstico</label>
                    <textarea [(ngModel)]="historyForm.diagnosis" rows="2" placeholder="Impresión diagnóstica / CIE-10 / DSM-5..."></textarea>
                  </div>
                  <div class="form-field">
                    <label>Plan de Tratamiento</label>
                    <textarea [(ngModel)]="historyForm.treatmentPlan" rows="3" placeholder="Enfoque terapéutico, frecuencia de sesiones, objetivos..."></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div class="hc-edit-footer">
              <button class="btn-secondary" (click)="cancelEditHistory()">Cancelar</button>
              <button class="btn-primary" (click)="saveHistory()">💾 Guardar Historia Clínica</button>
            </div>
          </div>

          <!-- ── View Mode ── -->
          <ng-template #historyView>
            <div *ngIf="currentHistory() as h">

              <!-- S1 View -->
              <div class="hc-view-section">
                <h4 class="hc-view-title"><span>👤</span> 1. Datos de Identificación</h4>
                <div class="hc-fields-grid">
                  <div class="hc-field"><span class="hc-label">Estado Civil</span><span class="hc-value" [class.empty]="!h.civilStatus">{{ h.civilStatus || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Nivel Educativo</span><span class="hc-value" [class.empty]="!h.educationLevel">{{ h.educationLevel || 'Sin registro' }}</span></div>
                  <div class="hc-field hc-field-wide"><span class="hc-label">Composición Familiar</span><span class="hc-value" [class.empty]="!h.familyComposition">{{ h.familyComposition || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Contacto Emergencia</span><span class="hc-value" [class.empty]="!h.emergencyContactName">{{ h.emergencyContactName || 'Sin registro' }} {{ h.emergencyContactPhone }}</span></div>
                </div>
              </div>

              <!-- S2 View -->
              <div class="hc-view-section">
                <h4 class="hc-view-title"><span>💬</span> 2. Motivo de Consulta</h4>
                <div class="hc-fields-grid">
                  <div class="hc-field hc-field-wide"><span class="hc-label">Descripción del Problema</span><span class="hc-value hc-quote" [class.empty]="!h.motiveConsultation">{{ h.motiveConsultation ? '"' + h.motiveConsultation + '"' : 'Sin registro' }}</span></div>
                  <div class="hc-field hc-field-wide"><span class="hc-label">Expectativas</span><span class="hc-value" [class.empty]="!h.expectations">{{ h.expectations || 'Sin registro' }}</span></div>
                </div>
              </div>

              <!-- S3 View -->
              <div class="hc-view-section">
                <h4 class="hc-view-title"><span>📅</span> 3. Historia del Problema Actual</h4>
                <div class="hc-fields-grid">
                  <div class="hc-field"><span class="hc-label">Fecha de Inicio</span><span class="hc-value" [class.empty]="!h.symptomOnsetDate">{{ h.symptomOnsetDate || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Desencadenantes</span><span class="hc-value" [class.empty]="!h.triggers">{{ h.triggers || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Frecuencia / Intensidad</span><span class="hc-value" [class.empty]="!h.frequencyIntensity">{{ h.frequencyIntensity || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Evolución</span><span class="hc-value" [class.empty]="!h.evolution">{{ h.evolution || 'Sin registro' }}</span></div>
                  <div class="hc-field hc-field-wide"><span class="hc-label">Intentos Previos de Solución</span><span class="hc-value" [class.empty]="!h.previousAttempts">{{ h.previousAttempts || 'Sin registro' }}</span></div>
                </div>
              </div>

              <!-- S4 View -->
              <div class="hc-view-section">
                <h4 class="hc-view-title"><span>🏥</span> 4. Antecedentes Personales</h4>
                <div class="hc-fields-grid">
                  <div class="hc-field"><span class="hc-label">Salud Física</span><span class="hc-value" [class.empty]="!h.physicalHealth">{{ h.physicalHealth || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Antecedentes Psiquiátricos</span><span class="hc-value" [class.empty]="!h.psychiatricHistory">{{ h.psychiatricHistory || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Consumo de Sustancias</span><span class="hc-value" [class.empty]="!h.substanceUse">{{ h.substanceUse || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Hitos del Desarrollo</span><span class="hc-value" [class.empty]="!h.developmentalMilestones">{{ h.developmentalMilestones || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Medicación Actual</span><span class="hc-value" [class.empty]="!h.medications">{{ h.medications || 'Sin medicación' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Alergias</span><span class="hc-value" [class.empty]="!h.allergies">{{ h.allergies || 'Sin alergias' }}</span></div>
                </div>
              </div>

              <!-- S5 View -->
              <div class="hc-view-section">
                <h4 class="hc-view-title"><span>👨‍👩‍👧‍👦</span> 5. Historia Familiar y Red de Apoyo</h4>
                <div class="hc-fields-grid">
                  <div class="hc-field"><span class="hc-label">Estructura Familiar</span><span class="hc-value" [class.empty]="!h.familyStructure">{{ h.familyStructure || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Dinámica Relacional</span><span class="hc-value" [class.empty]="!h.familyDynamics">{{ h.familyDynamics || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Antecedentes Familiares Salud Mental</span><span class="hc-value" [class.empty]="!h.familyMentalHealth">{{ h.familyMentalHealth || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Red de Apoyo</span><span class="hc-value" [class.empty]="!h.supportNetwork">{{ h.supportNetwork || 'Sin registro' }}</span></div>
                </div>
              </div>

              <!-- S6 View -->
              <div class="hc-view-section">
                <h4 class="hc-view-title"><span>🧠</span> 6. Examen del Estado Mental</h4>
                <div class="hc-fields-grid">
                  <div class="hc-field"><span class="hc-label">Apariencia y Actitud</span><span class="hc-value" [class.empty]="!h.appearanceAttitude">{{ h.appearanceAttitude || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Conciencia y Orientación</span><span class="hc-value" [class.empty]="!h.consciousnessOrientation">{{ h.consciousnessOrientation || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Pensamiento</span><span class="hc-value" [class.empty]="!h.thoughtProcess">{{ h.thoughtProcess || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Lenguaje y Afecto</span><span class="hc-value" [class.empty]="!h.languageAffect">{{ h.languageAffect || 'Sin registro' }}</span></div>
                </div>
              </div>

              <!-- S7 View -->
              <div class="hc-view-section hc-view-critical">
                <h4 class="hc-view-title hc-critical-title"><span>🚨</span> 7. Valoración de Riesgo</h4>
                <div class="hc-fields-grid">
                  <div class="hc-field hc-field-wide"><span class="hc-label">Ideación Suicida / Autolesiva</span><span class="hc-value" [class.empty]="!h.suicidalIdeation">{{ h.suicidalIdeation || 'Sin registro' }}</span></div>
                  <div class="hc-field"><span class="hc-label">Riesgo de Agresión</span><span class="hc-value" [class.empty]="!h.aggressionRisk">{{ h.aggressionRisk || 'Sin registro' }}</span></div>
                  <div class="hc-field">
                    <span class="hc-label">Nivel de Riesgo</span>
                    <span class="risk-badge" [style.background]="getRiskBg(h.riskLevel)" [style.color]="getRiskColor(h.riskLevel)">
                      {{ getRiskLabel(h.riskLevel) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Dx + Plan View -->
              <div class="hc-view-section">
                <h4 class="hc-view-title"><span>🎯</span> Diagnóstico y Plan de Tratamiento</h4>
                <div class="hc-fields-grid">
                  <div class="hc-field hc-field-wide"><span class="hc-label">Diagnóstico</span><span class="hc-value" [class.empty]="!h.diagnosis">{{ h.diagnosis || 'Sin diagnóstico' }}</span></div>
                  <div class="hc-field hc-field-wide"><span class="hc-label">Plan de Tratamiento</span><span class="hc-value" [class.empty]="!h.treatmentPlan">{{ h.treatmentPlan || 'Sin plan registrado' }}</span></div>
                </div>
              </div>

              <button class="btn-primary" style="margin-top: 12px;" (click)="openEditHistoryModal()">
                <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Editar Historia Clínica
              </button>
            </div>
          </ng-template>
        </div>

        <!-- Sub: Notas de Sesión -->
        <div *ngIf="expTab() === 'notas'" class="fade-in">
          <div class="notes-list" *ngIf="patientNotes().length > 0">
            <div class="note-card" *ngFor="let note of patientNotes()" [class.confidential]="note.confidential">
              <div class="note-header">
                <div>
                  <span class="note-title">{{ note.title }}</span>
                  <span class="note-type-badge" style="margin-left: 8px;">{{ getNoteTypeLabel(note.type) }}</span>
                </div>
                <span class="note-date">{{ note.date | date:'d MMM yyyy' }}</span>
              </div>
              <p class="note-preview">{{ note.content }}</p>
            </div>
          </div>
          <div class="empty-state" *ngIf="patientNotes().length === 0" style="padding: 40px;">
            <h3>Sin notas clínicas</h3>
            <p>Las notas de sesión aparecerán aquí conforme registres la evolución del paciente.</p>
          </div>
        </div>

        <!-- Sub: Banderas Rojas -->
        <div *ngIf="expTab() === 'banderas'" class="fade-in">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h4 style="margin: 0; color: #f1f5f9;">Alertas del Paciente</h4>
            <button class="btn-danger-sm" (click)="openRedFlagModal()">+ Nueva Alerta</button>
          </div>

          <div class="notes-list" *ngIf="patientRedFlags().length > 0">
            <div class="red-flag-card" *ngFor="let flag of patientRedFlags()">
              <div class="rfl-card-header">
                <span class="rfl-icon-lg">{{ getRedFlagIcon(flag.type) }}</span>
                <div>
                  <strong class="rfl-card-title">{{ getRedFlagLabel(flag.type) }}</strong>
                  <span class="rfl-card-date">Registrada: {{ flag.createdAt | date:'d MMM yyyy' }}</span>
                </div>
                <span class="rfl-severity-badge" [class.critica]="flag.severity === 'critica'">{{ flag.severity === 'critica' ? 'CRÍTICO' : 'ALTO' }}</span>
              </div>
              <p class="rfl-card-desc">{{ flag.description }}</p>
              <button class="btn-link" style="color: #94a3b8; font-size: 0.8rem;" (click)="deactivateRedFlag(flag.id)">Desactivar alerta</button>
            </div>
          </div>

          <div class="empty-state" *ngIf="patientRedFlags().length === 0" style="padding: 40px;">
            <h3>Sin alertas activas</h3>
            <p>Las banderas rojas se usan para información crítica que siempre debe estar visible (riesgo suicida, alergias, trauma).</p>
          </div>
        </div>

        <!-- Sub: Evaluaciones Psicológicas -->
        <div *ngIf="expTab() === 'evaluaciones'" class="fade-in">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h4 style="margin: 0 0 4px; font-weight: 700; color: var(--text-primary, #f1f5f9);">Evaluaciones Psicológicas</h4>
              <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary, #94a3b8);">
                {{ patientEvals().length }} evaluación{{ patientEvals().length !== 1 ? 'es' : '' }} registrada{{ patientEvals().length !== 1 ? 's' : '' }}
              </p>
            </div>
            <button class="btn-primary" (click)="openEvalModal()">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nueva Evaluación
            </button>
          </div>

          <!-- Eval cards list -->
          <div class="eval-grid" *ngIf="patientEvals().length > 0">
            <div class="eval-card" *ngFor="let ev of patientEvals(); let i = index" [style.animation-delay]="(i * 60) + 'ms'" (click)="viewEvalDetail(ev)">
              <div class="eval-card-banner" [ngClass]="getEvalBannerClass(ev.category)">
                <span class="eval-icon">{{ getEvalCategoryIcon(ev.category) }}</span>
              </div>
              <div class="eval-card-body">
                <div class="eval-card-info">
                  <h5 class="eval-card-title">{{ ev.instrumentName }}</h5>
                  <span class="eval-badge" [ngClass]="'eval-badge-' + ev.status">
                    {{ ev.status === 'completada' ? 'Completada' : ev.status === 'en_progreso' ? 'En Progreso' : 'Pendiente' }}
                  </span>
                  <div style="margin-top: 8px; font-size: 0.78rem; color: var(--text-secondary, #94a3b8);">
                    {{ ev.date | date:'d MMM yyyy' }}
                  </div>
                </div>
                <div class="eval-card-footer">
                  <div class="eval-score" *ngIf="ev.score !== null && ev.score !== undefined">
                    <span class="eval-score-value">{{ ev.score }}</span>
                    <span class="eval-score-label">pts</span>
                  </div>
                  <div class="eval-card-actions">
                    <button class="eval-action-btn" title="Ver detalle" (click)="viewEvalDetail(ev); $event.stopPropagation()">
                      <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="eval-action-btn eval-action-delete" title="Eliminar" (click)="deleteEval(ev.id); $event.stopPropagation()">
                      <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty -->
          <div class="empty-state" *ngIf="patientEvals().length === 0" style="padding: 60px 24px;">
            <div style="width: 100px; height: 100px; margin: 0 auto 20px; background: linear-gradient(135deg, rgba(var(--accent-rgb, 14, 165, 233), 0.1), color-mix(in srgb, var(--accent) 10%, transparent)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem;">
              🧪
            </div>
            <h3>Sin evaluaciones aplicadas</h3>
            <p>Aplica instrumentos psicológicos estandarizados como BDI-II, PHQ-9, Hamilton, MMSE y más para hacer seguimiento objetivo del progreso terapéutico.</p>
            <button class="btn-primary" style="margin-top: 16px;" (click)="openEvalModal()">+ Aplicar primera evaluación</button>
          </div>
        </div>

        <!-- Sub: Línea de Tiempo -->
        <div *ngIf="expTab() === 'timeline'" class="fade-in">
          <div class="notes-list" *ngIf="patientTimeline().length > 0">
            <div class="note-card" *ngFor="let ev of patientTimeline()" [style.border-left-color]="ev.color">
              <div class="note-header">
                <span class="note-title">{{ ev.icon }} {{ ev.title }}</span>
                <span class="note-date">{{ ev.date | date:'d MMM yyyy, HH:mm' }}</span>
              </div>
              <p class="note-preview">{{ ev.detail }}</p>
            </div>
          </div>
          <div class="empty-state" *ngIf="patientTimeline().length === 0" style="padding: 40px;">
            <h3>Sin actividad registrada</h3>
            <p>La línea de tiempo mostrará citas y notas del paciente de forma cronológica.</p>
          </div>
        </div>
      </div>

      <!-- ═══════ TAB: CONFIGURACIÓN ═══════ -->
      <div *ngIf="activeTab() === 'config'" class="fade-in">

        <div class="config-section">
          <h3 class="config-title">
            <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--accent);fill:none;stroke-width:2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Datos del Profesional
          </h3>
          <div class="form-grid cols-2">
            <div class="form-field">
              <label>Nombre Completo</label>
              <input type="text" [ngModel]="clinicaService.config().professionalName" (ngModelChange)="clinicaService.updateConfig({ professionalName: $event })">
            </div>
            <div class="form-field">
              <label>Especialidad</label>
              <input type="text" [ngModel]="clinicaService.config().specialty" (ngModelChange)="clinicaService.updateConfig({ specialty: $event })">
            </div>
            <div class="form-field">
              <label>Cédula / Licencia</label>
              <input type="text" [ngModel]="clinicaService.config().licenseNumber" (ngModelChange)="clinicaService.updateConfig({ licenseNumber: $event })">
            </div>
          </div>
        </div>

        <div class="config-section">
          <h3 class="config-title">
            <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--accent);fill:none;stroke-width:2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Sesiones
          </h3>
          <div class="form-grid cols-3">
            <div class="form-field">
              <label>Duración (min)</label>
              <select [ngModel]="clinicaService.config().sessionDurationMinutes" (ngModelChange)="clinicaService.updateConfig({ sessionDurationMinutes: +$event })">
                <option [value]="30">30 min</option>
                <option [value]="45">45 min</option>
                <option [value]="50">50 min</option>
                <option [value]="60">60 min</option>
                <option [value]="90">90 min</option>
              </select>
            </div>
            <div class="form-field">
              <label>Buffer entre citas (min)</label>
              <select [ngModel]="clinicaService.config().bufferMinutes" (ngModelChange)="clinicaService.updateConfig({ bufferMinutes: +$event })">
                <option [value]="0">0 min</option>
                <option [value]="5">5 min</option>
                <option [value]="10">10 min</option>
                <option [value]="15">15 min</option>
                <option [value]="30">30 min</option>
              </select>
            </div>
            <div class="form-field">
              <label>Costo por sesión</label>
              <input umCurrencyInput [ngModel]="clinicaService.config().defaultCost" (ngModelChange)="clinicaService.updateConfig({ defaultCost: +$event })">
            </div>
          </div>
        </div>

        <div class="config-section">
          <h3 class="config-title">
            <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--accent);fill:none;stroke-width:2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Horario de Disponibilidad
          </h3>
          <div *ngFor="let slot of clinicaService.config().availability; let i = index" class="availability-row">
            <button class="avail-toggle" [class.checked]="slot.active" (click)="toggleAvailability(i)">
              <span *ngIf="slot.active">✓</span>
            </button>
            <span class="avail-day">{{ getWeekdayName(slot.dayOfWeek) }}</span>
            <div class="avail-times" *ngIf="slot.active">
              <input type="time" [value]="slot.startTime" (change)="updateAvailTime(i, 'start', $event)">
              <span>–</span>
              <input type="time" [value]="slot.endTime" (change)="updateAvailTime(i, 'end', $event)">
            </div>
            <span *ngIf="!slot.active" style="font-size: 0.82rem; color: #94a3b8;">No disponible</span>
          </div>
        </div>
      </div>

      <!-- ═══════ MODAL: NUEVA CITA ═══════ -->
      <div class="modal-overlay" *ngIf="showApptModal()" (click)="showApptModal.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nueva Cita</h3>
          <p class="modal-subtitle">Completa los datos para agendar</p>

          <div class="form-grid cols-2">
            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Paciente</label>
              <select [(ngModel)]="apptForm.patientId" (ngModelChange)="onApptPatientChange($event)">
                <option value="">Seleccionar paciente...</option>
                <option *ngFor="let p of clinicaService.activePatients()" [value]="p.id">{{ p.firstName }} {{ p.lastName }}</option>
              </select>
            </div>
            <div class="form-field">
              <label>Fecha</label>
              <input type="date" [(ngModel)]="apptForm.date">
            </div>
            <div class="form-field">
              <label>Hora</label>
              <input type="time" [(ngModel)]="apptForm.startTime">
            </div>
            <div class="form-field">
              <label>Tipo</label>
              <select [(ngModel)]="apptForm.type">
                <option *ngFor="let t of appointmentTypes" [value]="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="form-field">
              <label>Modalidad</label>
              <select [(ngModel)]="apptForm.modality">
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>
            </div>
            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Motivo de Consulta</label>
              <textarea [(ngModel)]="apptForm.reason" rows="2" placeholder="Breve descripción..."></textarea>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-secondary" (click)="showApptModal.set(false)">Cancelar</button>
            <button class="btn-primary" (click)="saveAppointment()" [disabled]="!apptForm.patientId || !apptForm.date || !apptForm.startTime">Agendar Cita</button>
          </div>
        </div>
      </div>

      <!-- ═══════ MODAL: NUEVO PACIENTE ═══════ -->
      <div class="modal-overlay" *ngIf="showPatientModal()" (click)="showPatientModal.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nuevo Paciente</h3>
          <p class="modal-subtitle">Registra un nuevo paciente</p>

          <div class="form-grid cols-2">
            <div class="form-field">
              <label>Nombre</label>
              <input type="text" [(ngModel)]="patientForm.firstName" placeholder="Nombre">
            </div>
            <div class="form-field">
              <label>Apellido</label>
              <input type="text" [(ngModel)]="patientForm.lastName" placeholder="Apellido">
            </div>
            <div class="form-field">
              <label>Email</label>
              <input type="email" [(ngModel)]="patientForm.email" placeholder="correo@ejemplo.com">
            </div>
            <div class="form-field">
              <label>Teléfono</label>
              <input type="tel" [(ngModel)]="patientForm.phone" placeholder="555-1234">
            </div>
            <div class="form-field">
              <label>Fecha de Nacimiento</label>
              <input type="date" [(ngModel)]="patientForm.birthDate">
            </div>
            <div class="form-field">
              <label>Género</label>
              <select [(ngModel)]="patientForm.gender">
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Ocupación</label>
              <input type="text" [(ngModel)]="patientForm.occupation" placeholder="Ocupación">
            </div>
            <div class="form-field">
              <label>Contacto de Emergencia</label>
              <input type="text" [(ngModel)]="patientForm.emergencyContact" placeholder="Nombre">
            </div>
            <div class="form-field">
              <label>Tel. Emergencia</label>
              <input type="tel" [(ngModel)]="patientForm.emergencyPhone" placeholder="555-9999">
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-secondary" (click)="showPatientModal.set(false)">Cancelar</button>
            <button class="btn-primary" (click)="savePatient()" [disabled]="!patientForm.firstName || !patientForm.lastName">Registrar Paciente</button>
          </div>
        </div>
      </div>

      <!-- ═══════ MODAL: NUEVA NOTA (Rich Editor + Voice + Templates) ═══════ -->
      <div class="modal-overlay" *ngIf="showNoteModal()" (click)="showNoteModal.set(false)">
        <div class="modal-card modal-wide" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nueva Nota Clínica</h3>
          <p class="modal-subtitle">Para: {{ selectedPatient()?.firstName }} {{ selectedPatient()?.lastName }}</p>

          <!-- Template Selector -->
          <div class="template-selector" *ngIf="!noteForm.fromTemplate">
            <p class="template-label">Usar plantilla:</p>
            <div class="template-chips">
              <button class="template-chip" *ngFor="let tpl of defaultTemplates" (click)="applyTemplate(tpl)">
                <span>{{ tpl.icon }}</span> {{ tpl.name }}
              </button>
              <button class="template-chip template-blank" (click)="noteForm.fromTemplate = 'blank'">En blanco</button>
            </div>
          </div>

          <div class="form-grid" *ngIf="noteForm.fromTemplate">
            <div class="form-field" style="display: flex; gap: 12px;">
              <div style="flex: 1;">
                <label>Tipo de Nota</label>
                <select [(ngModel)]="noteForm.type">
                  <option *ngFor="let t of noteTypes" [value]="t.value">{{ t.icon }} {{ t.label }}</option>
                </select>
              </div>
              <div style="flex: 2;">
                <label>Título</label>
                <input type="text" [(ngModel)]="noteForm.title" placeholder="Ej: Sesión #12 — Seguimiento">
              </div>
            </div>

            <!-- Rich Editor Toolbar -->
            <div class="form-field">
              <label>Contenido</label>
              <div class="rich-toolbar">
                <button class="rt-btn" (click)="execCmd('bold')" title="Negrita"><b>B</b></button>
                <button class="rt-btn" (click)="execCmd('italic')" title="Cursiva"><i>I</i></button>
                <button class="rt-btn" (click)="execCmd('underline')" title="Subrayado"><u>U</u></button>
                <span class="rt-sep"></span>
                <button class="rt-btn" (click)="execCmd('insertUnorderedList')" title="Lista">•</button>
                <button class="rt-btn" (click)="execCmd('insertOrderedList')" title="Lista numerada">1.</button>
                <span class="rt-sep"></span>
                <button class="rt-btn" (click)="execCmd('formatBlock', 'h3')" title="Encabezado">H</button>
                <span class="rt-sep"></span>
                <button class="rt-btn rt-voice" [class.recording]="isRecording" (click)="toggleVoice()" title="Dictar por voz">
                  {{ isRecording ? '⏹ Parar' : '🎙️ Dictar' }}
                </button>
                <span class="rt-voice-status" *ngIf="isRecording">● Escuchando...</span>
              </div>
              <div class="rich-editor" contenteditable="true" #richEditor
                (input)="onEditorInput($event)" [innerHTML]="noteForm.content"
                data-placeholder="Escribe o dicta las notas de la sesión..."></div>
            </div>
          </div>

          <div class="form-actions" *ngIf="noteForm.fromTemplate">
            <button class="btn-secondary" (click)="showNoteModal.set(false)">Cancelar</button>
            <button class="btn-primary" (click)="saveNote()" [disabled]="!noteForm.title">Guardar Nota</button>
          </div>
        </div>
      </div>

      <!-- ═══════ MODAL: NUEVA BANDERA ROJA ═══════ -->
      <div class="modal-overlay" *ngIf="showRedFlagModal()" (click)="showRedFlagModal.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title" style="color: #ef4444;">🚩 Nueva Bandera Roja</h3>
          <p class="modal-subtitle">Información crítica que siempre debe estar visible</p>

          <div class="form-grid">
            <div class="form-field">
              <label>Tipo de alerta</label>
              <select [(ngModel)]="redFlagForm.type">
                <option *ngFor="let t of redFlagTypes" [value]="t.value">{{ t.icon }} {{ t.label }}</option>
              </select>
            </div>
            <div class="form-field">
              <label>Severidad</label>
              <select [(ngModel)]="redFlagForm.severity">
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
            <div class="form-field">
              <label>Descripción</label>
              <textarea [(ngModel)]="redFlagForm.description" rows="3" placeholder="Detalle de la alerta..."></textarea>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-secondary" (click)="showRedFlagModal.set(false)">Cancelar</button>
            <button class="btn-danger" (click)="saveRedFlag()" [disabled]="!redFlagForm.description">Registrar Alerta</button>
          </div>
        </div>
      </div>

      <!-- ═══════ MODAL: NUEVA EVALUACIÓN ═══════ -->
      <div class="modal-overlay" *ngIf="showEvalModal()" (click)="showEvalModal.set(false)">
        <div class="modal-card" style="max-width: 600px;" (click)="$event.stopPropagation()">
          <h3 class="modal-title">🧪 Nueva Evaluación Psicológica</h3>
          <p class="modal-subtitle">Selecciona un instrumento y registra resultados para {{ selectedPatient()?.firstName }} {{ selectedPatient()?.lastName }}</p>

          <div class="form-grid cols-2">
            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Categoría</label>
              <select [(ngModel)]="evalForm.category" (ngModelChange)="onEvalCategoryChange()">
                <option value="">— Seleccionar categoría —</option>
                <option value="depresion">😔 Depresión</option>
                <option value="ansiedad">😰 Ansiedad</option>
                <option value="cognitivo">🧠 Cognitivo / Neuropsicológico</option>
                <option value="personalidad">🪞 Personalidad</option>
                <option value="funcionalidad">📊 Funcionalidad Global</option>
                <option value="riesgo">🚨 Riesgo / Crisis</option>
                <option value="infantojuvenil">🧒 Infantojuvenil</option>
                <option value="otro">📋 Otro</option>
              </select>
            </div>

            <div class="form-field" style="grid-column: 1 / -1;">
              <label>Instrumento</label>
              <select [(ngModel)]="evalForm.instrumentId" (ngModelChange)="onEvalInstrumentChange()">
                <option value="">— Seleccionar instrumento —</option>
                <option *ngFor="let inst of filteredInstruments()" [value]="inst.id">{{ inst.name }}</option>
              </select>
            </div>

            <div class="form-field" *ngIf="selectedInstrument()">
              <label>Puntuación</label>
              <input type="number" [(ngModel)]="evalForm.score" placeholder="Ej: 14">
            </div>

            <div class="form-field" *ngIf="selectedInstrument()">
              <label>Estado</label>
              <select [(ngModel)]="evalForm.status">
                <option value="completada">Completada</option>
                <option value="en_progreso">En Progreso</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>

            <div class="form-field" style="grid-column: 1 / -1;" *ngIf="selectedInstrument()">
              <label>Interpretación Clínica</label>
              <textarea [(ngModel)]="evalForm.interpretation" rows="3" placeholder="Interpretación de los resultados según los baremos del instrumento..."></textarea>
            </div>

            <div class="form-field" style="grid-column: 1 / -1;" *ngIf="selectedInstrument()">
              <label>Observaciones Clínicas</label>
              <textarea [(ngModel)]="evalForm.notes" rows="3" placeholder="Observaciones durante la aplicación, comportamiento del paciente, validez estimada..."></textarea>
            </div>
          </div>

          <!-- Instrument info box -->
          <div *ngIf="selectedInstrument()" style="background: rgba(var(--accent-rgb, 14, 165, 233), 0.06); border: 1px solid rgba(var(--accent-rgb, 14, 165, 233), 0.15); border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;">
            <div style="font-size: 0.78rem; font-weight: 700; color: var(--accent); margin-bottom: 4px;">ℹ️ {{ selectedInstrument()!.name }}</div>
            <div style="font-size: 0.78rem; color: var(--text-secondary, #94a3b8); line-height: 1.5;">{{ selectedInstrument()!.description }}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted, #64748b); margin-top: 6px;" *ngIf="selectedInstrument()!.scaleRange">
              Rango de puntuación: {{ selectedInstrument()!.scaleRange }}
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-secondary" (click)="showEvalModal.set(false)">Cancelar</button>
            <button class="btn-primary" [disabled]="!evalForm.instrumentId" (click)="saveEval()">Guardar Evaluación</button>
          </div>
        </div>
      </div>

      <!-- ═══════ MODAL: DETALLE EVALUACIÓN ═══════ -->
      <div class="modal-overlay" *ngIf="showEvalDetail()" (click)="showEvalDetail.set(false)">
        <div class="modal-card" style="max-width: 560px;" (click)="$event.stopPropagation()">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;" [ngClass]="getEvalBannerClass(evalDetailData()?.category || '')">
              {{ getEvalCategoryIcon(evalDetailData()?.category || '') }}
            </div>
            <div>
              <h3 class="modal-title" style="margin: 0;">{{ evalDetailData()?.instrumentName }}</h3>
              <p class="modal-subtitle" style="margin: 0;">{{ evalDetailData()?.date | date:'d MMMM yyyy' }}</p>
            </div>
          </div>

          <div class="hc-fields-grid" style="margin-bottom: 16px;">
            <div class="hc-field">
              <span class="hc-label">Categoría</span>
              <span class="hc-value">{{ getEvalCategoryLabel(evalDetailData()?.category || '') }}</span>
            </div>
            <div class="hc-field">
              <span class="hc-label">Estado</span>
              <span class="eval-badge" [ngClass]="'eval-badge-' + (evalDetailData()?.status || 'pendiente')">
                {{ evalDetailData()?.status === 'completada' ? 'Completada' : evalDetailData()?.status === 'en_progreso' ? 'En Progreso' : 'Pendiente' }}
              </span>
            </div>
            <div class="hc-field" *ngIf="evalDetailData()?.score !== null && evalDetailData()?.score !== undefined">
              <span class="hc-label">Puntuación</span>
              <span class="hc-value" style="font-size: 1.4rem; font-weight: 800; color: var(--accent);">{{ evalDetailData()?.score }} pts</span>
            </div>
          </div>

          <div class="hc-view-section" *ngIf="evalDetailData()?.interpretation" style="margin-bottom: 12px;">
            <h4 class="hc-view-title"><span>📝</span> Interpretación Clínica</h4>
            <p class="hc-value" style="white-space: pre-wrap;">{{ evalDetailData()?.interpretation }}</p>
          </div>

          <div class="hc-view-section" *ngIf="evalDetailData()?.notes">
            <h4 class="hc-view-title"><span>📋</span> Observaciones</h4>
            <p class="hc-value" style="white-space: pre-wrap;">{{ evalDetailData()?.notes }}</p>
          </div>

          <div class="form-actions" style="margin-top: 16px;">
            <button class="btn-secondary" (click)="showEvalDetail.set(false)">Cerrar</button>
          </div>
        </div>
      </div>

    </div>
  `,
})
export class ClinicaComponent implements OnInit {
  clinicaService = inject(ClinicaService);

  // ─── State ──────────────────────
  activeTab = signal<MainTab>('agenda');
  expTab = signal<ExpTab>('historia');
  selectedPatient = signal<Patient | null>(null);
  patientSearch = signal('');
  
  calendarView = signal<'dia' | 'semana' | 'mes'>('semana');
  dateOffset = signal(0); // Works as offset for day, week, or month

  // Modals
  showApptModal = signal(false);
  showPatientModal = signal(false);
  showNoteModal = signal(false);
  showRedFlagModal = signal(false);

  // Constants
  appointmentTypes = APPOINTMENT_TYPES;
  noteTypes = NOTE_TYPES;
  redFlagTypes = RED_FLAG_TYPES;
  defaultTemplates = DEFAULT_NOTE_TEMPLATES;

  // Form data
  apptForm = this.emptyApptForm();
  patientForm = this.emptyPatientForm();
  noteForm = this.emptyNoteForm();
  redFlagForm = this.emptyRedFlagForm();

  // Rich Editor
  @ViewChild('richEditor') richEditorRef!: ElementRef<HTMLDivElement>;
  isRecording = false;
  private speechRecognition: any = null;

  // ─── Computed ───────────────────

  stats = this.clinicaService.estadisticas;
  proxCita = this.clinicaService.proximaCita;

  filteredPatients = computed(() => {
    const q = this.patientSearch().toLowerCase().trim();
    const all = this.clinicaService.activePatients();
    if (!q) return all;
    return all.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  currentHistory = computed(() => {
    const p = this.selectedPatient();
    return p ? this.clinicaService.getHistory(p.id) : undefined;
  });

  patientNotes = computed(() => {
    const p = this.selectedPatient();
    return p ? this.clinicaService.getPatientNotes(p.id) : [];
  });

  patientRedFlags = computed(() => {
    const p = this.selectedPatient();
    return p ? this.clinicaService.getActiveRedFlags(p.id) : [];
  });

  patientTimeline = computed(() => {
    const p = this.selectedPatient();
    if (!p) return [];
    const appts = this.clinicaService.getPatientAppointments(p.id).map(a => ({
      date: a.date,
      title: `Cita: ${this.getTypeLabel(a.type)}`,
      detail: `${a.startTime} — ${this.getStatusConfig(a.status).label}. ${a.reason || ''}`,
      icon: '📅',
      color: this.getTypeColor(a.type),
    }));
    const notes = this.clinicaService.getPatientNotes(p.id).map(n => ({
      date: n.date,
      title: n.title,
      detail: n.content.substring(0, 120) + (n.content.length > 120 ? '...' : ''),
      icon: '📝',
      color: 'var(--accent)',
    }));
    return [...appts, ...notes].sort((a, b) => b.date.localeCompare(a.date));
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
    const appts = this.clinicaService.getAppointmentsForDate(targetDate);
    const slots: { time: string; date: string; appointment: Appointment | null }[] = [];

    // Generate time slots from 7:00 to 21:00
    for (let h = 7; h <= 20; h++) {
      const time = `${String(h).padStart(2, '0')}:00`;
      const appt = appts.find(a => a.startTime === time) || null;
      slots.push({ time, date: targetDate, appointment: appt });
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
         appointments: this.clinicaService.getAppointmentsForDate(dateStr)
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
           appointment: day.appointments.find((a: any) => a.startTime === time) || null
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
    
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Map so Monday is 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
       const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
       const appointments = this.clinicaService.getAppointmentsForDate(dateStr);
       days.push({ 
          date: dateStr, 
          day: d, 
          isToday: dateStr === new Date().toISOString().split('T')[0],
          appointments 
       });
    }
    
    return days;
  });

  ngOnInit(): void {}

  // ─── Tab Navigation ─────────────
  setTab(tab: MainTab): void {
    this.activeTab.set(tab);
  }

  // ─── Calendar Navigation ────────

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

  // ─── Helpers ────────────────────

  getInitials(p: Patient): string {
    return (p.firstName[0] || '') + (p.lastName[0] || '');
  }

  calcAge(birthDate: string): number {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  getTypeColor(type: AppointmentType): string {
    return APPOINTMENT_TYPES.find(t => t.value === type)?.color || 'var(--accent)';
  }

  getTypeLabel(type: AppointmentType): string {
    return APPOINTMENT_TYPES.find(t => t.value === type)?.label || type;
  }

  getStatusConfig(status: AppointmentStatus) {
    return STATUS_CONFIG[status] || STATUS_CONFIG['pendiente'];
  }

  getNoteTypeLabel(type: NoteType): string {
    return NOTE_TYPES.find(t => t.value === type)?.label || type;
  }

  getRiskColor(level: string): string {
    return RISK_LEVELS.find(r => r.value === level)?.color || '#94a3b8';
  }

  getRiskBg(level: string): string {
    return RISK_LEVELS.find(r => r.value === level)?.bg || 'rgba(0,0,0,0.05)';
  }

  getRiskLabel(level: string): string {
    return RISK_LEVELS.find(r => r.value === level)?.label || level;
  }

  getWeekdayName(day: number): string {
    return WEEKDAYS[day] || '';
  }

  getPatientDx(patientId: string): string {
    return this.clinicaService.getHistory(patientId)?.diagnosis || '';
  }

  getPatientFlagCount(patientId: string): number {
    return this.clinicaService.getActiveRedFlags(patientId).length;
  }

  getRedFlagIcon(type: RedFlagType): string {
    return RED_FLAG_TYPES.find(t => t.value === type)?.icon || '🔴';
  }

  getRedFlagLabel(type: RedFlagType): string {
    return RED_FLAG_TYPES.find(t => t.value === type)?.label || type;
  }

  // ─── Patient Actions ────────────

  openExpediente(patient: Patient): void {
    this.selectedPatient.set(patient);
    this.expTab.set('historia');
    this.activeTab.set('expediente');
  }

  openNewPatientModal(): void {
    this.patientForm = this.emptyPatientForm();
    this.showPatientModal.set(true);
  }

  savePatient(): void {
    this.clinicaService.addPatient(this.patientForm as any);
    this.showPatientModal.set(false);
  }

  // ─── Appointment Actions ────────

  openNewApptModal(time?: string, dateStr?: string): void {
    this.apptForm = this.emptyApptForm();
    if (time) {
      this.apptForm.startTime = time;
    }
    this.apptForm.date = dateStr || new Date().toISOString().split('T')[0];
    this.showApptModal.set(true);
  }

  openNewApptModalForPatient(patient: Patient): void {
    this.apptForm = this.emptyApptForm();
    this.apptForm.patientId = patient.id;
    this.apptForm.patientName = `${patient.firstName} ${patient.lastName}`;
    this.showApptModal.set(true);
  }

  onApptPatientChange(patientId: string): void {
    const p = this.clinicaService.getPatient(patientId);
    if (p) this.apptForm.patientName = `${p.firstName} ${p.lastName}`;
  }

  saveAppointment(): void {
    const cfg = this.clinicaService.config();
    const endMinutes = this.timeToMinutes(this.apptForm.startTime) + cfg.sessionDurationMinutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    this.clinicaService.scheduleAppointment({
      ...this.apptForm,
      endTime,
      status: 'pendiente',
      cost: cfg.defaultCost,
      paid: false,
      notes: '',
    } as any);
    this.showApptModal.set(false);
  }

  openAppointmentDetail(appt: Appointment): void {
    // For now — navigate to patient expediente
    const patient = this.clinicaService.getPatient(appt.patientId);
    if (patient) this.openExpediente(patient);
  }

  // ─── Note Actions ───────────────

  openNewNoteModal(): void {
    this.noteForm = this.emptyNoteForm();
    this.showNoteModal.set(true);
  }

  saveNote(): void {
    const p = this.selectedPatient();
    if (!p) return;
    // Get content from contenteditable div
    const editorEl = this.richEditorRef?.nativeElement;
    const content = editorEl ? editorEl.innerHTML : this.noteForm.content;
    this.clinicaService.addNote({
      patientId: p.id,
      date: new Date().toISOString().split('T')[0],
      type: this.noteForm.type as NoteType,
      title: this.noteForm.title,
      content: content,
      tags: [],
      confidential: false,
      fromTemplate: this.noteForm.fromTemplate || undefined,
      fromVoice: false,
    });
    if (this.isRecording) this.stopVoice();
    this.showNoteModal.set(false);
  }

  // ─── Red Flag Actions ───────────

  openRedFlagModal(): void {
    this.redFlagForm = this.emptyRedFlagForm();
    this.showRedFlagModal.set(true);
  }

  saveRedFlag(): void {
    const p = this.selectedPatient();
    if (!p) return;
    this.clinicaService.addRedFlag(
      p.id,
      this.redFlagForm.type as RedFlagType,
      this.redFlagForm.description,
      this.redFlagForm.severity as 'alta' | 'critica'
    );
    this.showRedFlagModal.set(false);
  }

  deactivateRedFlag(flagId: string): void {
    const p = this.selectedPatient();
    if (!p) return;
    if (confirm('¿Desactivar esta alerta? La información se conservará en el historial.')) {
      this.clinicaService.removeRedFlag(p.id, flagId);
    }
  }

  // ─── Rich Editor Actions ─────────

  execCmd(command: string, value?: string): void {
    document.execCommand(command, false, value || '');
    this.richEditorRef?.nativeElement?.focus();
  }

  onEditorInput(event: Event): void {
    // Sync contenteditable with form model
    const el = event.target as HTMLDivElement;
    this.noteForm.content = el.innerHTML;
  }

  applyTemplate(tpl: NoteTemplate): void {
    this.noteForm.fromTemplate = tpl.id;
    this.noteForm.title = tpl.name + ' — ' + new Date().toLocaleDateString('es');
    this.noteForm.content = tpl.content;
    // Update editor in next tick
    setTimeout(() => {
      if (this.richEditorRef?.nativeElement) {
        this.richEditorRef.nativeElement.innerHTML = tpl.content;
      }
    });
  }

  // ─── Voice Dictation ────────────

  toggleVoice(): void {
    if (this.isRecording) {
      this.stopVoice();
    } else {
      this.startVoice();
    }
  }

  private startVoice(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta dictado por voz. Usa Chrome o Edge.');
      return;
    }
    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.lang = 'es-CO';
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;

    this.speechRecognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript + '. ';
        }
      }
      if (transcript && this.richEditorRef?.nativeElement) {
        // Append transcribed text at cursor or end
        this.richEditorRef.nativeElement.innerHTML += `<p>${transcript.trim()}</p>`;
        this.noteForm.content = this.richEditorRef.nativeElement.innerHTML;
      }
    };

    this.speechRecognition.onerror = (event: any) => {
      console.warn('Voice error:', event.error);
      this.isRecording = false;
    };

    this.speechRecognition.onend = () => {
      if (this.isRecording) {
        // Restart if still recording (browser may auto-stop)
        this.speechRecognition.start();
      }
    };

    this.speechRecognition.start();
    this.isRecording = true;
  }

  private stopVoice(): void {
    if (this.speechRecognition) {
      this.speechRecognition.stop();
      this.speechRecognition = null;
    }
    this.isRecording = false;
  }

  // ─── Config Actions ─────────────

  toggleAvailability(index: number): void {
    const avail = [...this.clinicaService.config().availability];
    avail[index] = { ...avail[index], active: !avail[index].active };
    this.clinicaService.updateConfig({ availability: avail });
  }

  updateAvailTime(index: number, which: 'start' | 'end', event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const avail = [...this.clinicaService.config().availability];
    if (which === 'start') avail[index] = { ...avail[index], startTime: val };
    else avail[index] = { ...avail[index], endTime: val };
    this.clinicaService.updateConfig({ availability: avail });
  }

  // ─── Clinical History Edit ──────
  editingHistory = signal(false);
  hcSections = signal<boolean[]>([true, true, true, true, true, true, true, true]);
  historyForm: any = this.emptyHistoryForm();

  openEditHistoryModal(): void {
    const h = this.currentHistory();
    if (h) {
      this.historyForm = { ...h };
    } else {
      this.historyForm = this.emptyHistoryForm();
    }
    this.hcSections.set([true, true, true, true, true, true, true, true]);
    this.editingHistory.set(true);
  }

  cancelEditHistory(): void {
    this.editingHistory.set(false);
  }

  saveHistory(): void {
    const p = this.selectedPatient();
    if (!p) return;
    const { patientId, redFlags, updatedAt, ...changes } = this.historyForm;
    this.clinicaService.updateHistory(p.id, changes);
    this.editingHistory.set(false);
  }

  toggleHcSection(index: number): void {
    const current = [...this.hcSections()];
    current[index] = !current[index];
    this.hcSections.set(current);
  }

  private emptyHistoryForm() {
    return {
      civilStatus: '', familyComposition: '', educationLevel: '', orientation: '',
      emergencyContactName: '', emergencyContactPhone: '',
      motiveConsultation: '', expectations: '',
      symptomOnsetDate: '', triggers: '', frequencyIntensity: '', evolution: '', previousAttempts: '',
      physicalHealth: '', psychiatricHistory: '', substanceUse: '', developmentalMilestones: '',
      familyStructure: '', familyDynamics: '', familyMentalHealth: '', supportNetwork: '',
      appearanceAttitude: '', consciousnessOrientation: '', thoughtProcess: '', languageAffect: '',
      suicidalIdeation: '', aggressionRisk: '',
      currentSymptoms: '', personalHistory: '', familyHistory: '', medicalHistory: '',
      medications: '', allergies: '', diagnosis: '', treatmentPlan: '',
      riskLevel: 'bajo' as const,
    };
  }

  // ─── Form Factories ─────────────

  private emptyApptForm() {
    return {
      patientId: '', patientName: '', date: '', startTime: '',
      type: 'seguimiento' as AppointmentType, modality: 'presencial' as 'presencial' | 'virtual',
      reason: '',
    };
  }

  private emptyPatientForm() {
    return {
      firstName: '', lastName: '', email: '', phone: '',
      birthDate: '', gender: 'M' as 'M' | 'F' | 'Otro',
      occupation: '', emergencyContact: '', emergencyPhone: '', notes: '',
    };
  }

  private emptyNoteForm() {
    return { type: 'sesion' as NoteType, title: '', content: '', fromTemplate: '' };
  }

  private emptyRedFlagForm() {
    return { type: 'ideacion-suicida' as RedFlagType, description: '', severity: 'alta' as 'alta' | 'critica' };
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  // ═══════ EVALUACIONES PSICOLÓGICAS ═══════

  // Psychological instruments catalog
  readonly psyInstruments: { id: string; name: string; category: string; description: string; scaleRange: string }[] = [
    // Depresión
    { id: 'bdi-ii', name: 'BDI-II (Inventario de Depresión de Beck)', category: 'depresion', description: 'Evaluación de gravedad de síntomas depresivos en adultos. 21 ítems con escala 0-3.', scaleRange: '0-63 (Mínimo: 0-13, Leve: 14-19, Moderado: 20-28, Grave: 29-63)' },
    { id: 'phq-9', name: 'PHQ-9 (Patient Health Questionnaire)', category: 'depresion', description: 'Cribado de depresión mayor. 9 ítems basados en DSM-5.', scaleRange: '0-27 (Ninguna: 0-4, Leve: 5-9, Moderada: 10-14, Mod-Grave: 15-19, Grave: 20-27)' },
    { id: 'hamilton-dep', name: 'HDRS (Escala de Hamilton para Depresión)', category: 'depresion', description: 'Escala heteroaplicada de 17 ítems para evaluar gravedad de depresión.', scaleRange: '0-52 (Normal: 0-7, Leve: 8-13, Moderada: 14-18, Grave: 19-22, Muy grave: ≥23)' },
    { id: 'madrs', name: 'MADRS (Montgomery-Åsberg)', category: 'depresion', description: 'Escala de 10 ítems sensible al cambio terapéutico en depresión.', scaleRange: '0-60 (Normal: 0-6, Leve: 7-19, Moderada: 20-34, Grave: ≥35)' },
    // Ansiedad
    { id: 'bai', name: 'BAI (Inventario de Ansiedad de Beck)', category: 'ansiedad', description: '21 ítems que miden gravedad de síntomas ansiosos. Diferencia ansiedad de depresión.', scaleRange: '0-63 (Mínima: 0-7, Leve: 8-15, Moderada: 16-25, Grave: 26-63)' },
    { id: 'gad-7', name: 'GAD-7 (Generalized Anxiety Disorder)', category: 'ansiedad', description: 'Cribado de trastorno de ansiedad generalizada. 7 ítems.', scaleRange: '0-21 (Mínima: 0-4, Leve: 5-9, Moderada: 10-14, Grave: 15-21)' },
    { id: 'hamilton-ans', name: 'HARS (Escala de Hamilton para Ansiedad)', category: 'ansiedad', description: '14 ítems que evalúan ansiedad psíquica y somática.', scaleRange: '0-56 (Ausencia: 0-5, Leve: 6-14, Moderada: 15-25, Grave: 26-30, Muy grave: ≥31)' },
    { id: 'stai', name: 'STAI (Inventario de Ansiedad Estado-Rasgo)', category: 'ansiedad', description: 'Mide ansiedad como estado transitorio y como rasgo de personalidad. 40 ítems.', scaleRange: '20-80 por subescala (Estado y Rasgo)' },
    // Cognitivo
    { id: 'mmse', name: 'MMSE (Mini-Mental State Examination)', category: 'cognitivo', description: 'Cribado de deterioro cognitivo. Evalúa orientación, memoria, atención, lenguaje.', scaleRange: '0-30 (Normal: ≥27, Leve: 21-26, Moderado: 11-20, Grave: 0-10)' },
    { id: 'moca', name: 'MoCA (Montreal Cognitive Assessment)', category: 'cognitivo', description: 'Detección de deterioro cognitivo leve. Más sensible que MMSE.', scaleRange: '0-30 (Normal: ≥26)' },
    { id: 'act', name: 'Test del Reloj', category: 'cognitivo', description: 'Prueba de cribado visuoespacial y ejecutivo para deterioro cognitivo.', scaleRange: '0-10 (según método Cacho)' },
    // Personalidad
    { id: 'mmpi-2', name: 'MMPI-2 (Inventario Multifásico de Personalidad)', category: 'personalidad', description: 'Evaluación global de psicopatología y rasgos de personalidad. 567 ítems.', scaleRange: 'T-scores por escala clínica' },
    { id: 'scl-90', name: 'SCL-90-R (Symptom Checklist)', category: 'personalidad', description: '90 ítems que evalúan 9 dimensiones sintomáticas primarias.', scaleRange: 'Índice de Gravedad Global (GSI)' },
    { id: 'mcmi-iv', name: 'MCMI-IV (Inventario Clínico Multiaxial de Millon)', category: 'personalidad', description: 'Evaluación de trastornos de personalidad y síndromes clínicos.', scaleRange: 'Puntuaciones Base Rate (BR)' },
    // Funcionalidad
    { id: 'gaf', name: 'GAF / EEAG (Escala de Evaluación Global)', category: 'funcionalidad', description: 'Evalúa funcionamiento general psicológico, social y laboral del paciente.', scaleRange: '0-100 (Mayor puntaje = mejor funcionamiento)' },
    { id: 'whodas', name: 'WHODAS 2.0 (OMS)', category: 'funcionalidad', description: 'Evalúa discapacidad en 6 dominios. Instrumento de la OMS.', scaleRange: '0-100 (Mayor = más discapacidad)' },
    // Riesgo
    { id: 'columbia', name: 'C-SSRS (Escala Columbia de Riesgo Suicida)', category: 'riesgo', description: 'Evaluación estructurada de ideación y conducta suicida.', scaleRange: 'Clasificación categórica de riesgo' },
    { id: 'sad-persons', name: 'SAD PERSONS', category: 'riesgo', description: 'Escala de 10 factores de riesgo suicida para toma de decisiones clínicas.', scaleRange: '0-10 (Bajo: 0-2, Medio: 3-4, Alto: 5-6, Muy alto: 7-10)' },
    // Infantojuvenil
    { id: 'cdi-2', name: 'CDI-2 (Inventario de Depresión Infantil)', category: 'infantojuvenil', description: 'Evaluación de depresión en niños y adolescentes de 7-17 años.', scaleRange: 'T-scores (clínico: ≥65)' },
    { id: 'cbcl', name: 'CBCL (Child Behavior Checklist)', category: 'infantojuvenil', description: 'Evaluación de problemas conductuales y emocionales informados por padres.', scaleRange: 'T-scores por síndrome' },
    { id: 'conners', name: 'Conners (Escala de TDAH)', category: 'infantojuvenil', description: 'Evaluación de síntomas de TDAH en niños y adolescentes.', scaleRange: 'T-scores (Clínico: ≥65)' },
    // Otro
    { id: 'otro-custom', name: 'Instrumento personalizado', category: 'otro', description: 'Registra resultados de cualquier otro instrumento de evaluación.', scaleRange: 'Variable' },
  ];

  // Signals
  showEvalModal = signal(false);
  showEvalDetail = signal(false);
  evalDetailData = signal<any>(null);

  evalForm: any = this.emptyEvalForm();

  // Evaluations storage - persisted per patient in localStorage
  private getEvalsKey(patientId: string): string {
    return `clinica_evals_${patientId}`;
  }

  private loadPatientEvals(patientId: string): any[] {
    try {
      const raw = localStorage.getItem(this.getEvalsKey(patientId));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private savePatientEvals(patientId: string, evals: any[]): void {
    localStorage.setItem(this.getEvalsKey(patientId), JSON.stringify(evals));
  }

  // Computed - patient evaluations
  patientEvals = computed(() => {
    const p = this.selectedPatient();
    if (!p) return [];
    return this.loadPatientEvals(p.id).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  // Filtered instruments based on selected category
  filteredInstruments = computed(() => {
    const cat = this.evalForm.category;
    if (!cat) return this.psyInstruments;
    return this.psyInstruments.filter(i => i.category === cat);
  });

  selectedInstrument = computed(() => {
    const id = this.evalForm.instrumentId;
    if (!id) return null;
    return this.psyInstruments.find(i => i.id === id) || null;
  });

  openEvalModal(): void {
    this.evalForm = this.emptyEvalForm();
    this.showEvalModal.set(true);
  }

  onEvalCategoryChange(): void {
    this.evalForm.instrumentId = '';
  }

  onEvalInstrumentChange(): void {
    const inst = this.psyInstruments.find(i => i.id === this.evalForm.instrumentId);
    if (inst) {
      this.evalForm.category = inst.category;
    }
  }

  saveEval(): void {
    const p = this.selectedPatient();
    if (!p || !this.evalForm.instrumentId) return;

    const inst = this.psyInstruments.find(i => i.id === this.evalForm.instrumentId);
    const evaluation = {
      id: crypto.randomUUID(),
      patientId: p.id,
      instrumentId: this.evalForm.instrumentId,
      instrumentName: inst?.name || this.evalForm.instrumentId,
      category: this.evalForm.category || inst?.category || 'otro',
      score: this.evalForm.score !== '' ? Number(this.evalForm.score) : null,
      status: this.evalForm.status,
      interpretation: this.evalForm.interpretation,
      notes: this.evalForm.notes,
      date: new Date().toISOString(),
    };

    const evals = this.loadPatientEvals(p.id);
    evals.push(evaluation);
    this.savePatientEvals(p.id, evals);

    // Force reactivity by touching the signal
    this.selectedPatient.set({ ...p });

    this.showEvalModal.set(false);
    this.evalForm = this.emptyEvalForm();
  }

  viewEvalDetail(ev: any): void {
    this.evalDetailData.set(ev);
    this.showEvalDetail.set(true);
  }

  deleteEval(evalId: string): void {
    const p = this.selectedPatient();
    if (!p) return;
    const evals = this.loadPatientEvals(p.id).filter((e: any) => e.id !== evalId);
    this.savePatientEvals(p.id, evals);
    this.selectedPatient.set({ ...p });
  }

  getEvalCategoryIcon(category: string): string {
    const map: Record<string, string> = {
      depresion: '😔', ansiedad: '😰', cognitivo: '🧠', personalidad: '🪞',
      funcionalidad: '📊', riesgo: '🚨', infantojuvenil: '🧒', otro: '📋',
    };
    return map[category] || '🧪';
  }

  getEvalCategoryLabel(category: string): string {
    const map: Record<string, string> = {
      depresion: 'Depresión', ansiedad: 'Ansiedad', cognitivo: 'Cognitivo / Neuropsicológico',
      personalidad: 'Personalidad', funcionalidad: 'Funcionalidad Global',
      riesgo: 'Riesgo / Crisis', infantojuvenil: 'Infantojuvenil', otro: 'Otro',
    };
    return map[category] || category;
  }

  getEvalBannerClass(category: string): string {
    const map: Record<string, string> = {
      depresion: 'eval-bg-blue', ansiedad: 'eval-bg-amber', cognitivo: 'eval-bg-purple',
      personalidad: 'eval-bg-pink', funcionalidad: 'eval-bg-teal', riesgo: 'eval-bg-red',
      infantojuvenil: 'eval-bg-green', otro: 'eval-bg-slate',
    };
    return map[category] || 'eval-bg-slate';
  }

  private emptyEvalForm() {
    return {
      category: '', instrumentId: '', score: '', status: 'completada',
      interpretation: '', notes: '',
    };
  }
}
