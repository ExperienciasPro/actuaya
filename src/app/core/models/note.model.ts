export interface QuickNote {
  id: string;
  goalId?: string;
  taskId?: string;
  dealId?: string;
  content: string;
  type: NoteType;
  createdAt: Date;
  source: 'desktop' | 'mobile';
}

export type NoteType = 'general' | 'call_result' | 'meeting_update' | 'status_update' | 'idea';
