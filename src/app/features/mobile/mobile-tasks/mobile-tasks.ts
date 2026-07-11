import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { GoalService } from '../../../core/services/goal.service';
import { DataSyncService } from '../../../core/services/data-sync.service';
import { Task } from '../../../core/models/task.model';
import { GoalMode } from '../../../core/models/goal.model';

@Component({
  selector: 'um-mobile-tasks',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mobile-goals-tasks-page" style="padding: 16px; min-height: 100vh; background: #f8fafc;">
      <!-- Header -->
      <div class="page-header" style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 2.5rem; display: block; margin-bottom: 6px;">🎯</span>
        <h1 style="font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0;">Metas y Tareas</h1>
        <p style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">Tus objetivos estratégicos con sus planes de acción</p>
      </div>

      <!-- Main Action Button -->
      <div style="margin-bottom: 16px;">
        <button (click)="openGoalModal()" style="width: 100%; height: 48px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; border: none; border-radius: 14px; font-weight: 800; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 16px rgba(79,70,229,0.25);">
          <span>🎯</span> Crear Nueva Meta
        </button>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar" style="display: flex; gap: 8px; margin-bottom: 20px;">
        <button 
          (click)="filter.set('active')" 
          [style.background]="filter() === 'active' ? '#0f172a' : '#ffffff'"
          [style.color]="filter() === 'active' ? '#ffffff' : '#475569'"
          style="flex: 1; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; font-weight: 700; font-size: 0.85rem; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.2s;">
          🚀 En Progreso ({{ activeGoalsCount() }})
        </button>
        <button 
          (click)="filter.set('all')" 
          [style.background]="filter() === 'all' ? '#0f172a' : '#ffffff'"
          [style.color]="filter() === 'all' ? '#ffffff' : '#475569'"
          style="flex: 1; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; font-weight: 700; font-size: 0.85rem; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.2s;">
          📋 Todas ({{ goals().length }})
        </button>
      </div>

      <!-- Goals with Tasks List -->
      <div class="goals-container" style="display: flex; flex-direction: column; gap: 16px;">
        @for (item of goalsWithTasks(); track item.goal.id) {
          <div class="goal-group-card" style="background: #ffffff; border-radius: 20px; padding: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
            
            <!-- Goal Header Info -->
            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
              <div>
                <span style="display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 800; background: #e0e7ff; color: #4338ca; margin-bottom: 6px; text-transform: uppercase;">
                  {{ item.goal.mode === 'leader' ? '👤 Líder' : '💼 Negocio' }}
                </span>
                <h2 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.3;">
                  {{ item.goal.title }}
                </h2>
              </div>
              <span style="font-size: 0.85rem; font-weight: 800; color: #4f46e5; background: #eef2ff; padding: 4px 10px; border-radius: 12px;">
                {{ item.goal.progress || 0 }}%
              </span>
            </div>

            <!-- Progress Bar -->
            <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-bottom: 16px;">
              <div [style.width.%]="item.goal.progress || 0" style="height: 100%; background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%); border-radius: 4px; transition: width 0.3s ease;"></div>
            </div>

            <!-- Associated Tasks List -->
            <div class="tasks-sublist" style="display: flex; flex-direction: column; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 14px; border: 1px solid #f1f5f9;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>Tareas de esta meta ({{ item.tasks.length }})</span>
              </div>

              @for (task of item.tasks; track task.id) {
                <div style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; padding: 10px 12px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                  <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <button (click)="toggleTask(task)" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; padding: 0;">
                      {{ task.status === 'completed' ? '✅' : '⬜' }}
                    </button>
                    <span [style.text-decoration]="task.status === 'completed' ? 'line-through' : 'none'" [style.color]="task.status === 'completed' ? '#94a3b8' : '#1e293b'" style="font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {{ task.title }}
                    </span>
                  </div>

                  @if (task.estimatedMinutes) {
                    <span style="font-size: 0.7rem; color: #94a3b8; margin-left: 8px; flex-shrink: 0;">⏱️ {{ task.estimatedMinutes }}m</span>
                  }
                </div>
              }

              @if (!item.tasks.length) {
                <p style="font-size: 0.8rem; color: #94a3b8; font-style: italic; margin: 4px 0; text-align: center;">Sin tareas asignadas a esta meta aún.</p>
              }
            </div>

            <!-- Add Task to Goal Input Form -->
            <div style="margin-top: 12px;">
              @if (addingGoalId() === item.goal.id) {
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input 
                    type="text" 
                    [(ngModel)]="newTaskTitle" 
                    placeholder="Nombre de la nueva tarea..." 
                    (keyup.enter)="saveTaskForGoal(item.goal.id)"
                    style="flex: 1; padding: 10px 14px; border-radius: 12px; border: 1.5px solid #6366f1; font-size: 0.85rem; outline: none; background: #ffffff;" 
                  />
                  <button (click)="saveTaskForGoal(item.goal.id)" style="background: #4f46e5; color: #fff; border: none; padding: 10px 14px; border-radius: 12px; font-weight: 700; font-size: 0.8rem; cursor: pointer;">
                    Guardar
                  </button>
                  <button (click)="addingGoalId.set(null)" style="background: #f1f5f9; color: #64748b; border: none; padding: 10px; border-radius: 12px; font-weight: 600; font-size: 0.8rem; cursor: pointer;">
                    ✕
                  </button>
                </div>
              } @else {
                <button (click)="startAddTask(item.goal.id)" style="width: 100%; background: #eef2ff; color: #4f46e5; border: 1px dashed #a5b4fc; padding: 10px; border-radius: 12px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                  <span>➕</span> Agregar tarea a esta meta
                </button>
              }
            </div>
          </div>
        }

        @if (!goalsWithTasks().length) {
          <div style="text-align: center; padding: 50px 20px; background: #ffffff; border-radius: 20px; border: 1px dashed #cbd5e1;">
            <span style="font-size: 3rem; display: block; margin-bottom: 12px;">🎯</span>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0;">Sin metas registradas</h3>
            <p style="font-size: 0.85rem; color: #64748b; margin-top: 6px;">¡Crea tu primera meta usando el botón "+ Crear Nueva Meta" de arriba!</p>
          </div>
        }
      </div>

      <!-- Create Goal Modal -->
      @if (showGoalModal()) {
        <div style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div style="width: 100%; max-width: 450px; background: #ffffff; border-radius: 24px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.25); max-height: 85vh; overflow-y: auto;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
              <h3 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0;">🎯 Crear Nueva Meta</h3>
              <button (click)="showGoalModal.set(false)" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; font-weight: 700; color: #64748b; cursor: pointer;">✕</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div>
                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 6px;">Título de la Meta *</label>
                <input 
                  type="text" 
                  [(ngModel)]="goalTitle" 
                  placeholder="Ej: Aumentar ventas un 20%..." 
                  style="width: 100%; padding: 12px 14px; border-radius: 12px; border: 1.5px solid #cbd5e1; font-size: 0.9rem; outline: none; box-sizing: border-box;" 
                />
              </div>

              <div>
                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 6px;">Enfoque / Modo</label>
                <select 
                  [(ngModel)]="goalMode" 
                  style="width: 100%; padding: 12px 14px; border-radius: 12px; border: 1.5px solid #cbd5e1; font-size: 0.9rem; outline: none; background: #fff; box-sizing: border-box;">
                  <option value="leader">👤 Líder (Desarrollo personal / Liderazgo)</option>
                  <option value="business">💼 Negocio (Ventas / Comercial / Operativo)</option>
                </select>
              </div>

              <!-- Initial Tasks Builder Section -->
              <div style="background: #f8fafc; padding: 14px; border-radius: 16px; border: 1px solid #e2e8f0;">
                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 8px;">📋 Tareas iniciales (Opcional)</label>
                
                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                  <input 
                    type="text" 
                    [(ngModel)]="tempTaskTitle" 
                    placeholder="Escribe una tarea..." 
                    (keyup.enter)="addInitialTask()"
                    style="flex: 1; padding: 10px 12px; border-radius: 12px; border: 1.5px solid #cbd5e1; font-size: 0.85rem; outline: none; background: #ffffff; box-sizing: border-box;" 
                  />
                  <button (click)="addInitialTask()" type="button" style="background: #4f46e5; color: #fff; border: none; padding: 0 16px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">
                    ➕
                  </button>
                </div>

                @if (initialTasks().length) {
                  <div style="display: flex; flex-direction: column; gap: 6px; max-height: 150px; overflow-y: auto;">
                    @for (t of initialTasks(); track $index) {
                      <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                        <span style="font-size: 0.85rem; color: #1e293b; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; margin-right: 8px;">• {{ t }}</span>
                        <button (click)="removeInitialTask($index)" type="button" style="background: none; border: none; color: #ef4444; font-weight: 700; cursor: pointer; font-size: 0.9rem; padding: 0 4px;">✕</button>
                      </div>
                    }
                  </div>
                } @else {
                  <p style="font-size: 0.75rem; color: #94a3b8; font-style: italic; margin: 0; text-align: center;">Agrega las tareas que componen esta meta.</p>
                }
              </div>

              <div style="display: flex; gap: 10px; margin-top: 6px;">
                <button (click)="showGoalModal.set(false)" style="flex: 1; padding: 14px; border-radius: 14px; border: 1px solid #cbd5e1; background: #ffffff; color: #475569; font-weight: 700; font-size: 0.9rem; cursor: pointer;">
                  Cancelar
                </button>
                <button (click)="saveNewGoal()" style="flex: 1; padding: 14px; border-radius: 14px; border: none; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-weight: 700; font-size: 0.9rem; cursor: pointer; box-shadow: 0 4px 14px rgba(79,70,229,0.3);">
                  Guardar Meta
                </button>
              </div>
            </div>

          </div>
        </div>
      }
    </div>
  `
})
export class MobileTasksComponent implements OnInit {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);
  private dataSync = inject(DataSyncService);

  filter = signal<'active' | 'all'>('active');
  addingGoalId = signal<string | null>(null);
  showGoalModal = signal(false);
  
  newTaskTitle = '';
  goalTitle = '';
  goalMode: GoalMode = 'leader';
  
  initialTasks = signal<string[]>([]);
  tempTaskTitle = '';

  goals = this.goalService.goals;
  tasks = this.taskService.tasks;

  activeGoalsCount = computed(() => this.goals().filter(g => g.status !== 'completed').length);

  goalsWithTasks = computed(() => {
    const f = this.filter();
    let gList = this.goals();
    if (f === 'active') {
      gList = gList.filter(g => g.status !== 'completed');
    }
    const allTasks = this.tasks();

    return gList.map(g => {
      const gTasks = allTasks.filter(t => t.goalId === g.id);
      return {
        goal: g,
        tasks: gTasks
      };
    });
  });

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.dataSync.syncFromServer();
  }

  openGoalModal() {
    this.goalTitle = '';
    this.goalMode = 'leader';
    this.initialTasks.set([]);
    this.tempTaskTitle = '';
    this.showGoalModal.set(true);
  }

  toggleTask(task: Task) {
    if (task.status === 'completed') {
      this.taskService.update(task.id, { status: 'pending', completedAt: undefined });
    } else {
      this.taskService.complete(task.id);
    }
  }

  startAddTask(goalId: string) {
    this.addingGoalId.set(goalId);
    this.newTaskTitle = '';
  }

  saveTaskForGoal(goalId: string) {
    const title = this.newTaskTitle.trim();
    if (!title) return;

    this.taskService.create({
      goalId: goalId,
      title: title,
      order: this.tasks().length + 1,
      status: 'pending',
      priority: 'medium',
    });

    this.newTaskTitle = '';
    this.addingGoalId.set(null);
  }

  addInitialTask() {
    const title = this.tempTaskTitle.trim();
    if (!title) return;
    this.initialTasks.update(list => [...list, title]);
    this.tempTaskTitle = '';
  }

  removeInitialTask(index: number) {
    this.initialTasks.update(list => list.filter((_, i) => i !== index));
  }

  saveNewGoal() {
    const title = this.goalTitle.trim();
    if (!title) return;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    const createdGoal = this.goalService.create({
      title: title,
      intentionTrigger: '',
      intentionAction: '',
      targetDate: targetDate,
      status: 'in_progress',
      mode: this.goalMode,
      tags: [],
    });

    // Create initial tasks for this new goal
    const tasksToCreate = this.initialTasks();
    tasksToCreate.forEach((taskTitle, idx) => {
      this.taskService.create({
        goalId: createdGoal.id,
        title: taskTitle,
        order: idx + 1,
        status: 'pending',
        priority: 'medium',
      });
    });

    this.goalTitle = '';
    this.goalMode = 'leader';
    this.initialTasks.set([]);
    this.tempTaskTitle = '';
    this.showGoalModal.set(false);
  }
}
