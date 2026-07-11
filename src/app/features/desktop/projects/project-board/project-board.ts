import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../../core/services/project.service';
import { Project, TeamMember, ProjectTask } from '../../../../core/models/project.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'um-project-board',
  standalone: true,
  imports: [RouterLink, FormsModule, EmptyStateComponent, ConfirmDialogComponent],
  template: `
    <div class="projects-page">
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <h1>Administrador de Proyectos</h1>
          <p class="header-subtitle">{{ projects().length }} proyectos · {{ activeCount() }} activos</p>
        </div>
        <div class="header-actions">
          <div class="board-view-toggle">
            <button class="board-toggle-btn" [class.active]="boardView() === 'list'" (click)="boardView.set('list')">📋 Lista</button>
            <button class="board-toggle-btn" [class.active]="boardView() === 'calendar'" (click)="boardView.set('calendar')">📅 Calendario</button>
          </div>
          <button class="btn-primary" (click)="showCreateModal.set(true)">+ Nuevo Proyecto</button>
        </div>
      </div>

      <!-- Project List -->
      @if (boardView() === 'list') {
        <div class="project-list animate-fadeInUp stagger-1">
          @for (project of projects(); track project.id; let i = $index) {
            <a class="project-row" [routerLink]="['/d/projects', project.id]"
               [style.animation-delay.ms]="i * 40">
              <div class="row-left">
                <div class="row-color" [style.background]="getStatusColor(project.status)"></div>
                <div class="row-info">
                  <span class="row-name">{{ project.name }}</span>
                  @if (project.description) {
                    <span class="row-desc">{{ project.description.slice(0, 80) }}{{ project.description.length > 80 ? '...' : '' }}</span>
                  }
                </div>
              </div>
              <div class="row-stats">
                @if (getLeaderOf(project); as leader) {
                  <div class="row-leader-badge" [title]="'Líder: ' + leader.name">
                    <span class="row-leader-avatar" [style.background]="leader.color">{{ leader.avatar }}</span>
                  </div>
                }
                <div class="task-stat">
                  <span class="task-done">{{ getCompletedTasks(project) }}</span>
                  <span class="task-sep">/</span>
                  <span class="task-total">{{ project.tasks?.length || 0 }}</span>
                  <span class="task-label">tareas</span>
                </div>
                <div class="row-progress">
                  <div class="progress-track">
                    <div class="progress-fill" [style.width.%]="project.progress"
                         [style.background]="getStatusColor(project.status)"></div>
                  </div>
                  <span class="progress-pct">{{ project.progress }}%</span>
                </div>
              </div>
              <div class="row-actions">
                <button class="delete-btn" (click)="confirmDelete($event, project)" title="Eliminar">×</button>
              </div>
            </a>
          }
        </div>
      } @else if (boardView() === 'list' && !projects().length) {
        <um-empty-state
          icon="📋"
          title="Sin proyectos"
          subtitle="Crea tu primer proyecto para organizar tus tareas."
        >
          <button class="btn-primary" (click)="showCreateModal.set(true)">+ Crear proyecto</button>
        </um-empty-state>
      }

      <!-- General Calendar View -->
      @if (boardView() === 'calendar') {
        <div class="gen-cal-section animate-fadeInUp stagger-1">
          <div class="gen-cal-nav">
            <button class="gen-cal-nav-btn" (click)="calOffset.update(v => v - 1)">‹</button>
            <span class="gen-cal-month">{{ generalCalMonthLabel() }}</span>
            <button class="gen-cal-nav-btn" (click)="calOffset.update(v => v + 1)">›</button>
            <button class="gen-cal-today" (click)="calOffset.set(0)">Hoy</button>
          </div>

          <!-- Legend -->
          <div class="gen-cal-legend">
            @for (p of projects(); track p.id) {
              <div class="legend-chip">
                <span class="legend-color" [style.background]="getStatusColor(p.status)"></span>
                <span>{{ p.name }}</span>
              </div>
            }
          </div>

          <div class="gen-cal-grid">
            <div class="gen-cal-hdr">Lun</div>
            <div class="gen-cal-hdr">Mar</div>
            <div class="gen-cal-hdr">Mié</div>
            <div class="gen-cal-hdr">Jue</div>
            <div class="gen-cal-hdr">Vie</div>
            <div class="gen-cal-hdr">Sáb</div>
            <div class="gen-cal-hdr">Dom</div>
            @for (cell of generalCalCells(); track $index) {
              <div class="gen-cal-cell" [class.empty]="!cell" [class.today]="cell?.isToday">
                @if (cell) {
                  <span class="gen-cal-date">{{ cell.day }}</span>
                  @if (cell.tasks.length) {
                    <div class="gen-cal-tasks">
                      @for (t of cell.tasks.slice(0, 4); track t.task.id) {
                        <div class="gen-cal-chip"
                          [style.border-left-color]="getStatusColor(t.projectStatus)"
                          [class.completed]="t.task.completed"
                          (click)="navigateToProject(t.projectId)">
                          @if (t.task.assignee) {
                            <span class="gen-chip-avatar" [style.background]="t.memberColor">{{ t.memberAvatar }}</span>
                          }
                          <span class="gen-chip-title">{{ t.task.title }}</span>
                          <span class="gen-chip-project">{{ t.projectName }}</span>
                        </div>
                      }
                      @if (cell.tasks.length > 4) {
                        <span class="gen-cal-more">+{{ cell.tasks.length - 4 }} más</span>
                      }
                    </div>
                  }
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Create Modal (simplified) -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="showCreateModal.set(false)">
          <div class="modal-box animate-fadeInUp" (click)="$event.stopPropagation()">
            <h3>Nuevo Proyecto</h3>
            <div class="modal-field">
              <label>Nombre *</label>
              <input class="modal-input" [(ngModel)]="newName" placeholder="Ej: Lanzamiento Q2"
                (keydown.enter)="createProject()" autofocus />
            </div>
            <div class="modal-field">
              <label>Descripción</label>
              <textarea class="modal-input textarea" [(ngModel)]="newDesc"
                placeholder="Describe el proyecto..." rows="2"></textarea>
            </div>

            <div class="modal-actions">
              <button class="btn-ghost" (click)="showCreateModal.set(false)">Cancelar</button>
              <button class="btn-primary" (click)="createProject()" [disabled]="newName.trim().length < 3">
                Crear
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Dialog -->
      <um-confirm-dialog
        [open]="showDelete()"
        title="Eliminar proyecto"
        message="Se eliminará el proyecto y todos sus datos."
        icon="🗑️"
        confirmLabel="Eliminar"
        variant="danger"
        (confirmed)="executeDelete()"
        (cancelled)="showDelete.set(false)"
      />
    </div>
  `,
  styleUrl: 'project-board.scss',
})
export class ProjectBoardComponent {
  private projectService = inject(ProjectService);
  private router = inject(Router);
  projects = this.projectService.projects;
  activeCount = computed(() => this.projects().filter(p => p.status === 'active').length);

