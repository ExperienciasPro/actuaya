import { Component, inject, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../../core/services/project.service';
import { ProjectTask, ProjectSection, TeamMember } from '../../../../core/models/project.model';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'um-project-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, ProgressRingComponent, ConfirmDialogComponent],
  template: `
    <div class="asana-workspace">
      @if (project(); as p) {
        <!-- ═══ Top Bar ═══ -->
        <div class="workspace-topbar animate-fadeInUp">
          <div class="topbar-left">
            <a class="back-link" routerLink="/d/projects">← Administrador de Proyectos</a>
            <h1 class="project-title">{{ p.name }}</h1>
            @if (p.description) {
              <p class="project-desc">{{ p.description }}</p>
            }
            @if (getLeader(); as leader) {
              <div class="leader-badge">
                <span class="leader-avatar" [style.background]="leader.color">{{ leader.avatar }}</span>
                <span class="leader-label">Líder: <strong>{{ leader.name }}</strong></span>
              </div>
            }
          </div>
          <div class="topbar-right">
            <div class="progress-pill">
              <um-progress-ring [value]="p.progress" [size]="36" [strokeWidth]="3" color="#6c5ce7" />
              <span class="progress-text">{{ p.progress }}%</span>
            </div>
          </div>
        </div>

        <!-- ═══ View Toggle + Actions ═══ -->
        <div class="workspace-toolbar animate-fadeInUp stagger-1">
          <div class="view-toggle">
            <button class="toggle-btn" [class.active]="viewMode() === 'kanban'" (click)="viewMode.set('kanban')">📋 Kanban</button>
            <button class="toggle-btn" [class.active]="viewMode() === 'calendar'" (click)="viewMode.set('calendar')">📅 Calendario</button>
          </div>
          <div class="toolbar-actions">
            <button class="toolbar-btn team-btn" (click)="showTeamPanel.set(true)">
              <span class="team-avatars-mini">
                @for (m of (p.members || []).slice(0, 3); track m.id) {
                  <span class="avatar-mini" [style.background]="m.color">{{ m.avatar }}</span>
                }
              </span>
              👥 Equipo del proyecto ({{ (p.members || []).length }})
            </button>
            <button class="toolbar-btn" (click)="showAddSection.set(true)">+ Sección</button>
            <button class="toolbar-btn danger" (click)="showDeleteProject.set(true)">🗑️</button>
          </div>
        </div>

        <!-- ═══ Stats Bar ═══ -->
        <div class="stats-bar animate-fadeInUp stagger-1">
          <div class="stat-chip">
            <span class="stat-num">{{ p.tasks.length }}</span>
            <span class="stat-lbl">Total</span>
          </div>
          <div class="stat-chip done">
            <span class="stat-num">{{ completedCount() }}</span>
            <span class="stat-lbl">Hechas</span>
          </div>
          <div class="stat-chip pending">
            <span class="stat-num">{{ pendingCount() }}</span>
            <span class="stat-lbl">Pendientes</span>
          </div>
        </div>

        <!-- ═══ Calendar View ═══ -->
        @if (viewMode() === 'calendar') {
          <div class="calendar-section animate-fadeInUp stagger-2">
            <div class="cal-nav">
              <button class="cal-nav-btn" (click)="calMonthOffset.update(v => v - 1)">‹</button>
              <span class="cal-month-label">{{ calMonthLabel() }}</span>
              <button class="cal-nav-btn" (click)="calMonthOffset.update(v => v + 1)">›</button>
              <button class="cal-today-btn" (click)="calMonthOffset.set(0)">Hoy</button>
            </div>
            <div class="cal-grid">
              <div class="cal-header-day">Lun</div>
              <div class="cal-header-day">Mar</div>
              <div class="cal-header-day">Mié</div>
              <div class="cal-header-day">Jue</div>
              <div class="cal-header-day">Vie</div>
              <div class="cal-header-day">Sáb</div>
              <div class="cal-header-day">Dom</div>
              @for (cell of calendarCells(); track $index) {
                <div class="cal-cell" [class.empty]="!cell" [class.today]="cell?.isToday"
                  (click)="cell && createTaskOnDate(cell.date, p.sections[0]?.id || '')">
                  @if (cell) {
                    <span class="cal-date">{{ cell.day }}</span>
                    @if (cell.tasks.length) {
                      <div class="cal-tasks">
                        @for (t of cell.tasks.slice(0, 3); track t.id) {
                          <div class="cal-task-chip" [class.completed]="t.completed"
                            (click)="$event.stopPropagation(); openTaskPanel(t)">
                            @if (t.assignee) {
                              <span class="cal-chip-avatar" [style.background]="getMemberColor(t.assignee)">{{ getMemberAvatar(t.assignee) }}</span>
                            }
                            <span class="cal-chip-title">{{ t.title }}</span>
                          </div>
                        }
                        @if (cell.tasks.length > 3) {
                          <span class="cal-more">+{{ cell.tasks.length - 3 }} más</span>
                        }
                      </div>
                    }
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- ═══ Board View (Kanban) ═══ -->
        @if (viewMode() === 'kanban') {
          <div class="board-view animate-fadeInUp stagger-2">
            @for (section of p.sections; track section.id) {
              <div class="board-column">
                <div class="board-col-header">
                  <span class="section-dot" [style.background]="section.color"></span>
                  <span class="col-name">{{ section.name }}</span>
                  <span class="col-count">{{ getTasksBySection(section.id).length }}</span>
                  <button class="section-del" (click)="confirmDeleteSection(section)" title="Eliminar sección">×</button>
                </div>
                <div class="board-col-body"
                  [class.drag-over]="dragOverSection() === section.id"
                  (dragover)="onDragOver($event, section.id)"
                  (dragleave)="onDragLeave($event)"
                  (drop)="onDrop($event, section.id)">
                  @for (task of getTasksBySection(section.id); track task.id; let ti = $index) {
                    <div class="board-card" [class.completed]="task.completed"
                      [class.dragging]="draggingTaskId() === task.id"
                      draggable="true"
                      (dragstart)="onDragStart($event, task, section.id)"
                      (dragend)="onDragEnd()"
                      (dragover)="onCardDragOver($event, ti, section.id)"
                      (click)="openTaskPanel(task)">
                      <div class="board-card-top">
                        <span class="drag-handle" (mousedown)="$event.stopPropagation()">≡</span>
                        <button class="task-check small" [class.checked]="task.completed"
                          (click)="toggleComplete($event, task)">
                          @if (task.completed) { ✓ }
                        </button>
                        <span class="board-card-title">{{ task.title }}</span>
                      </div>
                      <div class="board-card-meta">
                        @if (task.assignee) {
                          <span class="board-assignee" [style.background]="getMemberColor(task.assignee)"
                            [title]="task.assignee">{{ getMemberAvatar(task.assignee) }}</span>
                          <span class="board-assignee-name">{{ task.assignee }}</span>
                        }
                        <span class="board-meta-spacer"></span>
                        @if (task.dueDate) {
                          <span class="board-due" [class.overdue]="isOverdue(task)">📅 {{ formatDate(task.dueDate) }}</span>
                        }
                        <span class="task-priority-dot" [class]="task.priority"></span>
                      </div>
                    </div>
                  }
                  @if (!getTasksBySection(section.id).length && dragOverSection() !== section.id) {
                    <div class="empty-col-hint">Arrastra tareas aquí</div>
                  }
                  <!-- Add task button -->
                  <div class="board-add-row">
                    <button class="add-task-trigger board" (click)="createAndOpenTask(section.id)">+ Tarea</button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- ═══ Add Section Modal ═══ -->
        @if (showAddSection()) {
          <div class="modal-overlay" (click)="showAddSection.set(false)">
            <div class="modal-box animate-fadeInUp" (click)="$event.stopPropagation()">
              <h3>Nueva Sección</h3>
              <input class="modal-input" [(ngModel)]="newSectionName"
                placeholder="Nombre de la sección" (keydown.enter)="submitNewSection()" autofocus />
              <div class="modal-actions">
                <button class="btn-ghost" (click)="showAddSection.set(false)">Cancelar</button>
                <button class="btn-primary" (click)="submitNewSection()" [disabled]="!newSectionName.trim()">Crear</button>
              </div>
            </div>
          </div>
        }

        <!-- ═══ Task Detail Panel ═══ -->
        @if (selectedTask(); as task) {
          <div class="panel-overlay" (click)="closeTaskPanel()">
            <div class="task-panel animate-slideIn" (click)="$event.stopPropagation()">
              <div class="panel-header">
                <h3>Detalle de tarea</h3>
                <button class="panel-close" (click)="closeTaskPanel()">×</button>
              </div>
              <div class="panel-body">
                <div class="panel-field">
                  <label>Título</label>
                  <input class="panel-input" [value]="task.title"
                    (change)="updateTaskField(task.id, 'title', $any($event.target).value)" />
                </div>
                <div class="panel-field">
                  <label>Descripción</label>
                  <textarea class="panel-input textarea" [value]="task.description || ''"
                    (change)="updateTaskField(task.id, 'description', $any($event.target).value)"
                    placeholder="Agrega una descripción..." rows="3"></textarea>
                </div>
                <div class="panel-row">
                  <div class="panel-field">
                    <label>Prioridad</label>
                    <select class="panel-input" [value]="task.priority"
                      (change)="updateTaskField(task.id, 'priority', $any($event.target).value)">
                      <option value="low">🟢 Baja</option>
                      <option value="medium">🟡 Media</option>
                      <option value="high">🔴 Alta</option>
                    </select>
                  </div>
                  <div class="panel-field">
                    <label>Fecha</label>
                    <input class="panel-input" type="date" [value]="task.dueDate || ''"
                      (change)="updateTaskField(task.id, 'dueDate', $any($event.target).value)" />
                  </div>
                </div>
                <div class="panel-field">
                  <label>Asignado</label>
                  @if ((p.members || []).length) {
                    <select class="panel-input" [value]="task.assignee || ''"
                      (change)="updateTaskField(task.id, 'assignee', $any($event.target).value)">
                      <option value="">Sin asignar</option>
                      @for (m of p.members; track m.id) {
                        <option [value]="m.name">{{ m.name }}{{ m.role ? ' — ' + m.role : '' }}</option>
                      }
                    </select>
                  } @else {
                    <input class="panel-input" [value]="task.assignee || ''"
                      (change)="updateTaskField(task.id, 'assignee', $any($event.target).value)"
                      placeholder="Agrega miembros al equipo primero..." />
                  }
                </div>
                <div class="panel-field">
                  <label>Sección</label>
                  <select class="panel-input" [value]="task.sectionId"
                    (change)="updateTaskField(task.id, 'sectionId', $any($event.target).value)">
                    @for (s of p.sections; track s.id) {
                      <option [value]="s.id">{{ s.name }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="panel-footer">
                <button class="btn-danger-sm" (click)="deleteFromPanel(task.id)">🗑️ Eliminar tarea</button>
                <button class="btn-primary" (click)="closeTaskPanel()">Guardar</button>
              </div>
            </div>
          </div>
        }

        <!-- ═══ Delete Dialogs ═══ -->
        <um-confirm-dialog
          [open]="showDeleteProject()"
          title="Eliminar proyecto"
          message="Se eliminará el proyecto y todas sus tareas."
          icon="🗑️"
          confirmLabel="Eliminar"
          variant="danger"
          (confirmed)="deleteProject()"
          (cancelled)="showDeleteProject.set(false)"
        />
        <um-confirm-dialog
          [open]="showDeleteSection()"
          title="Eliminar sección"
          [message]="'Se eliminará la sección y sus tareas.'"
          icon="🗑️"
          confirmLabel="Eliminar"
          variant="danger"
          (confirmed)="executeDeleteSection()"
          (cancelled)="showDeleteSection.set(false)"
        />

        <!-- ═══ Team Management Panel ═══ -->
        @if (showTeamPanel()) {
          <div class="panel-overlay" (click)="showTeamPanel.set(false)">
            <div class="task-panel team-panel animate-slideIn" (click)="$event.stopPropagation()">
              <div class="panel-header">
                <h3>👥 Equipo del Proyecto</h3>
                <button class="panel-close" (click)="showTeamPanel.set(false)">×</button>
              </div>
              <div class="panel-body">
                <!-- Add member form -->
                  <div class="add-member-form">
                    <div class="add-member-fields">
                      <input class="panel-input" [(ngModel)]="newMemberName"
                        placeholder="Nombre del miembro..." (keydown.enter)="addTeamMember()" />
                      <input class="panel-input role-input" [(ngModel)]="newMemberRole" list="roles-list"
                        placeholder="Rol (opcional)" (keydown.enter)="addTeamMember()" />
                      <datalist id="roles-list">
                        <option value="Desarrollador"></option>
                        <option value="Diseñador"></option>
                        <option value="Gerente"></option>
                        <option value="Marketing"></option>
                        <option value="Soporte"></option>
                        <option value="Ventas"></option>
                      </datalist>
                      <input class="panel-input email-input" [(ngModel)]="newMemberEmail" type="email"
                        placeholder="Correo electrónico..." (keydown.enter)="addTeamMember()" />
                    </div>
                    <button class="btn-primary add-member-btn" (click)="addTeamMember()"
                      [disabled]="!newMemberName.trim()">+ Agregar</button>
                  </div>

                <!-- Members list -->
                @if ((p.members || []).length) {
                  <div class="team-list">
                    @for (member of p.members; track member.id) {
                      <div class="team-member-row" [class.is-leader]="p.leaderId === member.id">
                        <span class="member-avatar" [style.background]="member.color">{{ member.avatar }}</span>
                        <div class="member-info">
                          <span class="member-name">
                            {{ member.name }}
                            @if (p.leaderId === member.id) {
                              <span class="leader-crown">👑</span>
                            }
                          </span>
                          @if (member.role) {
                            <span class="member-role">{{ member.role }}</span>
                          }
                          <span class="member-tasks-count">{{ getTaskCountByAssignee(member.name) }} tareas</span>
                        </div>
                        <button class="leader-toggle" (click)="toggleLeader(member.id)"
                          [title]="p.leaderId === member.id ? 'Quitar líder' : 'Asignar como líder'"
                          [class.active]="p.leaderId === member.id">👑</button>
                        <button class="member-remove" (click)="removeTeamMember(member.id)" title="Eliminar miembro">×</button>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="team-empty">
                    <span class="team-empty-icon">👥</span>
                    <p>Agrega miembros para asignar tareas</p>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="not-found animate-fadeInUp">
          <span class="nf-icon">🔍</span>
          <h2>Proyecto no encontrado</h2>
          <a class="btn-primary" routerLink="/d/projects">Volver a proyectos</a>
        </div>
      }
    </div>
  `,
  styleUrl: 'project-detail.scss',
})
export class ProjectDetailComponent {
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private projectId = this.route.snapshot.paramMap.get('id') || '';

