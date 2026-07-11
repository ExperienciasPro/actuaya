export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  email?: string;
  color: string;
  avatar?: string; // emoji or initials
}

export interface Project {
  id: string;
  name: string;
  description: string;
  leaderId?: string; // TeamMember id
  members: TeamMember[];
  sections: ProjectSection[];
  tasks: ProjectTask[];
  progress: number; // 0-100
  startDate: Date;
  targetEndDate: Date;
  actualEndDate?: Date;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;

  /** @deprecated — migrated to sections */
  stages?: ProjectStage[];
}

export interface ProjectSection {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface ProjectTask {
  id: string;
  sectionId: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority: TaskPriority;
  completed: boolean;
  order: number;
  createdAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';

/** @deprecated — use ProjectSection */
export interface ProjectStage {
  id: string;
  projectId: string;
  name: string;
  order: number;
  color: string;
  status: StageStatus;
  taskIds: string[];
  startDate?: Date;
  endDate?: Date;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type StageStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
