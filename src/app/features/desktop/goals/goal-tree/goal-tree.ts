import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { GoalService } from '../../../../core/services/goal.service';
import { TaskService } from '../../../../core/services/task.service';
import { Goal, GoalMode } from '../../../../core/models/goal.model';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';

interface TreeNode {
  goal: Goal;
  children: TreeNode[];
  depth: number;
  taskCount: number;
}

@Component({
  selector: 'um-goal-tree',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="goal-tree-page">
      <!-- Header -->
      <div class="page-header animate-fadeInUp">
        <div class="header-left">
          <a class="back-link" routerLink="/d/goals">← Metas</a>
          <h1>🌳 Árbol de Metas</h1>
          <p class="header-subtitle">Visualiza la jerarquía y conexiones entre tus metas.</p>
        </div>
        <div class="header-actions">
          <div class="view-toggle">
            <button
              class="toggle-btn"
              [class.active]="viewMode() === 'tree'"
              (click)="viewMode.set('tree')"
            >🌲 Árbol</button>
            <button
              class="toggle-btn"
              [class.active]="viewMode() === 'map'"
              (click)="viewMode.set('map')"
            >🗺️ Mapa</button>
          </div>
          <a class="btn-primary" routerLink="/d/goals/new">+ Nueva meta</a>
        </div>
      </div>

      <!-- Tree Stats -->
      @if (goals().length) {
        <div class="tree-stats animate-fadeInUp stagger-1">
          <div class="stat">
            <span class="stat-value">{{ goals().length }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ rootNodes().length }}</span>
            <span class="stat-label">Raíces</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ maxDepth() }}</span>
            <span class="stat-label">Niveles</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ overallProgress() }}%</span>
            <span class="stat-label">Progreso</span>
          </div>
        </div>
      }

      <!-- Tree View -->
      @if (viewMode() === 'tree') {
        @if (treeNodes().length) {
          <div class="tree-container animate-fadeInUp stagger-2">
            @for (node of treeNodes(); track node.goal.id) {
              <ng-container *ngTemplateOutlet="treeNodeTpl; context: { $implicit: node }" />
            }
          </div>
        } @else {
          <um-empty-state
            icon="🌱"
            title="Tu árbol está vacío"
            subtitle="Crea tu primera meta para ver cómo crece tu árbol de objetivos."
          >
            <a class="btn-primary" routerLink="/d/goals/new">+ Plantar primera meta</a>
          </um-empty-state>
        }
      }

      <!-- Map View -->
      @if (viewMode() === 'map') {
        @if (treeNodes().length) {
          <div class="map-container animate-fadeInUp stagger-2">
            @for (node of treeNodes(); track node.goal.id) {
              <div class="map-cluster">
                <div class="map-root-node">
                  <a class="map-card root" [routerLink]="['/d/goals', node.goal.id]">
                    <span class="map-icon">{{ getModeIcon(node.goal.mode) }}</span>
                    <span class="map-title">{{ node.goal.title }}</span>
                    <div class="map-bar">
                      <div class="map-bar-fill" [style.width.%]="node.goal.progress"></div>
                    </div>
                  </a>
                </div>
                @if (node.children.length) {
                  <div class="map-children">
                    @for (child of node.children; track child.goal.id) {
                      <a class="map-card child" [routerLink]="['/d/goals', child.goal.id]">
                        <span class="map-icon">{{ getModeIcon(child.goal.mode) }}</span>
                        <span class="map-title">{{ child.goal.title }}</span>
                        <span class="map-pct">{{ child.goal.progress }}%</span>
                      </a>
                    }
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <um-empty-state
            icon="🗺️"
            title="Mapa vacío"
            subtitle="Crea metas para ver tu mapa de objetivos."
          >
            <a class="btn-primary" routerLink="/d/goals/new">+ Crear meta</a>
          </um-empty-state>
        }
      }

      <!-- Template for tree nodes (recursive rendering via flat structure) -->
      <ng-template #treeNodeTpl let-node>
        <div class="tree-node" [style.padding-left.px]="node.depth * 32">
          <!-- Connector Line -->
          @if (node.depth > 0) {
            <div class="tree-connector">
              <span class="connector-line"></span>
              <span class="connector-dot"></span>
            </div>
          }

          <a class="tree-card" [routerLink]="['/d/goals', node.goal.id]" [class]="'depth-' + node.depth">
            <div class="tree-card-left">
              <span class="tree-mode">{{ getModeIcon(node.goal.mode) }}</span>
              <div class="tree-card-info">
                <span class="tree-title">{{ node.goal.title }}</span>
                <div class="tree-meta-row">
                  <um-status-badge [variant]="node.goal.status" />
                  <span class="tree-tasks">{{ node.taskCount }} tareas</span>
                </div>
              </div>
            </div>
            <div class="tree-card-right">
              <div class="tree-progress-bar">
                <div class="tree-progress-fill" [style.width.%]="node.goal.progress" [style.background]="getProgressGradient(node.goal.progress)"></div>
              </div>
              <span class="tree-pct">{{ node.goal.progress }}%</span>
            </div>
          </a>
        </div>

        <!-- Render children recursively (flat) -->
        @for (child of node.children; track child.goal.id) {
          <ng-container *ngTemplateOutlet="treeNodeTpl; context: { $implicit: child }" />
        }
      </ng-template>
    </div>
  `,
  styleUrl: 'goal-tree.scss',
})
export class GoalTreeComponent {
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);

  goals = this.goalService.goals;
  viewMode = signal<'tree' | 'map'>('tree');

  rootNodes = computed(() => this.goalService.getRootGoals());

  treeNodes = computed((): TreeNode[] => {
    const roots = this.rootNodes();
    return roots.map((g) => this.buildNode(g, 0));
  });

  maxDepth = computed(() => {
    let max = 0;
    const traverse = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        max = Math.max(max, n.depth + 1);
        traverse(n.children);
      }
    };
    traverse(this.treeNodes());
    return max;
  });

  overallProgress = computed(() => {
    const all = this.goals();
    if (!all.length) return 0;
    return Math.round(all.reduce((s, g) => s + g.progress, 0) / all.length);
  });

  private buildNode(goal: Goal, depth: number): TreeNode {
    const children = this.goalService.getChildren(goal.id);
    return {
      goal,
      depth,
      taskCount: this.taskService.getByGoalId(goal.id).length,
      children: children.map((c) => this.buildNode(c, depth + 1)),
    };
  }

  getModeIcon(mode: GoalMode): string {
    return { leader: '🧠', business: '📋' }[mode];
  }

  getProgressGradient(progress: number): string {
    if (progress >= 80) return 'linear-gradient(90deg, #00cec9, #55efc4)';
    if (progress >= 50) return 'linear-gradient(90deg, #6c5ce7, #a29bfe)';
    return 'linear-gradient(90deg, #54a0ff, #74b9ff)';
  }
}