  project = computed(() => this.projectService.getById(this.projectId));

  // View state
  selectedTask = signal<ProjectTask | null>(null);
  viewMode = signal<'kanban' | 'calendar'>('kanban');

  // Calendar state
  calMonthOffset = signal(0);

  calMonthLabel = computed(() => {
    const now = new Date();
    now.setDate(1);
    now.setMonth(now.getMonth() + this.calMonthOffset());
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  });

  calendarCells = computed(() => {
    const p = this.project();
    if (!p) return [];
    const now = new Date();
    now.setDate(1);
    now.setMonth(now.getMonth() + this.calMonthOffset());
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const cells: (null | { date: string; day: number; isToday: boolean; tasks: ProjectTask[] })[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const tasks = p.tasks.filter(t => t.dueDate === dateStr);
      cells.push({ date: dateStr, day: d, isToday: dateStr === todayStr, tasks });
    }
    return cells;
  });

  // Add section
  showAddSection = signal(false);
  newSectionName = '';

  // Delete dialogs
  showDeleteProject = signal(false);
  showDeleteSection = signal(false);
  deletingSectionId = signal('');

  // Team panel
  showTeamPanel = signal(false);
  newMemberName = '';
  newMemberRole = '';
  newMemberEmail = '';

  // Computed stats
  completedCount = computed(() => this.project()?.tasks.filter(t => t.completed).length || 0);
  pendingCount = computed(() => this.project()?.tasks.filter(t => !t.completed).length || 0);

