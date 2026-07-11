import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TaskService } from '../../../core/services/task.service';
import { GoalService } from '../../../core/services/goal.service';

@Component({
  selector: 'um-quick-capture',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="capture-screen">
      <div class="capture-header animate-fadeInUp">
        <span class="capture-icon">⚡</span>
        <h1>Captura Rápida</h1>
        <p class="capture-subtitle">Anota lo que necesitas sin perder el ritmo.</p>
      </div>

      <!-- Capture Card -->
      <div class="capture-card animate-fadeInUp stagger-1">
        <input
          class="capture-input main-input"
          type="text"
          [(ngModel)]="taskTitle"
          placeholder="¿Qué necesitas hacer?"
          (keyup.enter)="saveTask()"
          autofocus
        />

        <!-- Expanded Options -->
        @if (taskTitle().trim().length > 0) {
          <div class="expanded-options animate-fadeInUp">
            <textarea
              class="capture-input desc-input"
              [(ngModel)]="taskDescription"
              placeholder="Descripción (opcional)"
              rows="2"
            ></textarea>

            <div class="option-row">
              <label class="option-label">Prioridad</label>
              <div class="priority-selector">
                @for (p of priorities; track p.value) {
                  <button class="priority-btn" [class]="p.value" [class.active]="priority() === p.value" (click)="priority.set(p.value)">
                    {{ p.label }}
                  </button>
                }
              </div>
            </div>

            @if (goals().length) {
              <div class="option-row">
                <label class="option-label">Meta asociada</label>
                <select class="capture-input select-input" [(ngModel)]="goalId">
                  <option value="">Sin meta</option>
                  @for (g of goals(); track g.id) {
                    <option [value]="g.id">{{ g.title }}</option>
                  }
                </select>
              </div>
            }

            <div class="option-row">
              <label class="option-label">Tiempo estimado</label>
              <div class="time-selector">
                @for (t of timeOptions; track t) {
                  <button class="time-btn" [class.active]="estimatedMinutes() === t" (click)="estimatedMinutes.set(t)">
                    {{ t }}m
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <button class="save-btn" [disabled]="!taskTitle().trim()" (click)="saveTask()">
          ✓ Guardar Tarea
        </button>
      </div>

      <!-- Recent Captures -->
      @if (recentCaptures().length) {
        <div class="recent-section animate-fadeInUp stagger-2">
          <h3 class="section-title">Capturadas hoy</h3>
          @for (t of recentCaptures(); track t.id) {
            <div class="recent-item">
              <span class="recent-dot" [class]="t.priority"></span>
              <span class="recent-name">{{ t.title }}</span>
            </div>
          }
        </div>
      }

      <!-- Success Toast -->
      @if (showSuccess()) {
        <div class="success-toast animate-fadeInUp">✓ Tarea guardada</div>
      }
    </div>
  `,
  styleUrl: 'quick-capture.scss',
})
export class QuickCaptureComponent {
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);

  taskTitle = signal('');
  taskDescription = signal('');
  priority = signal<'medium' | 'low' | 'high' | 'critical'>('medium');
  goalId = signal('');
  estimatedMinutes = signal(25);
  showSuccess = signal(false);

  goals = this.goalService.goals;
  priorities = [
    { value: 'low' as const, label: 'Bajo' },
    { value: 'medium' as const, label: 'Media' },
    { value: 'high' as const, label: 'Alta' },
    { value: 'critical' as const, label: 'Urgente' },
  ];
  timeOptions = [5, 15, 25, 45, 60];

  recentCaptures = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.taskService.tasks().filter(t => {
      const d = new Date(t.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).slice(-5).reverse();
  };

  saveTask(): void {
    if (!this.taskTitle().trim()) return;
    const tasks = this.taskService.tasks();
    this.taskService.create({
      title: this.taskTitle().trim(),
      description: this.taskDescription().trim(),
      priority: this.priority(),
      status: 'pending',
      goalId: this.goalId() || '',
      estimatedMinutes: this.estimatedMinutes(),
      order: tasks.length,
    });
    this.taskTitle.set('');
    this.taskDescription.set('');
    this.priority.set('medium');
    this.goalId.set('');
    this.estimatedMinutes.set(25);
    this.showSuccess.set(true);
    setTimeout(() => this.showSuccess.set(false), 2000);
  }
}
