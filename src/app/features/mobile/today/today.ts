import { Component, computed, inject, OnInit } from '@angular/core';
import { TaskService } from '../../../core/services/task.service';
import { GoalService } from '../../../core/services/goal.service';
import { UserService } from '../../../core/services/user.service';
import { RadarService } from '../../../core/services/radar.service';
import { DataSyncService } from '../../../core/services/data-sync.service';
import { ProgressRingComponent } from '../../../shared/components/progress-ring/progress-ring';
import { RELATIONSHIP_ICONS } from '../../../core/models/radar-contact.model';
import { Task, TaskPriority } from '../../../core/models/task.model';

@Component({
  selector: 'um-today',
  standalone: true,
  imports: [ProgressRingComponent],
  template: `
    <div class="today-screen">
      <!-- Greeting -->
      <div class="today-greeting animate-fadeInUp" style="margin-bottom: 16px;">
        <h1 class="greeting-title">
          <span class="greeting-emoji">{{ greetingEmoji() }}</span>
          <span class="greeting-text">{{ greetingText() }}</span>
        </h1>
        <p class="greeting-date">{{ dateString() }}</p>
      </div>

      <!-- Daily Progress Widget -->
      <div class="daily-progress-widget animate-fadeInUp stagger-1" style="background: #ffffff; border-radius: 20px; padding: 16px 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <um-progress-ring [value]="dailyProgress()" [size]="64" [strokeWidth]="6" />
          <div class="progress-info">
            <span style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Progreso del día</span>
            <span style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin-top: 2px; display: block;">{{ completedToday() }}/{{ totalToday() }} tareas completadas</span>
          </div>
        </div>
      </div>

      <!-- Prioritized Tasks Section -->
      <div class="upcoming-section animate-fadeInUp stagger-2" style="background: #ffffff; border-radius: 20px; padding: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <h3 class="section-title" style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">⚡ Tareas para hoy</h3>
        <p style="font-size: 0.8rem; color: #64748b; margin: 0 0 16px 0;">Ordenadas por nivel de importancia y urgencia</p>

        <!-- Main Focus Task Card embedded in the middle -->
        @if (focusTask(); as task) {
          <div class="focus-card" style="background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 12px; flex-wrap: wrap;">
              <span style="display: inline-block; padding: 6px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 800; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff;">
                🎯 Meta: {{ getTaskGoalTitle(task.goalId) || 'General' }}@if (getGoalDaysRemaining(task.goalId); as days) {, {{ days.toLowerCase() }}}
              </span>
            </div>

            <h2 style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 18px 0; line-height: 1.3; text-align: center;">
              {{ task.title }}
            </h2>

            @if (task.description) {
              <p style="font-size: 0.85rem; color: #64748b; margin: 0 0 12px 0;">{{ task.description }}</p>
            }

            <button class="complete-btn" (click)="completeTask(task.id)" style="width: 100%; height: 44px; border-radius: 12px; border: none; background: #10b981; color: #ffffff; font-weight: 800; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(16,185,129,0.25);">
              ✓ Completar Tarea
            </button>
          </div>
        }

        <!-- Remaining Prioritized Tasks -->
        @if (prioritizedPendingTasks().length > 1) {
          <div style="display: flex; flex-direction: column; gap: 10px;">
            @for (task of prioritizedPendingTasks().slice(1); track task.id) {
              <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0;">
                  <button (click)="completeTask(task.id)" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; padding: 0; margin-top: 2px;">
                    ⬜
                  </button>
                  <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                    @if (getTaskGoalTitle(task.goalId); as gTitle) {
                      <span style="font-size: 0.7rem; font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 2px 6px; border-radius: 6px; align-self: flex-start; margin-bottom: 4px;">
                        🎯 {{ gTitle }}
                      </span>
                    }
                    <span style="font-size: 0.9rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {{ task.title }}
                    </span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 8px;">
                  <span [style.background]="getPriorityBg(task.priority)" [style.color]="getPriorityColor(task.priority)" style="padding: 2px 6px; border-radius: 8px; font-size: 0.65rem; font-weight: 800;">
                    {{ getPriorityLabel(task.priority) }}
                  </span>
                  @if (task.estimatedMinutes) {
                    <span style="font-size: 0.7rem; color: #94a3b8;">⏱️ {{ task.estimatedMinutes }}m</span>
                  }
                </div>
              </div>
            }
          </div>
        } @else if (prioritizedPendingTasks().length === 0) {
          <p style="font-size: 0.8rem; color: #94a3b8; font-style: italic; text-align: center; margin: 8px 0;">Sin tareas pendientes programadas.</p>
        }
      </div>

      <!-- Contactos del Radar Section -->
      <div class="goals-section animate-fadeInUp stagger-3" style="background: #ffffff; border-radius: 20px; padding: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
        <h3 class="section-title" style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">📡 Contactos del Día</h3>
        <p style="font-size: 0.8rem; color: #64748b; margin: 0 0 14px 0;">Contacta 2 personas hoy para mantener activa tu red</p>
        
        @if (radarContacts().length) {
          <div class="contact-list" style="display: flex; flex-direction: column; gap: 12px;">
            @for (c of radarContacts(); track c.id) {
              <div class="contact-card" style="background: #f8fafc; border-radius: 16px; padding: 14px; border: 1px solid #eef2f5; display: flex; flex-direction: column; gap: 12px;">
                <!-- Contact Header Row -->
                <div class="contact-row" style="display: flex; align-items: center; gap: 12px;">
                  <div class="contact-avatar-wrap" style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #00cec9 0%, #6c5ce7 100%); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0;">
                    <span>{{ getInitial(c.name) }}</span>
                  </div>
                  <div class="contact-info" style="display: flex; flex-direction: column; flex: 1;">
                    <span class="contact-name" style="font-size: 1rem; font-weight: 700; color: #1a2e35;">{{ c.name || 'Sin nombre' }}</span>
                    <span class="contact-meta" style="font-size: 0.8rem; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 6px;">
                      <span>{{ getTagIcon(c.relationshipTag) }} {{ c.phone }}</span>
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; background: #e3f2fd; color: #0984e3;">
                        📡 En el Radar
                      </span>
                    </span>
                  </div>
                </div>

                <!-- Action Buttons Row -->
                <div class="action-row" style="display: flex; gap: 8px;">
                  <button class="action-btn wa-btn" (click)="contactWhatsApp(c.id)" style="flex: 1; height: 38px; border-radius: 10px; border: none; background: #25D366; color: #ffffff; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
                    <span>💬</span> WhatsApp
                  </button>

                  @if (c.email) {
                    <button class="action-btn email-btn" (click)="contactEmail(c)" style="flex: 1; height: 38px; border-radius: 10px; border: none; background: #ea4335; color: #ffffff; font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
                      <span>✉️</span> Email
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <p style="font-size: 0.8rem; color: #94a3b8; font-style: italic; text-align: center; margin: 8px 0;">No tienes contactos en el radar aún.</p>
        }
      </div>
    </div>
  `,
  styleUrl: 'today.scss',
})
export class TodayComponent implements OnInit {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);
  private userService = inject(UserService);
  private radarService = inject(RadarService);
  private dataSync = inject(DataSyncService);

  ngOnInit() {
    this.dataSync.syncFromServer();
  }

  goals = computed(() => this.goalService.goals());
  
  goalMap = computed(() => {
    const map = new Map<string, string>();
    this.goals().forEach(g => map.set(g.id, g.title));
    return map;
  });

  prioritizedPendingTasks = computed(() => {
    const pending = this.taskService.pendingTasks();
    const allGoals = this.goals();
    const gMap = new Map(allGoals.map(g => [g.id, g]));

    const priorityScore: Record<TaskPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

    return [...pending].sort((a, b) => {
      // 1. Priority (Higher first)
      const pDiff = (priorityScore[b.priority] || 2) - (priorityScore[a.priority] || 2);
      if (pDiff !== 0) return pDiff;

      // 2. Target Date / Due Date (Closest first)
      const goalA = gMap.get(a.goalId);
      const goalB = gMap.get(b.goalId);
      
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : (goalA?.targetDate ? new Date(goalA.targetDate).getTime() : Infinity);
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : (goalB?.targetDate ? new Date(goalB.targetDate).getTime() : Infinity);
      
      if (dateA !== dateB) return dateA - dateB;

      // 3. Order
      return a.order - b.order;
    });
  });

  focusTask = computed(() => {
    const list = this.prioritizedPendingTasks();
    return list.length > 0 ? list[0] : undefined;
  });

  radarContacts = computed(() => {
    return this.radarService.contacts()
      .filter(c => c.status === 'radar')
      .slice(0, 2);
  });

  completedToday = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.taskService.tasks().filter(t => {
      if (!t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === today.getTime();
    }).length;
  });

  totalToday = computed(() => this.completedToday() + this.prioritizedPendingTasks().length);

  dailyProgress = computed(() => {
    const total = this.totalToday();
    return total ? Math.round((this.completedToday() / total) * 100) : 0;
  });

  greetingEmoji = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️';
    if (hour < 18) return '🌤️';
    return '🌙';
  });

  greetingText = computed(() => {
    const hour = new Date().getHours();
    const name = this.userService.firstName();
    const suffix = name ? `, ${name}` : '';
    
    if (hour < 12) return `Buenos días${suffix}`;
    if (hour < 18) return `Buenas tardes${suffix}`;
    return `Buenas noches${suffix}`;
  });

  dateString = computed(() => {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  });

  getTaskGoalTitle(goalId: string): string | undefined {
    if (!goalId) return undefined;
    return this.goalMap().get(goalId);
  }

  getPriorityLabel(priority: TaskPriority): string {
    switch (priority) {
      case 'critical': return '🔥 Crítica';
      case 'high': return '⚡ Alta';
      case 'medium': return '🟡 Media';
      case 'low': return '🔵 Baja';
      default: return '🟡 Media';
    }
  }

  getPriorityBg(priority: TaskPriority): string {
    switch (priority) {
      case 'critical': return '#fee2e2';
      case 'high': return '#ffedd5';
      case 'medium': return '#fef9c3';
      case 'low': return '#e0f2fe';
      default: return '#fef9c3';
    }
  }

  getPriorityColor(priority: TaskPriority): string {
    switch (priority) {
      case 'critical': return '#991b1b';
      case 'high': return '#9a3412';
      case 'medium': return '#854d0e';
      case 'low': return '#075985';
      default: return '#854d0e';
    }
  }

  completeTask(id: string): void {
    this.taskService.complete(id);
  }

  contactWhatsApp(id: string): void {
    const deepLink = this.radarService.triggerWhatsAppContact(id);
    if (deepLink) {
      window.open(deepLink, '_blank');
    }
  }

  contactEmail(contact: any): void {
    if (contact.email) {
      this.radarService.markContacted(contact.id);
      window.open(`mailto:${contact.email}`, '_blank');
    }
  }

  getInitial(name: string | undefined): string {
    if (!name || typeof name !== 'string') return '?';
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
  }

  getTagIcon(tag: string): string {
    return RELATIONSHIP_ICONS[tag as keyof typeof RELATIONSHIP_ICONS] || '📌';
  }

  getGoalDaysRemaining(goalId: string): string | undefined {
    if (!goalId) return undefined;
    const goal = this.goals().find(g => g.id === goalId);
    if (!goal || !goal.targetDate) return undefined;
    const now = new Date();
    const target = new Date(goal.targetDate);
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Vencida';
    if (diffDays === 0) return 'Vence hoy';
    if (diffDays === 1) return 'Queda 1 día';
    return `Quedan ${diffDays} días`;
  }
}
