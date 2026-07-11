import { Injectable, signal, computed, effect } from '@angular/core';
import { Project, ProjectSection, ProjectTask, TaskPriority, TeamMember } from '../models/project.model';
import { StorageService } from './storage.service';

const SECTION_COLORS = ['#6c5ce7', '#00cec9', '#e84393', '#54a0ff', '#feca57', '#fd79a8', '#a29bfe', '#55efc4'];
const MEMBER_COLORS = ['#6c5ce7', '#00cec9', '#e17055', '#0984e3', '#fdcb6e', '#e84393', '#00b894', '#d63031', '#a29bfe', '#55efc4'];

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly STORAGE_KEY = 'um_projects';

  private projectsSignal = signal<Project[]>([]);

  readonly projects = this.projectsSignal.asReadonly();

  constructor(private storage: StorageService) {
    this.loadFromStorage();
    effect(() => {
      if (this.storage.updateToken() >= 0) {
        this.loadFromStorage();
      }
    });
  }

  // ─── Project CRUD ────────────────────────────

  create(data: { name: string; description?: string }): Project {
    const defaultSections: ProjectSection[] = [
      { id: crypto.randomUUID(), name: 'Por hacer', order: 0, color: '#8b95a9' },
      { id: crypto.randomUUID(), name: 'En progreso', order: 1, color: '#6c5ce7' },
      { id: crypto.randomUUID(), name: 'Completado', order: 2, color: '#00cec9' },
    ];

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      description: data.description?.trim() || '',
      members: [],
      sections: defaultSections,
      tasks: [],
      progress: 0,
      startDate: new Date(),
      targetEndDate: new Date(Date.now() + 90 * 86400000),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.projectsSignal.update((p) => [...p, newProject]);
    this.saveToStorage();
    return newProject;
  }

  update(id: string, changes: Partial<Project>): void {
    this.projectsSignal.update((projects) =>
      projects.map((p) => (p.id === id ? { ...p, ...changes, updatedAt: new Date() } : p))
    );
    this.saveToStorage();
  }

  delete(id: string): void {
    this.projectsSignal.update((p) => p.filter((proj) => proj.id !== id));
    this.saveToStorage();
  }

  getById(id: string): Project | undefined {
    return this.projectsSignal().find((p) => p.id === id);
  }

  // ─── Team Members ────────────────────────────

  addMember(projectId: string, name: string, role?: string, email?: string): TeamMember {
    const project = this.getById(projectId);
    const colorIdx = (project?.members.length || 0) % MEMBER_COLORS.length;
    const member: TeamMember = {
      id: crypto.randomUUID(),
      name: name.trim(),
      role: role?.trim() || '',
      email: email?.trim() || '',
      color: MEMBER_COLORS[colorIdx],
      avatar: name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    };

    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        return { ...p, members: [...(p.members || []), member], updatedAt: new Date() };
      })
    );
    this.saveToStorage();
    return member;
  }

  updateMember(projectId: string, memberId: string, changes: Partial<TeamMember>): void {
    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          updatedAt: new Date(),
          members: (p.members || []).map((m) => (m.id === memberId ? { ...m, ...changes } : m)),
        };
      })
    );
    this.saveToStorage();
  }

  removeMember(projectId: string, memberId: string): void {
    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        // Also unassign tasks belonging to this member
        const member = (p.members || []).find(m => m.id === memberId);
        const updatedTasks = member
          ? p.tasks.map(t => t.assignee === member.name ? { ...t, assignee: undefined } : t)
          : p.tasks;
        return {
          ...p,
          members: (p.members || []).filter((m) => m.id !== memberId),
          tasks: updatedTasks,
          leaderId: p.leaderId === memberId ? undefined : p.leaderId,
          updatedAt: new Date(),
        };
      })
    );
    this.saveToStorage();
  }

  setLeader(projectId: string, memberId: string | undefined): void {
    this.update(projectId, { leaderId: memberId } as any);
  }

  // ─── Sections ────────────────────────────

  addSection(projectId: string, name: string): void {
    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        const order = p.sections.length;
        const color = SECTION_COLORS[order % SECTION_COLORS.length];
        const newSection: ProjectSection = {
          id: crypto.randomUUID(),
          name: name.trim(),
          order,
          color,
        };
        return { ...p, sections: [...p.sections, newSection], updatedAt: new Date() };
      })
    );
    this.saveToStorage();
  }

  updateSection(projectId: string, sectionId: string, changes: Partial<ProjectSection>): void {
    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          updatedAt: new Date(),
          sections: p.sections.map((s) => (s.id === sectionId ? { ...s, ...changes } : s)),
        };
      })
    );
    this.saveToStorage();
  }

  removeSection(projectId: string, sectionId: string): void {
    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          updatedAt: new Date(),
          sections: p.sections.filter((s) => s.id !== sectionId),
          tasks: p.tasks.filter((t) => t.sectionId !== sectionId),
        };
      })
    );
    this.saveToStorage();
    this.recalcProgress(projectId);
  }

  // ─── Tasks ────────────────────────────

  addTask(projectId: string, sectionId: string, title: string): ProjectTask {
    const task: ProjectTask = {
      id: crypto.randomUUID(),
      sectionId,
      title: title.trim(),
      priority: 'medium',
      completed: false,
      order: 0,
      createdAt: new Date().toISOString(),
    };

    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        const sectionTasks = p.tasks.filter((t) => t.sectionId === sectionId);
        task.order = sectionTasks.length;
        return { ...p, tasks: [...p.tasks, task], updatedAt: new Date() };
      })
    );
    this.saveToStorage();
    this.recalcProgress(projectId);
    return task;
  }

  updateTask(projectId: string, taskId: string, changes: Partial<ProjectTask>): void {
    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          updatedAt: new Date(),
          tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...changes } : t)),
        };
      })
    );
    this.saveToStorage();
    this.recalcProgress(projectId);
  }

  toggleTask(projectId: string, taskId: string): void {
    const project = this.getById(projectId);
    if (!project) return;
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return;
    this.updateTask(projectId, taskId, { completed: !task.completed });
  }

  deleteTask(projectId: string, taskId: string): void {
    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        return { ...p, tasks: p.tasks.filter((t) => t.id !== taskId), updatedAt: new Date() };
      })
    );
    this.saveToStorage();
    this.recalcProgress(projectId);
  }

  moveTask(projectId: string, taskId: string, newSectionId: string): void {
    this.updateTask(projectId, taskId, { sectionId: newSectionId });
  }

  reorderTask(projectId: string, taskId: string, newIndex: number): void {
    this.projectsSignal.update((projects) =>
      projects.map((p) => {
        if (p.id !== projectId) return p;
        const task = p.tasks.find((t) => t.id === taskId);
        if (!task) return p;

        // Get tasks in the target section, excluding the dragged one
        const sectionTasks = p.tasks
          .filter((t) => t.sectionId === task.sectionId && t.id !== taskId)
          .sort((a, b) => a.order - b.order);

        // Insert at target position
        sectionTasks.splice(newIndex, 0, task);

        // Reassign order values
        const reordered = sectionTasks.map((t, i) => ({ ...t, order: i }));

        // Replace section tasks with reordered ones, keep other sections untouched
        const otherTasks = p.tasks.filter((t) => t.sectionId !== task.sectionId);

        return { ...p, tasks: [...otherTasks, ...reordered], updatedAt: new Date() };
      })
    );
    this.saveToStorage();
  }

  // ─── Progress ────────────────────────────

  private recalcProgress(projectId: string): void {
    const p = this.getById(projectId);
    if (!p || !p.tasks.length) {
      this.update(projectId, { progress: 0 });
      return;
    }
    const completed = p.tasks.filter((t) => t.completed).length;
    this.update(projectId, { progress: Math.round((completed / p.tasks.length) * 100) });
  }

  // ─── Migration & Storage ────────────────────────────

  private loadFromStorage(): void {
    const data = this.storage.get<Project[]>(this.STORAGE_KEY);
    if (data) {
      // Migrate old projects that use stages instead of sections
      const migrated = data.map((p) => this.migrateProject(p));
      this.projectsSignal.set(migrated);
    }
  }

  private migrateProject(p: any): Project {
    // Ensure members array exists (for projects created before team feature)
    if (!p.members) p.members = [];

    // If project already has sections, no migration needed
    if (p.sections && p.sections.length) return p;

    // Migrate stages → sections
    const stages: any[] = p.stages || [];
    const sections: ProjectSection[] = stages.map((s: any, i: number) => ({
      id: s.id || crypto.randomUUID(),
      name: s.name,
      order: i,
      color: s.color || SECTION_COLORS[i % SECTION_COLORS.length],
    }));

    // Default sections if none exist
    if (!sections.length) {
      sections.push(
        { id: crypto.randomUUID(), name: 'Por hacer', order: 0, color: '#8b95a9' },
        { id: crypto.randomUUID(), name: 'En progreso', order: 1, color: '#6c5ce7' },
        { id: crypto.randomUUID(), name: 'Completado', order: 2, color: '#00cec9' },
      );
    }

    return { ...p, sections, tasks: p.tasks || [] };
  }

  /** @deprecated */
  updateStage(projectId: string, stageId: string, changes: any): void {
    // no-op — kept for backward compatibility during migration
  }

  private saveToStorage(): void {
    this.storage.set(this.STORAGE_KEY, this.projectsSignal());
  }
}
