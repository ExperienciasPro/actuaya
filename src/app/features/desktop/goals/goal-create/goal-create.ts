import { Component, inject, signal, computed, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GoalService } from '../../../../core/services/goal.service';
import { TaskService } from '../../../../core/services/task.service';
import { MicroTaskTemplateService, MicroTaskSuggestion } from '../../../../core/services/micro-task-template.service';
import { GoalMode, GoalStatus } from '../../../../core/models/goal.model';
import { TaskPriority } from '../../../../core/models/task.model';
import { UmIconComponent } from '../../../../shared/components/um-icon/um-icon';

@Component({
  selector: 'um-goal-create',
  standalone: true,
  imports: [FormsModule, RouterLink, UmIconComponent],
  template: `
    <div class="goal-create-page">
      <div class="page-header animate-fadeInUp">
        <a class="back-link" routerLink="/d/goals">← Metas</a>
        <h1>Nueva Meta</h1>
        <p class="header-subtitle">Define tu objetivo y empieza a construir el camino.</p>
      </div>

      <form class="create-form animate-fadeInUp stagger-1" (ngSubmit)="onSubmit()">
        <!-- Mode Selection -->
        <div class="form-section">
          <label class="form-label">Tipo de Meta</label>
          <div class="mode-selector">
            @for (m of modes; track m.value) {
              <button
                type="button"
                class="mode-option"
                [class.active]="mode() === m.value"
                (click)="mode.set(m.value)"
              >
                <um-icon class="mode-icon" [name]="m.icon" [size]="28"></um-icon>
                <span class="mode-name">{{ m.name }}</span>
                <span class="mode-desc">{{ m.desc }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Suggestions Banner -->
        <div class="suggestions-banner">
          <div class="banner-header" (click)="showSuggestions.set(!showSuggestions())">
            <span class="banner-title"><um-icon name="lightbulb" [size]="18"></um-icon> ¿Sin ideas? Ver sugerencias de metas</span>
            <um-icon [name]="showSuggestions() ? 'chevron-up' : 'chevron-down'" [size]="20"></um-icon>
          </div>
          @if (showSuggestions()) {
            <div class="suggestions-list animate-fadeIn">
              @for (sug of currentSuggestions(); track sug.title) {
                <button type="button" class="suggestion-item" (click)="applySuggestion(sug)">
                  <div class="sug-content">
                    <span class="sug-title">{{ sug.title }}</span>
                    <span class="sug-desc">{{ sug.intention }}</span>
                  </div>
                  <um-icon name="plus" [size]="20" class="sug-add"></um-icon>
                </button>
              }
            </div>
          }
        </div>

        <div class="form-section">
          <label class="form-label" for="title">Título de la Meta *</label>
          <input
            id="title"
            class="form-input"
            type="text"
            [(ngModel)]="title"
            name="title"
            placeholder="Ej: Cerrar 20 ventas este trimestre"
            required
            maxlength="120"
          />
          <span class="char-count">{{ title().length }}/120</span>
        </div>

        <!-- Target Date (right after title) -->
        <div class="form-section">
          <label class="form-label" for="targetDate">Fecha objetivo para completar la meta *</label>
          <input
            id="targetDate"
            class="form-input"
            type="date"
            [(ngModel)]="targetDate"
            name="targetDate"
            [min]="todayStr"
            required
          />
        </div>

        <!-- Implementation Intention -->
        <div class="form-section">
          <label class="form-label" for="intentionAction">Intención de Implementación</label>
          <textarea
            id="intentionAction"
            class="form-input textarea"
            [(ngModel)]="intentionAction"
            name="intentionAction"
            placeholder="Ej: Si son las 8:00 AM del martes, entonces revisaré las métricas de conversión por 45 minutos."
            rows="2"
            maxlength="300"
          ></textarea>
          <span class="form-hint">Define cuándo y qué harás exactamente. Elimina la necesidad de decidir en el momento.</span>
        </div>

        <!-- Cognitive Offloading (Delegation) -->
        @if (mode() === 'business') {
          <div class="form-section">
            <label class="form-label" for="delegatedTo">Descarga Cognitiva (Delegar a / Sistemas)</label>
            <input
              id="delegatedTo"
              class="form-input"
              type="text"
              [(ngModel)]="delegatedTo"
              name="delegatedTo"
              placeholder="¿Quién o qué sistema ejecutará la parte mecánica de esta meta?"
              maxlength="100"
            />
            <span class="form-hint">Protege tu ancho de banda mental automatizando o delegando lo repetitivo.</span>
          </div>
        }


        <!-- Micro-pasos (Fragmentación) -->
        <div class="form-section group-section tasks-section" style="margin-top: 24px; margin-bottom: 24px; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 20px; background: rgba(0,0,0,0.015);">
          <div class="section-header" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="font-size: 1.125rem; font-weight: 600; display: flex; align-items: center; gap: 8px;"><um-icon name="board" [size]="20"></um-icon> Micro-pasos (Fragmentación)</h2>
            <span class="task-count" style="font-size: 0.8125rem; color: var(--text-secondary);">{{ newTasks().length }} pasos</span>
          </div>
          <p class="form-hint" style="margin-bottom: 16px;">Desglosa tu acción de arriba en pasos tan pequeños que sea ridículo no hacerlos.</p>

          <!-- Suggested tasks banner -->
          @if (suggestedTasks().length && !suggestionsApplied()) {
            <div class="suggested-tasks-banner" style="background: linear-gradient(135deg, rgba(124,58,237,0.06), rgba(59,130,246,0.06)); border: 1px dashed rgba(124,58,237,0.3); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.8125rem; font-weight: 600; color: var(--accent-primary); display: flex; align-items: center; gap: 6px;"><um-icon name="lightbulb" [size]="16"></um-icon> {{ suggestedTasks().length }} micro-pasos sugeridos para tu meta</span>
                <button type="button" class="btn-primary small" (click)="acceptAllSuggestions()" style="padding: 4px 12px; font-size: 0.6875rem;">Aceptar todos</button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                @for (sug of suggestedTasks(); track sug.title) {
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: rgba(255,255,255,0.6); border-radius: 6px; font-size: 0.8125rem;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span>{{ sug.title }}</span>
                      @if (sug.source === 'community') {
                        <span style="font-size: 0.625rem; background: rgba(59,130,246,0.12); color: var(--accent); padding: 1px 6px; border-radius: 4px;">Comunidad</span>
                      }
                    </div>
                    <div style="display: flex; gap: 4px;">
                      <button type="button" (click)="acceptSuggestion(sug)" style="background: none; border: none; cursor: pointer; color: var(--accent-success); font-size: 1rem; padding: 2px;">+</button>
                      <button type="button" (click)="dismissSuggestion(sug)" style="background: none; border: none; cursor: pointer; color: var(--accent-danger); font-size: 1rem; padding: 2px;">×</button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <div class="add-task-form" style="display: flex; gap: 8px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap;">
            <input
              class="form-input"
              type="text"
              [(ngModel)]="newTaskTitle"
              name="newTaskTitle"
              placeholder="+ Agregar nuevo micro-paso..."
              (keydown.enter)="$event.preventDefault(); addTaskLocally()"
              style="flex: 1;"
            />
            <select class="form-input priority-select" [(ngModel)]="newTaskPriority" name="newTaskPriority" style="width: 120px;">
              <option value="medium">Media</option>
              <option value="low">Baja</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
            <button type="button" class="btn-primary small" [disabled]="!newTaskTitle().trim()" (click)="addTaskLocally()" style="padding: 5px 14px; font-size: 0.75rem;">Agregar</button>
          </div>

          @if (newTasks().length) {
            <div class="task-list" style="display: flex; flex-direction: column; gap: 4px;">
              @for (task of newTasks(); track $index) {
                <div class="task-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: var(--bg-tertiary); border-radius: 8px;">
                  <div class="task-content" style="display: flex; align-items: center; gap: 8px;">
                    <span class="task-title" style="font-size: 0.875rem;">{{ task.title }}</span>
                    <span class="priority-label" style="font-size: 0.6875rem; opacity: 0.7;">[{{ task.priority }}]</span>
                    @if (task.source === 'suggested') {
                      <span style="font-size: 0.5625rem; background: rgba(124,58,237,0.12); color: var(--accent); padding: 1px 5px; border-radius: 3px;">Sugerida</span>
                    }
                  </div>
                  <button type="button" class="btn-ghost small" (click)="removeTaskLocally($index)" style="color: var(--accent-danger); padding: 4px; font-size: 1rem;"><um-icon name="trash" [size]="14"></um-icon></button>
                </div>
              }
            </div>
          }
        </div>



        <!-- Form Actions -->
        <div class="form-actions">
          <a class="btn-ghost" routerLink="/d/goals">Cancelar</a>
          <button type="submit" class="btn-primary" [disabled]="!isValid()">
            <um-icon name="target" [size]="18"></um-icon> Crear Meta
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrl: 'goal-create.scss',
})
export class GoalCreateComponent {
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);
  private microTaskService = inject(MicroTaskTemplateService);
  private router = inject(Router);

  modes = [
    { value: 'leader' as GoalMode, icon: 'user', name: 'Del Líder', desc: 'Desarrollo y crecimiento personal' },
    { value: 'business' as GoalMode, icon: 'board', name: 'Del Negocio', desc: 'Metas comerciales y proyectos' },
  ];

  mode = signal<GoalMode>('leader');
  title = signal('');
  intentionTrigger = signal('');
  intentionAction = signal('');
  delegatedTo = signal('');

  newTaskTitle = signal('');
  newTaskPriority = signal<TaskPriority>('medium');
  newTasks = signal<{title: string; priority: TaskPriority; source: 'manual' | 'suggested'}[]>([]);

  // Micro-task suggestions
  suggestedTasks = signal<MicroTaskSuggestion[]>([]);
  suggestionsApplied = signal(false);
  private searchTimeout: any = null;

  constructor() {
    // Auto-search when title or intentionAction changes (debounced)
    effect(() => {
      const currentTitle = this.title();
      const currentMode = this.mode();
      const currentAction = this.intentionAction();
      // Clear previous timeout
      clearTimeout(this.searchTimeout);
      if (currentTitle.trim().length >= 3) {
        this.searchTimeout = setTimeout(() => {
          this.loadSuggestions(currentTitle, currentMode, currentAction);
        }, 500);
      } else {
        this.suggestedTasks.set([]);
        this.suggestionsApplied.set(false);
      }
    });
  }

  private loadSuggestions(goalTitle: string, mode: GoalMode, intentionAction?: string): void {
    // Don't reload if suggestions were already applied (e.g. from predefined goal selection)
    if (this.suggestionsApplied()) return;
    const suggestions = this.microTaskService.getSuggestions(goalTitle, mode, intentionAction);
    if (suggestions.length > 0) {
      this.suggestedTasks.set(suggestions);
      this.suggestionsApplied.set(false);
    }
  }

  acceptAllSuggestions(): void {
    const suggestions = this.suggestedTasks();
    const newEntries = suggestions.map(s => ({
      title: s.title,
      priority: s.priority,
      source: 'suggested' as const,
    }));
    this.newTasks.update(tasks => [...tasks, ...newEntries]);
    this.suggestedTasks.set([]);
    this.suggestionsApplied.set(true);
  }

  acceptSuggestion(sug: MicroTaskSuggestion): void {
    this.newTasks.update(tasks => [...tasks, { title: sug.title, priority: sug.priority, source: 'suggested' as const }]);
    this.suggestedTasks.update(list => list.filter(s => s.title !== sug.title));
    if (this.suggestedTasks().length === 0) this.suggestionsApplied.set(true);
  }

  dismissSuggestion(sug: MicroTaskSuggestion): void {
    this.suggestedTasks.update(list => list.filter(s => s.title !== sug.title));
    if (this.suggestedTasks().length === 0) this.suggestionsApplied.set(true);
  }

  addTaskLocally(): void {
    const title = this.newTaskTitle().trim();
    if (!title) return;
    this.newTasks.update(tasks => [...tasks, { title, priority: this.newTaskPriority(), source: 'manual' as const }]);
    this.newTaskTitle.set('');
    this.newTaskPriority.set('medium');
  }

  removeTaskLocally(index: number): void {
    this.newTasks.update(tasks => tasks.filter((_, i) => i !== index));
  }

  targetDate = signal('');
  status = signal<GoalStatus>('not_started');
  tags = signal<string[]>([]);
  newTag = signal('');
  parentGoalId = signal('');
  showSuggestions = signal(false);

  suggestedGoals: Record<GoalMode, { title: string; intention: string }[]> = {
    leader: [
      { title: 'Organizar mi tiempo', intention: 'Si son las 5:00 PM del viernes, bloquearé los espacios de trabajo profundo y descanso para la próxima semana' },
      { title: 'Aprender a delegar', intention: 'Si un cliente pide una modificación menor, se la asignaré al equipo sin intentarlo hacer yo mismo' },
      { title: 'Cuidar mi salud y energía', intention: 'Si son las 6:30 AM, haré 30 minutos de ejercicio antes de mirar el teléfono' },
      { title: 'Separar mis finanzas', intention: 'Si recibo un pago de un cliente, transferiré el 30% a la cuenta de impuestos y gastos fijos' },
      { title: 'Leer para inspirarme', intention: 'Si me acuesto en la cama por la noche, leeré 10 páginas de un libro en lugar de usar redes sociales' },
      { title: 'Crear red de contactos', intention: 'Si es el primer lunes del mes, enviaré un mensaje a 3 contactos clave para agendar un café virtual' },
      { title: 'Planificar el mes', intention: 'Si es el último viernes del mes a las 3:00 PM, auditaré mis metas y planificaré la estrategia del mes siguiente' },
      { title: 'Fondo de emergencia', intention: 'Si se genera la nómina quincenal, ahorraré automáticamente el 10% de mis ingresos personales' },
    ],
    business: [
      { title: 'Conseguir más clientes', intention: 'Si es martes a las 10:00 AM, contactaré a 5 prospectos cualificados por LinkedIn o correo' },
      { title: 'Subir las ventas', intention: 'Si un cliente compra mi producto principal, le ofreceré inmediatamente un producto complementario' },
      { title: 'Ordenar las cuentas', intention: 'Si es viernes a las 4:00 PM, conciliaré los ingresos y gastos de la semana en el sistema' },
      { title: 'Mejorar el servicio', intention: 'Si se entrega un producto a un cliente, programaré un mensaje pidiendo feedback 3 días después' },
      { title: 'Tener presencia online', intention: 'Si es miércoles a las 9:00 AM, programaré 3 publicaciones de valor para las redes sociales' },
      { title: 'Recuperar clientes perdidos', intention: 'Si un cliente lleva 6 meses sin comprar, le enviaré una oferta especial de reactivación' },
      { title: 'Pedir referidos', intention: 'Si un cliente nos da una calificación de 5 estrellas, le pediré que nos recomiende a un conocido' },
      { title: 'Reducir un gasto fijo', intention: 'Si llega el estado de cuenta mensual, revisaré y cancelaré al menos 1 suscripción innecesaria' },
    ]
  };

  currentSuggestions = computed(() => this.suggestedGoals[this.mode()]);

  applySuggestion(sug: { title: string; intention: string }): void {
    this.title.set(sug.title);
    this.intentionAction.set(sug.intention);
    this.showSuggestions.set(false);
    // Auto-load micro-task suggestions using both title + intention
    const suggestions = this.microTaskService.getSuggestions(sug.title, this.mode(), sug.intention);
    if (suggestions.length > 0) {
      const newEntries = suggestions.map(s => ({
        title: s.title,
        priority: s.priority,
        source: 'suggested' as const,
      }));
      this.newTasks.set(newEntries);
      this.suggestedTasks.set([]);
      this.suggestionsApplied.set(true);
    }
  }

  todayStr = new Date().toISOString().split('T')[0];

  parentGoals = () => this.goalService.getRootGoals();

  isValid = () => this.title().trim().length >= 3 && this.targetDate().length > 0;

  getModeIcon(mode: GoalMode): string {
    return { leader: 'user', business: 'board' }[mode];
  }

  addTag(event: Event): void {
    event.preventDefault();
    const tag = this.newTag().trim();
    if (tag && !this.tags().includes(tag) && this.tags().length < 5) {
      this.tags.update((t) => [...t, tag]);
      this.newTag.set('');
    }
  }

  removeTag(tag: string): void {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  onSubmit(): void {
    if (!this.isValid()) return;

    const goal = this.goalService.create({
      title: this.title().trim(),
      intentionTrigger: '',
      intentionAction: this.intentionAction().trim(),
      delegatedTo: this.mode() === 'business' ? this.delegatedTo().trim() : undefined,
      targetDate: this.targetDate() ? new Date(this.targetDate()) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'in_progress' as GoalStatus,
      mode: this.mode(),
      tags: this.tags(),
      parentGoalId: this.parentGoalId() || undefined,
    });

    const allTasks = this.newTasks();
    allTasks.forEach((task, index) => {
      this.taskService.create({
        goalId: goal.id,
        title: task.title,
        priority: task.priority,
        status: 'pending',
        order: index,
        estimatedMinutes: 0
      });
    });

    // Learn from manually created tasks (community learning)
    const manualTasks = allTasks.filter(t => t.source === 'manual');
    if (manualTasks.length > 0) {
      this.microTaskService.learnFromUser(
        this.title().trim(),
        this.mode(),
        manualTasks.map(t => ({ title: t.title, priority: t.priority }))
      );
    }

    this.router.navigate(['/d/goals', goal.id]);
  }
}