  // ─── Section helpers ───────────────────

  getTasksBySection(sectionId: string): ProjectTask[] {
    return (this.project()?.tasks || [])
      .filter(t => t.sectionId === sectionId)
      .sort((a, b) => a.order - b.order);
  }


  // ─── Task operations ───────────────────

  toggleComplete(e: Event, task: ProjectTask): void {
    e.stopPropagation();
    this.projectService.toggleTask(this.projectId, task.id);
  }

  createAndOpenTask(sectionId: string): void {
    const task = this.projectService.addTask(this.projectId, sectionId, 'Nueva tarea');
    // Open the panel for the just-created task
    this.selectedTask.set({ ...task });
  }

  createTaskOnDate(date: string, sectionId: string): void {
    if (!sectionId) return;
    const task = this.projectService.addTask(this.projectId, sectionId, 'Nueva tarea');
    this.projectService.updateTask(this.projectId, task.id, { dueDate: date });
    this.selectedTask.set({ ...task, dueDate: date });
  }

  deleteTaskClick(e: Event, task: ProjectTask): void {
    e.stopPropagation();
    this.projectService.deleteTask(this.projectId, task.id);
  }

  moveTaskTo(e: Event, task: ProjectTask, section: ProjectSection): void {
    e.stopPropagation();
    this.projectService.moveTask(this.projectId, task.id, section.id);
  }