  // View mode
  boardView = signal<'list' | 'calendar'>('list');

  // Create modal
  showCreateModal = signal(false);
  newName = '';
  newDesc = '';

  // Delete
  showDelete = signal(false);
  deletingProject = signal<Project | null>(null);

  // Calendar state
  calOffset = signal(0);

  generalCalMonthLabel = computed(() => {
    const now = new Date();
    now.setDate(1);
    now.setMonth(now.getMonth() + this.calOffset());
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  });

  generalCalCells = computed(() => {
    const allProjects = this.projects();
    const now = new Date();
    now.setDate(1);
    now.setMonth(now.getMonth() + this.calOffset());
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    type CalTask = { task: ProjectTask; projectId: string; projectName: string; projectStatus: string; memberColor: string; memberAvatar: string };
    const cells: (null | { date: string; day: number; isToday: boolean; tasks: CalTask[] })[] = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const tasks: CalTask[] = [];
      for (const p of allProjects) {
        for (const t of p.tasks) {
          if (t.dueDate === dateStr) {
            const member = (p.members || []).find(m => m.name === t.assignee);
            tasks.push({
              task: t,
              projectId: p.id,
              projectName: p.name,
              projectStatus: p.status,
              memberColor: member?.color || '#8b95a9',
              memberAvatar: member?.avatar || (t.assignee ? t.assignee.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : ''),
            });
          }
        }
      }
      cells.push({ date: dateStr, day: d, isToday: dateStr === todayStr, tasks });
    }
    return cells;
  });

  navigateToProject(projectId: string): void {
    this.router.navigate(['/d/projects', projectId]);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      planning: '#8b95a9',
      active: '#6c5ce7',
      on_hold: '#feca57',
      completed: '#00cec9',
      cancelled: '#d63031',
    };
    return colors[status] || '#8b95a9';
  }

  getCompletedTasks(project: Project): number {
    return (project.tasks || []).filter(t => t.completed).length;
  }

  getLeaderOf(project: Project): TeamMember | null {
    if (!project.leaderId || !project.members) return null;
    return project.members.find(m => m.id === project.leaderId) || null;
  }

  createProject(): void {
    if (this.newName.trim().length < 3) return;
    this.projectService.create({
      name: this.newName,
      description: this.newDesc,
    });
    this.newName = '';
    this.newDesc = '';
    this.showCreateModal.set(false);
  }

  confirmDelete(event: Event, project: Project): void {
    event.preventDefault();
    event.stopPropagation();
    this.deletingProject.set(project);
    this.showDelete.set(true);
  }

  executeDelete(): void {
    const p = this.deletingProject();
    if (p) this.projectService.delete(p.id);
    this.showDelete.set(false);
  }
}
