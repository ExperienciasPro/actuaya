import { Injectable, signal, computed, inject } from '@angular/core';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';

// ═══════════════════════════════════════════
// ActuaYa — Servicio de Recordatorios Remotos
// ═══════════════════════════════════════════
// Sincroniza recordatorios push desde el backend
// PHP que recibe datos automáticos de n8n.
// ═══════════════════════════════════════════

export interface RemoteReminder {
  id: string;
  type: 'task' | 'goal' | 'radar' | 'general';
  title: string;
  message: string;
  icon: string;
  priority: 'low' | 'normal' | 'high';
  createdAt: string;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private userService = inject(UserService);

  private readonly backendUrl = '/api/reminders';

  // — Signals —
  reminders = signal<RemoteReminder[]>([]);
  loading = signal(false);

  // — Computed —
  unreadCount = computed(() => this.reminders().filter(r => !r.read).length);
  highPriority = computed(() => this.reminders().filter(r => r.priority === 'high' && !r.read));

  /** Fetch pending reminders from server */
  async sync(): Promise<void> {
    const userId = this.userService.profile()?.id;
    if (!userId) return;

    this.loading.set(true);
    try {
      const res = await fetch(`${this.backendUrl}?user=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RemoteReminder[] = await res.json();
      this.reminders.set(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('ReminderService: sync failed', e);
    } finally {
      this.loading.set(false);
    }
  }

  /** Mark a reminder as read */
  async acknowledge(id: string): Promise<void> {
    const userId = this.userService.profile()?.id;
    if (!userId) return;

    try {
      await fetch(`${this.backendUrl}?action=ack&id=${encodeURIComponent(id)}&user=${encodeURIComponent(userId)}`);
      // Update local state
      this.reminders.update(list =>
        list.map(r => r.id === id ? { ...r, read: true } : r)
      );
    } catch (e) {
      console.warn('ReminderService: ack failed', e);
    }
  }

  /** Dismiss all reminders */
  async dismissAll(): Promise<void> {
    for (const r of this.reminders().filter(x => !x.read)) {
      await this.acknowledge(r.id);
    }
  }
}
