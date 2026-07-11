import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private permission: NotificationPermission = 'default';

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('NotificationService: Browser does not support notifications');
      return false;
    }
    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  send(title: string, options?: NotificationOptions): void {
    if (this.permission !== 'granted') return;

    try {
      new Notification(title, {
        icon: '/assets/icons/logo-192.png',
        badge: '/assets/icons/logo-192.png',
        ...options,
      });
    } catch (error) {
      console.error('NotificationService: Failed to send notification', error);
    }
  }

  sendBriefing(goalTitle: string, taskTitle: string): void {
    this.send('☀️ Tu briefing de hoy', {
      body: `Para avanzar en "${goalTitle}", tu prioridad es: ${taskTitle}`,
      tag: 'daily-briefing',
    });
  }

  sendCelebration(tasksCompleted: number): void {
    this.send('🎉 ¡Semana completada!', {
      body: `Completaste ${tasksCompleted} tareas esta semana. ¡Excelente trabajo!`,
      tag: 'weekly-celebration',
    });
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  isGranted(): boolean {
    return this.permission === 'granted';
  }
}
