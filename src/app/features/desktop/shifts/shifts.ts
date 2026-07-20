import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ShiftsService } from '../../../core/services/shifts.service';
import { UmIconComponent } from '../../../shared/components/um-icon/um-icon';
import {
  TeamMember,
  Shift,
  SHIFT_PRESETS,
  WEEKDAY_NAMES,
  WEEKDAY_FULL,
} from '../../../core/models/shifts.model';

@Component({
  selector: 'um-shifts',
  standalone: true,
  imports: [FormsModule, UmIconComponent],
  template: `
    <div class="shifts-page">

      <!-- ═══ Header ═══ -->
      <header class="page-header">
        <div class="header-top">
          <div>
            <h1>Gestión de Turnos</h1>
            <p class="header-subtitle">Organiza los horarios de tu equipo semana a semana.</p>
          </div>
          <button class="btn-primary" (click)="showMemberForm.set(!showMemberForm())">
            {{ showMemberForm() ? '✕ Cerrar' : '👤 Nuevo empleado' }}
          </button>
        </div>
      </header>

      <!-- ═══ Add Member Form ═══ -->
      @if (showMemberForm()) {
        <div class="form-card">
          <h3>{{ editingMemberId() ? '✏️ Editar empleado' : '👤 Nuevo empleado' }}</h3>
          <div class="form-row-3">
            <div class="form-field">
              <label>Nombre completo</label>
              <input type="text" [(ngModel)]="mName" placeholder="Ej: María López" />
            </div>
            <div class="form-field">
              <label>Cargo / Rol</label>
              <input type="text" [(ngModel)]="mRole" placeholder="Ej: Mesera" />
            </div>
            <div class="form-field">
              <label>Teléfono</label>
              <input type="tel" [(ngModel)]="mPhone" placeholder="+57 300..." />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-primary" [disabled]="!mName.trim()" (click)="saveMember()">
              {{ editingMemberId() ? 'Actualizar' : 'Agregar empleado' }}
            </button>
            @if (editingMemberId()) {
              <button class="btn-secondary" (click)="cancelMemberEdit()">Cancelar</button>
            }
          </div>
        </div>
      }

      <!-- ═══ Week Navigation ═══ -->
      <div class="week-nav">
        <button class="nav-btn" (click)="prevWeek()">‹</button>
        <span class="week-label">{{ weekLabel() }}</span>
        <button class="nav-btn" (click)="nextWeek()">›</button>
        <button class="btn-today" (click)="goToday()">Hoy</button>
      </div>

      <!-- ═══ Schedule Grid ═══ -->
      <div class="schedule-grid">

        <!-- Column Headers (days) -->
        <div class="grid-corner"></div>
        @for (day of weekDays(); track day.date) {
          <div class="grid-day-header" [class.today]="day.isToday">
            <span class="day-name">{{ day.name }}</span>
            <span class="day-date">{{ day.dayNum }}</span>
          </div>
        }

        <!-- Rows per member -->
        @for (member of svc.activeMembers(); track member.id) {
          <div class="grid-member">
            <div class="member-badge" [style.background]="member.color">
              {{ member.name.charAt(0) }}
            </div>
            <div class="member-info">
              <span class="member-name">{{ member.name }}</span>
              <span class="member-role">{{ member.role }}</span>
            </div>
            <span class="member-hours">{{ getMemberHours(member.id) }}h</span>
            <div class="member-actions">
              <button class="btn-icon-sm" title="Editar" (click)="editMember(member)">✏️</button>
              <button class="btn-icon-sm danger" title="Eliminar" (click)="svc.removeMember(member.id)"><um-icon name="trash" [size]="16"></um-icon></button>
            </div>
          </div>

          @for (day of weekDays(); track day.date) {
            <div
              class="grid-cell"
              [class.today]="day.isToday"
              (click)="openShiftModal(member, day.date)">

              @for (shift of getShiftsFor(member.id, day.date); track shift.id) {
                <div class="shift-chip" [style.background]="member.color + '18'" [style.border-color]="member.color + '40'" [style.color]="member.color">
                  <span class="shift-time">{{ shift.startTime }} – {{ shift.endTime }}</span>
                  @if (shift.note) {
                    <span class="shift-note">{{ shift.note }}</span>
                  }
                  <button class="shift-remove" (click)="removeShift($event, shift.id)">✕</button>
                </div>
              }

              @if (getShiftsFor(member.id, day.date).length === 0) {
                <span class="cell-plus">+</span>
              }
            </div>
          }
        }
      </div>

      @if (svc.activeMembers().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">👥</span>
          <p>No tienes empleados registrados.</p>
          <p class="empty-hint">Toca "👤 Nuevo empleado" para empezar.</p>
        </div>
      }

      <!-- ═══ Shift Modal ═══ -->
      @if (modalMember()) {
        <div class="modal-backdrop" (click)="modalMember.set(null)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Asignar turno — {{ modalMember()!.name }}</h3>
            <p class="modal-date">{{ getFullDayName(modalDate()) }}, {{ modalDate() }}</p>

            <div class="presets">
              <span class="presets-label">Turnos rápidos:</span>
              @for (p of presets; track p.label) {
                <button class="preset-chip" (click)="applyPreset(p)">
                  {{ p.label }} ({{ p.start }}–{{ p.end }})
                </button>
              }
            </div>

            <div class="form-row-2">
              <div class="form-field">
                <label>Hora inicio</label>
                <input type="time" [(ngModel)]="sStart" />
              </div>
              <div class="form-field">
                <label>Hora fin</label>
                <input type="time" [(ngModel)]="sEnd" />
              </div>
            </div>
            <div class="form-field" style="margin-bottom: 14px;">
              <label>Nota (opcional)</label>
              <input type="text" [(ngModel)]="sNote" placeholder="Ej: Cubre a Juan" />
            </div>

            <div class="modal-actions">
              <button class="btn-primary" [disabled]="!sStart || !sEnd" (click)="confirmShift()">
                Asignar turno
              </button>
              <button class="btn-secondary" (click)="modalMember.set(null)">Cancelar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: 'shifts.scss',
})
export class ShiftsComponent {
  svc = inject(ShiftsService);
  presets = SHIFT_PRESETS;

  // ─── Week state ─────────────────────────
  private weekOffset = signal(0);

  weekStart = computed(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    const monday = new Date(now);
    monday.setDate(monday.getDate() + diff + this.weekOffset() * 7);
    return monday.toISOString().split('T')[0];
  });

  weekLabel = computed(() => {
    const start = new Date(this.weekStart() + 'T12:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('es-CO', opts)} — ${end.toLocaleDateString('es-CO', opts)}, ${end.getFullYear()}`;
  });

  weekDays = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    const start = new Date(this.weekStart() + 'T12:00:00');
    return WEEKDAY_NAMES.map((name, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const date = d.toISOString().split('T')[0];
      return {
        name,
        date,
        dayNum: d.getDate(),
        isToday: date === today,
      };
    });
  });

  prevWeek(): void { this.weekOffset.update(v => v - 1); }
  nextWeek(): void { this.weekOffset.update(v => v + 1); }
  goToday(): void { this.weekOffset.set(0); }

  // ─── Member form ────────────────────────
  showMemberForm = signal(false);
  editingMemberId = signal<string | null>(null);
  mName = '';
  mRole = '';
  mPhone = '';

  saveMember(): void {
    if (!this.mName.trim()) return;
    if (this.editingMemberId()) {
      this.svc.updateMember(this.editingMemberId()!, {
        name: this.mName.trim(),
        role: this.mRole.trim(),
        phone: this.mPhone.trim(),
      });
      this.editingMemberId.set(null);
    } else {
      this.svc.addMember({
        name: this.mName.trim(),
        role: this.mRole.trim(),
        phone: this.mPhone.trim(),
      });
    }
    this.mName = '';
    this.mRole = '';
    this.mPhone = '';
    this.showMemberForm.set(false);
  }

  editMember(m: TeamMember): void {
    this.mName = m.name;
    this.mRole = m.role;
    this.mPhone = m.phone;
    this.editingMemberId.set(m.id);
    this.showMemberForm.set(true);
  }

  cancelMemberEdit(): void {
    this.editingMemberId.set(null);
    this.mName = '';
    this.mRole = '';
    this.mPhone = '';
    this.showMemberForm.set(false);
  }

  // ─── Shift modal ────────────────────────
  modalMember = signal<TeamMember | null>(null);
  modalDate = signal('');
  sStart = '08:00';
  sEnd = '18:00';
  sNote = '';

  openShiftModal(member: TeamMember, date: string): void {
    this.modalMember.set(member);
    this.modalDate.set(date);
    this.sStart = '08:00';
    this.sEnd = '18:00';
    this.sNote = '';
  }

  applyPreset(p: { start: string; end: string }): void {
    this.sStart = p.start;
    this.sEnd = p.end;
  }

  confirmShift(): void {
    const member = this.modalMember();
    if (!member || !this.sStart || !this.sEnd) return;
    this.svc.addShift({
      memberId: member.id,
      memberName: member.name,
      date: this.modalDate(),
      startTime: this.sStart,
      endTime: this.sEnd,
      note: this.sNote.trim(),
    });
    this.modalMember.set(null);
  }

  removeShift(event: Event, id: string): void {
    event.stopPropagation();
    this.svc.removeShift(id);
  }

  // ─── Helpers ────────────────────────────

  getShiftsFor(memberId: string, date: string): Shift[] {
    return this.svc.shifts().filter(s => s.memberId === memberId && s.date === date);
  }

  getMemberHours(memberId: string): string {
    return this.svc.getMemberHoursForWeek(memberId, this.weekStart()).toFixed(0);
  }

  getFullDayName(date: string): string {
    if (!date) return '';
    const d = new Date(date + 'T12:00:00');
    const dayIndex = (d.getDay() + 6) % 7; // 0=Mon
    return WEEKDAY_FULL[dayIndex] || '';
  }
}
