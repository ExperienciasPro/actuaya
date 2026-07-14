import { Injectable, inject, NgZone, ApplicationRef } from '@angular/core';
import { StorageService } from './storage.service';
import { GoalService } from './goal.service';
import { TaskService } from './task.service';
import { RadarService } from './radar.service';
import { environment } from '../../../environments/environment';

import { UserService } from './user.service';

/**
 * DataSyncService — Sincronización global de localStorage ↔ Servidor
 */
@Injectable({ providedIn: 'root' })
export class DataSyncService {
  private storage = inject(StorageService);
  private goalService = inject(GoalService);
  private taskService = inject(TaskService);
  private radarService = inject(RadarService);
  private userService = inject(UserService);
  private ngZone = inject(NgZone);
  private appRef = inject(ApplicationRef);
  private readonly API_URL = `${environment.apiUrl}/data`;
  private readonly AUTH_TOKEN = environment.authToken;
  private readonly UM_PREFIX = 'um_';
  private hasSynced = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Keys that are LOCAL to the current browser session and must NEVER be
   * overwritten by data coming from the server (nor uploaded to it).
   *  - um_user_profile : represents "who is logged in right now" on this device
   *  - um_setup_intro_seen : device-specific onboarding flag
   */
  private readonly SESSION_LOCAL_KEYS = new Set([
    'um_user_profile',
    'um_setup_intro_seen',
    'um_enabled_modules',
    'um_nav_order',
  ]);

  /** Todas las claves que se sincronizan */
  private getAllUmKeys(): string[] {
    return this.storage.getAllKeys(this.UM_PREFIX);
  }

