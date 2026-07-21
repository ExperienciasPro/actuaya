import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { EducationService, EDUCATION_PROGRAM_TYPES, EducationProgramType } from '../../../../core/services/education.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'um-education-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="admin-page">
      <div class="page-header animate-fadeInUp">
        <div class="header-titles">
          <h1>🎓 Proyectos Educativos</h1>
          <p class="subtitle">Gestiona programas, inscripciones y finanzas.</p>
          <div class="header-actions">
            <a routerLink="/reportes/educacion" target="_blank" class="btn-share">
              🔗 Compartir Reporte Público
            </a>
            
            <div class="logo-upload">
              <span class="logo-label">Logo tipo personalizado del reporte:</span>
              <div class="logo-preview-box">
                @if (companyLogo()) {
                  <img [src]="companyLogo()" alt="Logo" class="mini-logo" />
                  <button type="button" class="btn-remove-logo" (click)="removeLogo()" title="Eliminar">🗑️</button>
                } @else {
                  <span class="no-logo">Sin logo</span>
                }
                <label class="btn-upload-logo">
                  <span>🖼️ Subir</span>
                  <input type="file" accept="image/*" (change)="onLogoSelected($event)" style="display:none" />
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="header-totals">
          <div class="total-badge green">
            <span class="total-label">Ingresos Totales</span>
            <span class="total-value">\${{ educationService.totalIncome() | number:'1.0-0' }} COP</span>
          </div>
          <div class="total-badge red">
            <span class="total-label">Gastos Totales</span>
            <span class="total-value">\${{ educationService.totalExpenses() | number:'1.0-0' }} COP</span>
          </div>
          <div class="total-badge" [class.positive]="educationService.netProfit() >= 0" [class.negative]="educationService.netProfit() < 0">
            <span class="total-label">Rentabilidad Neta</span>
            <span class="total-value">\${{ educationService.netProfit() | number:'1.0-0' }} COP</span>
          </div>
        </div>
      </div>

      <!-- Add Form -->
      <div class="form-card animate-fadeInUp stagger-1">
        <h3>Nuevo Proyecto Educativo</h3>
        <form class="inline-form" (ngSubmit)="addProgram()">
          <div class="form-field">
            <label>Tipo</label>
            <select [(ngModel)]="newType" name="type" required>
              <option value="">Seleccionar...</option>
              @for (t of programTypes; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </div>
          <div class="form-field flex-2">
            <label>Nombre del Programa</label>
            <input type="text" [(ngModel)]="newName" name="name" placeholder="Ej. Diplomado Liderazgo" required />
          </div>
          <div class="form-field flex-2">
            <label>Descripción</label>
            <input type="text" [(ngModel)]="newDesc" name="desc" placeholder="Breve descripción (opcional)" />
          </div>
          <div class="form-field">
            <label>Sitio Web</label>
            <input type="url" [(ngModel)]="newWebsite" name="website" placeholder="https://..." />
          </div>
          <button type="submit" class="btn-add" [disabled]="!canSubmit">+ Crear</button>
        </form>
      </div>

      <!-- Program Grid -->
      <div class="program-groups animate-fadeInUp stagger-2">
        @if (groupedPrograms().length) {
          @for (group of groupedPrograms(); track group.month) {
            <div class="month-group">
              <h2 class="month-header">{{ group.month }}</h2>
              <div class="program-grid">
                @for (prog of group.progs; track prog.id) {
                  <a class="program-card" [routerLink]="['/d/admin/education', prog.id]">
                    <div class="prog-header">
                      <span class="prog-type tag-{{ prog.type }}">{{ getTypeLabel(prog.type) }}</span>
                      <span class="prog-status" [class.completed]="prog.status === 'completed'">
                        {{ prog.status === 'active' ? 'Activo' : 'Finalizado' }}
                      </span>
                    </div>
                    <h3 class="prog-name">{{ prog.name }}</h3>
                    <p class="prog-desc">{{ prog.description || 'Sin descripción' }}</p>

                    <div class="prog-stats">
                      <div class="stat-col">
                        <span class="stat-lbl">Ingresos</span>
                        <span class="stat-val">\${{ getStats(prog.id)?.income | number:'1.0-0' }}</span>
                      </div>
                      <div class="stat-col">
                        <span class="stat-lbl">Gastos</span>
                        <span class="stat-val">\${{ getStats(prog.id)?.expense | number:'1.0-0' }}</span>
                      </div>
                      <div class="stat-col">
                        <span class="stat-lbl">Ganancia</span>
                        <span class="stat-val profit" [class.loss]="(getStats(prog.id)?.income || 0) < (getStats(prog.id)?.expense || 0)">
                          \${{ ((getStats(prog.id)?.income || 0) - (getStats(prog.id)?.expense || 0)) | number:'1.0-0' }}
                        </span>
                      </div>
                      <div class="stat-col">
                        <span class="stat-lbl">Inscritos</span>
                        <span class="stat-val">{{ getStats(prog.id)?.attendees || 0 }}</span>
                      </div>
                    </div>
                  </a>
                }
              </div>
            </div>
          }
        } @else {
          <div class="empty-state">No hay proyectos educativos registrados. Crea el primero arriba.</div>
        }
      </div>
    </div>
  `,
  styleUrl: 'education-dashboard.scss'
})
export class EducationDashboardComponent {
  educationService = inject(EducationService);
  userService = inject(UserService);
  programTypes = EDUCATION_PROGRAM_TYPES;

  companyLogo = computed(() => this.userService.profile()?.companyLogo || '');

  newType: EducationProgramType | '' = '';
  newName = '';
  newDesc = '';
  newWebsite = '';

  groupedPrograms = computed(() => {
    const programs = [...this.educationService.programs()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const groups: { month: string; progs: any[] }[] = [];
    
    for (const p of programs) {
      const d = new Date(p.createdAt);
      const month = d.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      const key = month.charAt(0).toUpperCase() + month.slice(1);
      
      let group = groups.find(g => g.month === key);
      if (!group) {
        group = { month: key, progs: [] };
        groups.push(group);
      }
      group.progs.push(p);
    }
    return groups;
  });

  get canSubmit(): boolean {
    return !!this.newType && this.newName.trim().length > 0;
  }

  addProgram() {
    if (!this.canSubmit) return;
    this.educationService.addProgram({
      name: this.newName.trim(),
      type: this.newType as EducationProgramType,
      status: 'active',
      description: this.newDesc.trim(),
      website: this.newWebsite.trim() || undefined,
    });
    this.newType = '';
    this.newName = '';
    this.newDesc = '';
    this.newWebsite = '';
  }

  async onLogoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('❌ El logo debe ser menor a 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const logoData = e.target?.result as string;
        await this.userService.saveProfile({ companyLogo: logoData });
      };
      reader.readAsDataURL(file);
    }
  }

  async removeLogo() {
    await this.userService.saveProfile({ companyLogo: '' });
  }

  getTypeLabel(type: string): string {
    return this.programTypes.find(t => t.value === type)?.label || type;
  }

  getStats(programId: string) {
    return this.educationService.programStats().get(programId);
  }
}
