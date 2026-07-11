import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ProjectService } from '../../../../core/services/project.service';

@Component({
  selector: 'um-project-timeline',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="timeline-page">
      @if (project(); as p) {
        <div class="page-header animate-fadeInUp">
          <a class="back-link" [routerLink]="['/d/projects', p.id]">← {{ p.name }}</a>
          <h1>Timeline del Proyecto</h1>
          <p class="header-subtitle">{{ p.sections.length }} secciones · {{ p.progress }}% completado</p>
        </div>

        <!-- Timeline -->
        <div class="timeline animate-fadeInUp stagger-1">
          <!-- Overall Bar -->
          <div class="overall-bar">
            <div class="bar-track">
              <div class="bar-fill" [style.width.%]="p.progress"></div>
            </div>
            <div class="bar-labels">
              <span>{{ p.startDate | date:'dd MMM yyyy' }}</span>
              <span>{{ p.targetEndDate | date:'dd MMM yyyy' }}</span>
            </div>
          </div>

          <!-- Section Timeline -->
          <div class="stages-timeline">
            @for (section of p.sections; track section.id; let i = $index; let last = $last) {
              <div class="timeline-item"
                [class.completed]="getSectionProgress(section.id) === 100"
                [class.active]="getSectionProgress(section.id) > 0 && getSectionProgress(section.id) < 100">
                <div class="timeline-marker">
                  <div class="marker-dot" [style.background]="section.color">
                    @if (getSectionProgress(section.id) === 100) {
                      <span class="marker-check">✓</span>
                    }
                  </div>
                  @if (!last) {
                    <div class="marker-line" [class.done]="getSectionProgress(section.id) === 100"></div>
                  }
                </div>
                <div class="timeline-content">
                  <div class="tl-header">
                    <span class="tl-name">{{ section.name }}</span>
                    <span class="tl-status">{{ getSectionTaskCount(section.id) }} tareas</span>
                  </div>
                  <div class="tl-bar">
                    <div class="tl-bar-fill" [style.width.%]="getSectionProgress(section.id)" [style.background]="section.color"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Summary -->
        <div class="summary animate-fadeInUp stagger-2">
          <div class="summary-card">
            <span class="summary-value">{{ completedTasks() }}</span>
            <span class="summary-label">Tareas completadas</span>
          </div>
          <div class="summary-card">
            <span class="summary-value">{{ daysRemaining() }}</span>
            <span class="summary-label">Días restantes</span>
          </div>
          <div class="summary-card">
            <span class="summary-value">{{ p.progress }}%</span>
            <span class="summary-label">Progreso total</span>
          </div>
        </div>
      } @else {
        <div class="not-found animate-fadeInUp">
          <span class="nf-icon">🔍</span>
          <h2>Proyecto no encontrado</h2>
          <a class="btn-primary" routerLink="/d/projects">Volver a proyectos</a>
        </div>
      }
    </div>
  `,
  styleUrl: 'project-timeline.scss',
})
export class ProjectTimelineComponent {
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);

  private projectId = this.route.snapshot.paramMap.get('id') || '';
  project = computed(() => this.projectService.getById(this.projectId));

  completedTasks = computed(() =>
    (this.project()?.tasks || []).filter(t => t.completed).length
  );

  daysRemaining = computed(() => {
    const p = this.project();
    if (!p) return 0;
    return Math.max(0, Math.ceil((new Date(p.targetEndDate).getTime() - Date.now()) / 86400000));
  });

  getSectionProgress(sectionId: string): number {
    const tasks = (this.project()?.tasks || []).filter(t => t.sectionId === sectionId);
    if (!tasks.length) return 0;
    return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
  }

  getSectionTaskCount(sectionId: string): number {
    return (this.project()?.tasks || []).filter(t => t.sectionId === sectionId).length;
  }
}