  // ─── Task Panel ───────────────────────

  openTaskPanel(task: ProjectTask): void {
    this.selectedTask.set({ ...task });
  }

  closeTaskPanel(): void {
    this.selectedTask.set(null);
  }

  updateTaskField(taskId: string, field: string, value: string): void {
    this.projectService.updateTask(this.projectId, taskId, { [field]: value });
    // Refresh panel
    const updated = this.project()?.tasks.find(t => t.id === taskId);
    if (updated) this.selectedTask.set({ ...updated });
  }

  deleteFromPanel(taskId: string): void {
    this.projectService.deleteTask(this.projectId, taskId);
    this.closeTaskPanel();
  }

  // ─── Section operations ───────────────

  submitNewSection(): void {
    if (!this.newSectionName.trim()) return;
    this.projectService.addSection(this.projectId, this.newSectionName);
    this.newSectionName = '';
    this.showAddSection.set(false);
  }

  confirmDeleteSection(section: ProjectSection): void {
    this.deletingSectionId.set(section.id);
    this.showDeleteSection.set(true);
  }

  executeDeleteSection(): void {
    this.projectService.removeSection(this.projectId, this.deletingSectionId());
    this.showDeleteSection.set(false);
  }

  // ─── Project operations ───────────────

  deleteProject(): void {
    this.projectService.delete(this.projectId);
    this.router.navigate(['/d/projects']);
  }

