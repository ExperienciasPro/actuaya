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
            <button class="board-toggle-btn" [class.active]="boardView() === 'tasks'" (click)="boardView.set('tasks')">⚡ Todas las Tareas</button>
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

      <!-- Consolidated Tasks View -->
      @if (boardView() === 'tasks') {
        <div class="tasks-view-section animate-fadeInUp stagger-1">
          <!-- Filters Header -->
          <div class="tasks-filters-bar">
            <div class="filter-group search">
              <input type="text" class="filter-input" [ngModel]="taskSearchQuery()" (ngModelChange)="taskSearchQuery.set($event)" placeholder="🔍 Buscar tarea..." />
            </div>
            
            <div class="filter-group">
              <select class="filter-select" [ngModel]="taskSelectedProject()" (ngModelChange)="taskSelectedProject.set($event)">
                <option value="">📁 Todos los Proyectos</option>
                @for (p of projects(); track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>

            <div class="filter-group">
              <select class="filter-select" [ngModel]="taskSelectedPriority()" (ngModelChange)="taskSelectedPriority.set($event)">
                <option value="">⚡ Todas las Prioridades</option>
                <option value="high">🔴 Alta</option>
                <option value="medium">🟡 Media</option>
                <option value="low">🟢 Baja</option>
              </select>
            </div>

            <div class="filter-group">
              <select class="filter-select" [ngModel]="taskSelectedStatus()" (ngModelChange)="taskSelectedStatus.set($event)">
                <option value="all">🔄 Todos los Estados</option>
                <option value="active">⏳ Pendientes</option>
                <option value="completed">✅ Completadas</option>
              </select>
            </div>

            <div class="filter-group">
              <select class="filter-select" [ngModel]="taskSortBy()" (ngModelChange)="taskSortBy.set($event)">
                <option value="priority">🔥 Importancia</option>
                <option value="oldest">📅 Más antiguas</option>
                <option value="newest">🕒 Más nuevas</option>
                <option value="project">📁 Por Proyecto</option>
              </select>
            </div>
          </div>

          <!-- Tasks List -->
          <div class="tasks-consolidated-list">
            @for (item of filteredTasks(); track item.task.id; let i = $index) {
              <div class="task-item-row" [class.completed]="item.task.completed" [style.animation-delay.ms]="i * 20">
                <label class="task-checkbox-container">
                  <input type="checkbox" [checked]="item.task.completed" (change)="toggleTask(item.projectId, item.task.id)" />
                  <span class="task-custom-checkbox"></span>
                </label>
                
                <div class="task-item-content">
                  <div class="task-item-main">
                    <span class="task-item-title">{{ item.task.title }}</span>
                    @if (item.task.description) {
                      <span class="task-item-desc">{{ item.task.description }}</span>
                    }
                  </div>
                  
                  <div class="task-item-meta">
                    <a class="task-project-badge" [routerLink]="['/d/projects', item.projectId]" [style.border-color]="item.projectColor">
                      <span class="project-dot" [style.background]="item.projectColor"></span>
                      {{ item.projectName }}
                    </a>

                    @if (item.task.dueDate) {
                      <span class="task-date-badge" [class.overdue]="isOverdue(item.task.dueDate) && !item.task.completed">
                        📅 {{ formatDate(item.task.dueDate) }}
                      </span>
                    }

                    <span class="task-priority-badge" [class]="item.task.priority">
                      {{ item.task.priority === 'high' ? 'Alta' : item.task.priority === 'medium' ? 'Media' : 'Baja' }}
                    </span>

                    @if (item.task.assignee) {
                      <span class="task-assignee-avatar" [style.background]="item.leaderColor || '#8b95a9'" [title]="'Asignado a: ' + item.task.assignee">
                        {{ item.leaderAvatar || item.task.assignee.slice(0,2).toUpperCase() }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <um-empty-state
                icon="⚡"
                title="No se encontraron tareas"
                subtitle="Prueba cambiando los filtros o crea nuevas tareas dentro de tus proyectos."
              />
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
        [open]="openDeleteDialog()"
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
  boardView = signal<'list' | 'calendar' | 'tasks'>('list');

  // Tasks view filter signals
  taskSearchQuery = signal('');
  taskSelectedProject = signal('');
  taskSelectedPriority = signal('');
  taskSelectedStatus = signal('all'); // all, active, completed
  taskSortBy = signal('priority'); // priority, oldest, newest, project

  // Create modal
  showCreateModal = signal(false);
  newName = '';
  newDesc = '';

  // Delete
  showDelete = signal(false);
  deletingProject = signal<Project | null>(null);

  // Calendar state
  calOffset = signal(0);

  // Getter for the confirm dialog since open property name mismatch might exist
  openDeleteDialog = computed(() => this.showDelete());

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

  // Consolidated all tasks
  allTasks = computed(() => {
    const allProjects = this.projects();
    const list: { task: ProjectTask; projectId: string; projectName: string; projectStatus: string; projectColor: string; leaderAvatar?: string; leaderColor?: string }[] = [];
    for (const p of allProjects) {
      for (const t of p.tasks) {
        const member = (p.members || []).find(m => m.name === t.assignee);
        list.push({
          task: t,
          projectId: p.id,
          projectName: p.name,
          projectStatus: p.status,
          projectColor: this.getStatusColor(p.status),
          leaderAvatar: member?.avatar,
          leaderColor: member?.color
        });
      }
    }
    return list;
  });

  // Filtered & sorted tasks
  filteredTasks = computed(() => {
    let list = this.allTasks();
    const query = this.taskSearchQuery().toLowerCase().trim();
    const projectId = this.taskSelectedProject();
    const priority = this.taskSelectedPriority();
    const status = this.taskSelectedStatus();
    const sortBy = this.taskSortBy();

    // Filter by search query
    if (query) {
      list = list.filter(t => 
        t.task.title.toLowerCase().includes(query) || 
        (t.task.description || '').toLowerCase().includes(query)
      );
    }

    // Filter by project
    if (projectId) {
      list = list.filter(t => t.projectId === projectId);
    }

    // Filter by priority
    if (priority) {
      list = list.filter(t => t.task.priority === priority);
    }

    // Filter by status
    if (status === 'active') {
      list = list.filter(t => !t.task.completed);
    } else if (status === 'completed') {
      list = list.filter(t => t.task.completed);
    }

    // Sort
    if (sortBy === 'priority') {
      list = [...list].sort((a, b) => this.getPriorityWeight(b.task.priority) - this.getPriorityWeight(a.task.priority));
    } else if (sortBy === 'oldest') {
      list = [...list].sort((a, b) => new Date(a.task.createdAt || 0).getTime() - new Date(b.task.createdAt || 0).getTime());
    } else if (sortBy === 'newest') {
      list = [...list].sort((a, b) => new Date(b.task.createdAt || 0).getTime() - new Date(a.task.createdAt || 0).getTime());
    } else if (sortBy === 'project') {
      list = [...list].sort((a, b) => a.projectName.localeCompare(b.projectName));
    }

    return list;
  });

  private getPriorityWeight(priority: string): number {
    const weights: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1
    };
    return weights[priority] || 0;
  }

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

  toggleTask(projectId: string, taskId: string): void {
    this.projectService.toggleTask(projectId, taskId);
  }

  isOverdue(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    return dueDate < today;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return date.toLocaleDateString('es-ES', options);
  }
}