  /** Recolecta todos los datos de localStorage con prefijo um_ */
  private collectLocalData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const key of this.getAllUmKeys()) {
      // Skip session-local keys — they must NOT be uploaded to the server
      if (this.SESSION_LOCAL_KEYS.has(key)) continue;
      try {
        const val = this.storage.get(key);
        if (val !== null && val !== undefined) {
          data[key] = val;
        }
      } catch {
        // Ignorar errores
      }
    }
    return data;
  }

  /**
   * Sincroniza desde el servidor al abrir la app.
   * Mérgea datos del servidor con localStorage (servidor gana si local está vacío).
   */
  async syncFromServer(): Promise<{ success: boolean; msg: string; goals: number; tasks: number; radar: number }> {
    try {
      console.log('[DataSync] Sincronizando desde servidor...');
      const response = await fetch(`${this.API_URL}?key=_bulk&_t=${Date.now()}`, {
        headers: { 'X-Auth-Token': this.AUTH_TOKEN },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.warn('[DataSync] Servidor respondió:', response.status);
        return { success: false, msg: `HTTP ${response.status}`, goals: 0, tasks: 0, radar: 0 };
      }

      const serverData: Record<string, unknown> = await response.json();
      const serverKeys = Object.keys(serverData);

      if (serverKeys.length === 0) {
        console.log('[DataSync] Servidor vacío, subiendo datos locales');
        this.hasSynced = true; // Permite subir los datos iniciales sembrados
        await this.saveToServer();
        return { success: true, msg: 'Servidor vacío -> subió local', goals: 0, tasks: 0, radar: 0 };
      }

      console.log('[DataSync] Datos del servidor:', serverKeys.length, 'claves');

      // Obtener el ID del usuario actualmente logueado
      const userId = this.userService.profile()?.id;

      // Extraer arreglos específicos del usuario (o genéricos si no está logueado aún)
      const goalsKey = userId ? `um_goals_${userId}` : 'um_goals';
      const tasksKey = userId ? `um_tasks_${userId}` : 'um_tasks';
      const radarKey = userId ? `um_radar_${userId}` : 'um_radar';

      const goalsArr = (serverData[goalsKey] as any[]) || [];
      let tasksArr = (serverData[tasksKey] as any[]) || [];
      const radarArr = (serverData[radarKey] as any[]) || [];

      // Purge orphan tasks whose associated goalId no longer exists
      if (serverData[goalsKey]) {
        const validGoalIds = new Set(goalsArr.map(g => g.id));
        tasksArr = tasksArr.filter(t => !t.goalId || validGoalIds.has(t.goalId));
      }

      // NUEVA ESTRATEGIA: Hidratación Directa en Memoria dentro del NgZone de Angular
      this.ngZone.run(() => {
        let restored = 0;
        for (const key of serverKeys) {
          // Las claves globales se restauran tal cual
          if (key === 'um_users' || key === 'um_subscribers' || key === 'um_subscriptions') {
            this.storage.set(key, serverData[key]);
            restored++;
          } else if (userId && key.endsWith(`_${userId}`)) {
            // Claves específicas de este usuario logueado
            const baseKey = key.substring(0, key.length - userId.length - 1); // Remover sufijo _userId
            if (baseKey.startsWith(this.UM_PREFIX) && !this.SESSION_LOCAL_KEYS.has(baseKey)) {
              const val = baseKey === 'um_tasks' ? tasksArr : serverData[key];
              this.storage.set(baseKey, val);
              restored++;
            }
          }
        }

        // Hidratar directamente los servicios reactivos para bypass de almacenamiento o Zone/Caches
        try { this.goalService.hydrateDirectly(goalsArr); } catch (err) { console.error('Error hidratando goals:', err); }
        try { this.taskService.hydrateDirectly(tasksArr); } catch (err) { console.error('Error hidratando tasks:', err); }
        try { this.radarService.hydrateDirectly(radarArr); } catch (err) { console.error('Error hidratando radar:', err); }
        try { this.userService.refreshActiveProfileFromList(); } catch (err) { console.error('Error actualizando perfil activo desde lista sincronizada:', err); }

        console.log(`[DataSync] Hidratadas incondicionalmente ${restored} claves desde el servidor`);
        this.hasSynced = true; // Sincronización exitosa
      });

      return {
        success: true,
        msg: `OK (${serverKeys.length} keys)`,
        goals: goalsArr.length,
        tasks: tasksArr.length,
        radar: radarArr.length,
      };
    } catch (e: any) {
      console.warn('[DataSync] Error sincronizando:', e);
      return { success: false, msg: e.message || 'Error de red', goals: 0, tasks: 0, radar: 0 };
    }
  }

  /**
   * Guarda TODOS los datos de localStorage al servidor.
   * Usa debounce para no hacer demasiadas peticiones.
   */
  saveToServerDebounced(): void {
    if (!this.hasSynced) {
      console.log('[DataSync] Evitando guardar: la sincronización inicial está pendiente.');
      return;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.saveToServer();
    }, 300); // Guardado ultrarrápido (300ms)
  }

  /** Guarda inmediatamente al servidor */
  async saveToServer(): Promise<void> {
    if (!this.hasSynced) {
      console.log('[DataSync] Evitando guardar al servidor: la sincronización inicial está pendiente.');
      return;
    }

    const userId = this.userService.profile()?.id;
    if (!userId) {
      console.log('[DataSync] Evitando guardar al servidor: no hay usuario logueado.');
      return;
    }

    try {
      const localData = this.collectLocalData();
      const payload: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(localData)) {
        if (key === 'um_users' || key === 'um_subscribers' || key === 'um_subscriptions') {
          payload[key] = val; // Mantener claves globales compartidas
        } else {
          payload[`${key}_${userId}`] = val; // Enlazar el ID del usuario como sufijo
        }
      }

      const keyCount = Object.keys(payload).length;
      if (keyCount === 0) return;

      console.log(`[DataSync] Guardando ${keyCount} claves del usuario ${userId} al servidor...`);
      const response = await fetch(`${this.API_URL}?key=_bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': this.AUTH_TOKEN,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('[DataSync] Respuesta:', result);
    } catch (e) {
      console.warn('[DataSync] Error guardando:', e);
    }
  }

  /** Exporta todos los datos como JSON para backup manual */
  exportBackup(): string {
    return JSON.stringify(this.collectLocalData(), null, 2);
  }

  /** Importa datos desde un backup JSON */
  importBackup(json: string): number {
    const data = JSON.parse(json);
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(this.UM_PREFIX)) {
        localStorage.setItem(key, JSON.stringify(value));
        count++;
      }
    }
    // Sincronizar al servidor
    this.saveToServer();
    return count;
  }
}