  // ─── Team Members ────────────────────

  addTeamMember(): void {
    if (!this.newMemberName.trim()) return;
    this.projectService.addMember(this.projectId, this.newMemberName, this.newMemberRole, this.newMemberEmail);
    this.newMemberName = '';
    this.newMemberRole = '';
    this.newMemberEmail = '';
  }

  removeTeamMember(memberId: string): void {
    this.projectService.removeMember(this.projectId, memberId);
  }

  toggleLeader(memberId: string): void {
    const current = this.project()?.leaderId;
    this.projectService.setLeader(this.projectId, current === memberId ? undefined : memberId);
  }

  getLeader = computed(() => {
    const p = this.project();
    if (!p?.leaderId || !p.members) return null;
    return p.members.find(m => m.id === p.leaderId) || null;
  });

  getTaskCountByAssignee(name: string): number {
    return (this.project()?.tasks || []).filter(t => t.assignee === name).length;
  }

  getMemberColor(name: string): string {
    const member = (this.project()?.members || []).find(m => m.name === name);
    return member?.color || '#8b95a9';
  }

  getMemberAvatar(name: string): string {
    const member = (this.project()?.members || []).find(m => m.name === name);
    return member?.avatar || name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // ─── Drag & Drop ──────────────────────

  draggingTaskId = signal<string | null>(null);
  dragOverSection = signal<string | null>(null);
  private dragSourceSection = '';
  private dropTargetIndex = -1;

  onDragStart(e: DragEvent, task: ProjectTask, sectionId: string): void {
    this.draggingTaskId.set(task.id);
    this.dragSourceSection = sectionId;
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', task.id);
  }

  onDragEnd(): void {
    this.draggingTaskId.set(null);
    this.dragOverSection.set(null);
    this.dropTargetIndex = -1;
  }

  onDragOver(e: DragEvent, sectionId: string): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    this.dragOverSection.set(sectionId);
  }

  onDragLeave(e: DragEvent): void {
    // Only clear if leaving the column (not entering a child)
    const related = e.relatedTarget as HTMLElement;
    if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
      this.dragOverSection.set(null);
    }
  }

  onCardDragOver(e: DragEvent, index: number, sectionId: string): void {
    e.preventDefault();
    e.stopPropagation();
    this.dropTargetIndex = index;
    this.dragOverSection.set(sectionId);
  }

  onDrop(e: DragEvent, targetSectionId: string): void {
    e.preventDefault();
    const taskId = this.draggingTaskId();
    if (!taskId) return;

    // Move to new section
    if (this.dragSourceSection !== targetSectionId) {
      this.projectService.moveTask(this.projectId, taskId, targetSectionId);
    }

    // Reorder within section
    if (this.dropTargetIndex >= 0) {
      this.projectService.reorderTask(this.projectId, taskId, this.dropTargetIndex);
    }

    this.onDragEnd();
  }

  // ─── Utilities ────────────────────────

  isOverdue(task: ProjectTask): boolean {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date(new Date().toDateString());
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }
}
