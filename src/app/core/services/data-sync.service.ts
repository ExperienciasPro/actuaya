import { Injectable, inject, NgZone, ApplicationRef } from '@angular/core';
import { StorageService } from './storage.service';
import { GoalService } from './goal.service';
import { TaskService } from './task.service';
import { RadarService } from './radar.service';
import { environment } from '../../../environments/environment';

import { UserService } from './user.service';

/**
 * DataSyncService — Sincronización global de localStorage ↔ Servidor
 *
 * Ahora que StorageService maneja el scoping por usuario transparentemente,
 * las claves en localStorage y en el servidor usan el mismo formato:
 *   - Globales: um_users, um_subscribers, um_subscriptions (sin sufijo)
 *   - Por usuario: um_goals_sa-001, um_cashflow_sa-001, etc. (con sufijo)
 *
 * StorageService.get('um_goals') internamente lee um_goals_sa-001 de localStorage.
 * Así que collectLocalData() ya recoge las claves reales con sufijo.
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
  private isSyncing = false; // Fix A1: mutex para evitar llamadas concurrentes
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Keys that are LOCAL to the current browser session and must NEVER be
   * overwritten by data coming from the server (nor uploaded to it).
   */
  private readonly SESSION_LOCAL_KEYS = new Set([
    'um_user_profile',
    'um_enabled_modules',
    'um_nav_order',
  ]);

  /** Claves globales compartidas entre todos los usuarios */
  private readonly GLOBAL_KEYS = new Set([
    'um_users',
    'um_subscribers',
    'um_subscriptions',
  ]);

  /** Todas las claves um_ de localStorage (ya con sufijo de usuario si aplica) */
  private getAllUmKeys(): string[] {
    return this.storage.getAllKeys(this.UM_PREFIX);
  }

  /**
   * Recolecta todos los datos de localStorage con prefijo um_.
   * Las claves ya están scoped por StorageService (ej. um_goals_sa-001).
   * Solo filtramos las session-local y las que no pertenecen al usuario actual.
   */
  private collectLocalData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const userId = this.storage.getActiveUserId();

    for (const key of this.getAllUmKeys()) {
      // Skip session-local keys
      if (this.SESSION_LOCAL_KEYS.has(key)) continue;
      // Skip migration flags
      if (key.includes('_migrated_v2_')) continue;

      // Si es una clave global, incluirla
      if (this.GLOBAL_KEYS.has(key)) {
        try {
          const val = this.storage.getUnscoped(key);
          if (val !== null && val !== undefined) data[key] = val;
        } catch {}
        continue;
      }

      // Solo incluir claves que pertenecen al usuario actual (tienen su sufijo)
      if (userId && key.endsWith(`_${userId}`)) {
        try {
          const val = this.storage.getUnscoped(key);
          if (val !== null && val !== undefined) data[key] = val;
        } catch {}
      }
    }
    return data;
  }

  /**
   * Sincroniza desde el servidor al abrir la app.
   * Descarga datos del servidor y los restaura en localStorage.
   */
  async syncFromServer(): Promise<{ success: boolean; msg: string; goals: number; tasks: number; radar: number }> {
    // Fix A1: evitar llamadas concurrentes
    if (this.isSyncing) {
      console.log('[DataSync] Sincronización ya en progreso, ignorando llamada duplicada.');
      return { success: true, msg: 'Ya sincronizando', goals: 0, tasks: 0, radar: 0 };
    }
    this.isSyncing = true;

    const userId = this.storage.getActiveUserId();
    if (!userId) {
      console.log('[DataSync] No hay usuario activo, saltando sincronización.');
      this.isSyncing = false;
      return { success: false, msg: 'No user', goals: 0, tasks: 0, radar: 0 };
    }

    // Fix C6: retry con backoff exponencial (3 intentos)
    let lastError = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[DataSync] Sincronizando desde servidor (intento ${attempt}/3, user=${userId})...`);
        const response = await fetch(`${this.API_URL}?key=_bulk&_t=${Date.now()}`, {
          headers: { 'X-Auth-Token': this.AUTH_TOKEN },
          cache: 'no-store',
        });

        if (!response.ok) {
          lastError = `HTTP ${response.status}`;
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          break;
        }

        const serverData: Record<string, unknown> = await response.json();
        const serverKeys = Object.keys(serverData);

        if (serverKeys.length === 0) {
          console.log('[DataSync] Servidor vacío, subiendo datos locales');
          this.hasSynced = true;
          this.isSyncing = false;
          await this.saveToServer();
          return { success: true, msg: 'Servidor vacío -> subió local', goals: 0, tasks: 0, radar: 0 };
        }

        console.log('[DataSync] Datos del servidor:', serverKeys.length, 'claves');

        // ── Helper: buscar primero la clave scoped, luego la legacy ──
        const getArray = (baseKey: string): any[] => {
          const scopedKey = `${baseKey}_${userId}`;
          if (serverData[scopedKey] && Array.isArray(serverData[scopedKey])) {
            return serverData[scopedKey] as any[];
          }
          // Fallback: clave legacy sin sufijo (datos pre-migración)
          if (serverData[baseKey] && Array.isArray(serverData[baseKey])) {
            console.log(`[DataSync] Migración servidor: usando clave legacy '${baseKey}'`);
            return serverData[baseKey] as any[];
          }
          return [];
        };

        const getValue = (baseKey: string): unknown => {
          const scopedKey = `${baseKey}_${userId}`;
          if (serverData[scopedKey] !== undefined) return serverData[scopedKey];
          if (serverData[baseKey] !== undefined) return serverData[baseKey];
          return undefined;
        };

        const goalsArr = getArray('um_goals');
        let tasksArr = getArray('um_tasks');
        const radarArr = getArray('um_radar');

        // Purge orphan tasks
        if (goalsArr.length > 0) {
          const validGoalIds = new Set(goalsArr.map(g => g.id));
          tasksArr = tasksArr.filter(t => !t.goalId || validGoalIds.has(t.goalId));
        }

        // Hidratación directa en NgZone de Angular
        this.ngZone.run(() => {
          let restored = 0;

          // 1. Restaurar claves globales directamente (sin scoping)
          for (const key of serverKeys) {
            if (this.GLOBAL_KEYS.has(key)) {
              this.storage.setUnscoped(key, serverData[key]);
              restored++;
            }
          }

          // 2. Restaurar claves del usuario
          // Recopilar baseKeys únicas del servidor para este usuario
          const processedBaseKeys = new Set<string>();
          for (const key of serverKeys) {
            if (this.GLOBAL_KEYS.has(key) || this.SESSION_LOCAL_KEYS.has(key)) continue;
            if (key.includes('_migrated_v2_')) continue;

            let baseKey: string | null = null;

            // Clave scoped para ESTE usuario → extraer base
            if (key.endsWith(`_${userId}`)) {
              baseKey = key.substring(0, key.length - userId.length - 1);
            }
            // Clave legacy sin sufijo de usuario → candidata a migración
            else if (!key.match(/_[a-z]+-[a-z0-9]{5,}$/i)) {
              // No tiene formato de userId al final → es legacy
              baseKey = key;
            }
            // Clave scoped para OTRO usuario → ignorar
            else {
              continue;
            }

            if (!baseKey || !baseKey.startsWith(this.UM_PREFIX)) continue;
            if (this.SESSION_LOCAL_KEYS.has(baseKey)) continue;
            if (processedBaseKeys.has(baseKey)) continue;
            processedBaseKeys.add(baseKey);

            const val = getValue(baseKey);
            if (val !== undefined) {
              // storage.set('um_goals', data) → internamente escribe um_goals_sa-001
              this.storage.set(baseKey, val);
              restored++;
            }
          }

          // Hidratar servicios reactivos
          try { this.goalService.hydrateDirectly(goalsArr); } catch (err) { console.error('Error hidratando goals:', err); }
          try { this.taskService.hydrateDirectly(tasksArr); } catch (err) { console.error('Error hidratando tasks:', err); }
          try { this.radarService.hydrateDirectly(radarArr); } catch (err) { console.error('Error hidratando radar:', err); }
          try { this.userService.refreshActiveProfileFromList(); } catch (err) { console.error('Error actualizando perfil activo:', err); }

          console.log(`[DataSync] Hidratadas ${restored} claves del servidor`);
          this.hasSynced = true;
        });

        // 3. Auto-migración servidor: re-guardar con claves scoped
        const needsMigration = serverKeys.some(k =>
          k.startsWith(this.UM_PREFIX) &&
          !this.GLOBAL_KEYS.has(k) &&
          !this.SESSION_LOCAL_KEYS.has(k) &&
          !k.endsWith('_' + userId) &&
          !k.match(/_[a-z]+-[a-z0-9]{5,}$/i)
        );
        if (needsMigration) {
          console.log('[DataSync] Data legacy detectada en servidor. Re-guardando con scope...');
          setTimeout(() => this.saveToServer(), 2000);
        }

        this.isSyncing = false;
        return {
          success: true,
          msg: `OK (${serverKeys.length} keys)`,
          goals: goalsArr.length,
          tasks: tasksArr.length,
          radar: radarArr.length,
        };
      } catch (e: any) {
        lastError = e.message || 'Error de red';
        console.warn(`[DataSync] Intento ${attempt}/3 falló:`, lastError);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    // Fix C6: si todos los intentos fallan, aún permite guardar localmente
    console.warn('[DataSync] Todos los intentos de sync fallaron. Habilitando guardado local.');
    this.hasSynced = true;
    this.isSyncing = false;
    return { success: false, msg: lastError, goals: 0, tasks: 0, radar: 0 };
  }

  /**
   * Guarda TODOS los datos de localStorage al servidor.
   * Usa debounce para no hacer demasiadas peticiones.
   */
  saveToServerDebounced(): void {
    if (!this.hasSynced) return;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.saveToServer();
    }, 300);
  }

  /** Guarda inmediatamente al servidor */
  async saveToServer(): Promise<void> {
    if (!this.hasSynced) return;

    const userId = this.storage.getActiveUserId();
    if (!userId) {
      console.log('[DataSync] Evitando guardar al servidor: no hay usuario activo.');
      return;
    }

    // Fix A5: retry con backoff (3 intentos)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const payload = this.collectLocalData();
        const keyCount = Object.keys(payload).length;
        if (keyCount === 0) return;

        console.log(`[DataSync] Guardando ${keyCount} claves al servidor...`);
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
        return; // Éxito
      } catch (e) {
        console.warn(`[DataSync] Error guardando (intento ${attempt}/3):`, e);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }
    }
  }

  /**
   * Guardado de emergencia para beforeunload/pagehide.
   * Usa navigator.sendBeacon() que es confiable durante el cierre de pestaña.
   */
  saveToServerBeacon(): void {
    if (!this.hasSynced) return;
    const userId = this.storage.getActiveUserId();
    if (!userId) return;

    try {
      const payload = this.collectLocalData();
      if (Object.keys(payload).length === 0) return;

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = `${this.API_URL}?key=_bulk&token=${this.AUTH_TOKEN}`;
      navigator.sendBeacon(url, blob);
      console.log('[DataSync] Beacon enviado al cerrar pestaña');
    } catch (e) {
      console.warn('[DataSync] Error en beacon:', e);
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
        // Fix M1: usar StorageService en vez de localStorage directo
        this.storage.setUnscoped(key, value);
        count++;
      }
    }
    this.saveToServer();
    return count;
  }
}
