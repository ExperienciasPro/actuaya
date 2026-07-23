import { Injectable, inject, NgZone, ApplicationRef } from '@angular/core';
import { StorageService } from './storage.service';
import { GoalService } from './goal.service';
import { TaskService } from './task.service';
import { RadarService } from './radar.service';
import { BudgetService } from './budget.service';
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
  private budgetService = inject(BudgetService);
  private userService = inject(UserService);
  private ngZone = inject(NgZone);
  private appRef = inject(ApplicationRef);
  private readonly API_URL = `${environment.apiUrl}/data`;
  private readonly AUTH_TOKEN = environment.authToken;
  private readonly UM_PREFIX = 'um_';
  private hasSynced = false;
  private isSyncing = false; // Fix A1: mutex para evitar llamadas concurrentes
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSave = false; // Track saves attempted before initial sync
  /** Tracks keys modified locally (via storage.set) since last syncFromServer */
  private locallyModifiedKeys = new Set<string>();

  /**
   * Keys that are LOCAL to the current browser session and must NEVER be
   * overwritten by data coming from the server (nor uploaded to it).
   */
  private readonly SESSION_LOCAL_KEYS = new Set([
    'um_user_profile',
    'um_nav_order',
  ]);

  /**
   * Keys whose services have hydrateDirectly() methods with merge logic.
   * These are skipped in the generic key-restore loop to prevent blind overwrites.
   */
  private readonly EXPLICITLY_HYDRATED_KEYS = new Set([
    'um_goals',
    'um_tasks',
    'um_radar',
    'um_annual_budget',
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

    try {
      const userId = this.storage.getActiveUserId();
      if (!userId) {
        console.log('[DataSync] No hay usuario activo, saltando sincronización.');
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
          const budgetVal = getValue('um_annual_budget');

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
                if (key === 'um_users') {
                  // SPECIAL HANDLING: merge server users with local, preserving isDeleted flags
                  this.mergeUsersFromServer(serverData[key] as any[] || []);
                } else {
                  this.storage.setUnscoped(key, serverData[key]);
                }
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
                // No migrar claves de estado de UI para evitar saltarse onboarding/intro en usuarios nuevos
                if (key === 'um_onboarding_welcome_seen' || key === 'um_setup_intro_seen') {
                  continue;
                }
                baseKey = key;
              }
              // Clave scoped para OTRO usuario → ignorar
              else {
                continue;
              }

              if (!baseKey || !baseKey.startsWith(this.UM_PREFIX)) continue;
              if (this.SESSION_LOCAL_KEYS.has(baseKey)) continue;
              if (this.EXPLICITLY_HYDRATED_KEYS.has(baseKey)) continue; // handled by hydrateDirectly()
              if (processedBaseKeys.has(baseKey)) continue;
              processedBaseKeys.add(baseKey);

              const val = getValue(baseKey);
              if (val !== undefined) {
                // Protect locally-modified keys from being overwritten by stale server data
                const resolvedKey = `${baseKey}_${userId}`;
                if (this.locallyModifiedKeys.has(baseKey) || this.locallyModifiedKeys.has(resolvedKey)) {
                  console.log(`[DataSync] Skipping overwrite of '${baseKey}' — modified locally since sync started`);
                  continue;
                }
                // storage.set('um_goals', data) → internamente escribe um_goals_sa-001
                this.storage.set(baseKey, val);
                restored++;
              }
            }

            // Hidratar servicios reactivos
            try { this.goalService.hydrateDirectly(goalsArr); } catch (err) { console.error('Error hidratando goals:', err); }
            try { this.taskService.hydrateDirectly(tasksArr); } catch (err) { console.error('Error hidratando tasks:', err); }
            try { this.radarService.hydrateDirectly(radarArr); } catch (err) { console.error('Error hidratando radar:', err); }
            try { if (budgetVal !== undefined) this.budgetService.hydrateDirectly(budgetVal); } catch (err) { console.error('Error hidratando budget:', err); }
            try { this.userService.refreshActiveProfileFromList(); } catch (err) { console.error('Error actualizando perfil activo:', err); }

            console.log(`[DataSync] Hidratadas ${restored} claves del servidor`);
            this.hasSynced = true;

            // Flush any saves that were attempted before sync completed
            if (this.pendingSave) {
              this.pendingSave = false;
              console.log('[DataSync] Flushing pending save after initial sync...');
              setTimeout(() => this.saveToServer(), 500);
            }
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
      return { success: false, msg: lastError, goals: 0, tasks: 0, radar: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Merge users from server with local data, preserving local isDeleted flags
   * and deduplicating by email. Used by syncFromServer() to prevent resurrecting deleted users.
   */
  private mergeUsersFromServer(serverUsers: any[]): void {
    if (!Array.isArray(serverUsers)) {
      this.storage.setUnscoped('um_users', serverUsers);
      return;
    }

    const localUsers = this.storage.getUnscoped<any[]>('um_users') || [];

    // Build map of local deleted user IDs and emails with their full objects
    const localDeletedIds = new Set<string>();
    const localDeletedMap = new Map<string, any>(); // email -> user object
    for (const u of localUsers) {
      if (u?.isDeleted) {
        localDeletedIds.add(u.id);
        if (u.email) {
          localDeletedMap.set(u.email.toLowerCase().trim(), u);
        }
      }
    }

    // Merge: start with server data, but prefer LOCAL version when it's more recent
    const mergedMap = new Map<string, any>();
    const localMap = new Map<string, any>();
    for (const u of localUsers) { if (u?.id) localMap.set(u.id, u); }

    for (const u of serverUsers) {
      if (!u?.id) continue;
      
      const emailKey = u.email ? u.email.toLowerCase().trim() : '';
      const localDel = emailKey ? localDeletedMap.get(emailKey) : null;
      
      let wasDeletedLocally = localDeletedIds.has(u.id);
      if (!wasDeletedLocally && localDel) {
        // Only treat as deleted if the local deleted record is newer or equal in creation date
        const localDelTime = new Date(localDel.createdAt || 0).getTime();
        const serverTime = new Date(u.createdAt || 0).getTime();
        if (localDelTime >= serverTime) {
          wasDeletedLocally = true;
        }
      }

      if (wasDeletedLocally) {
        mergedMap.set(u.id, { ...u, isDeleted: true });
      } else {
        // Check if local version is more recent (admin changes like subscription)
        const localUser = localMap.get(u.id);
        if (localUser && !localUser.isDeleted) {
          // Prefer local if it has admin-activated subscription that server doesn't
          const localHasAdminSub = localUser.subscriptionActivatedByAdmin || localUser.subscriptionStatus === 'active';
          const serverHasAdminSub = u.subscriptionActivatedByAdmin || u.subscriptionStatus === 'active';
          if (localHasAdminSub && !serverHasAdminSub) {
            // Local has admin subscription changes not yet on server — keep local
            mergedMap.set(u.id, localUser);
          } else {
            // Merge: use server as base, overlay local subscription fields if they're set
            const merged = { ...u };
            // Preserve local subscription fields if they differ (admin-made changes)
            if (localUser.subscriptionStatus && localUser.subscriptionStatus !== u.subscriptionStatus) {
              merged.subscriptionStatus = localUser.subscriptionStatus;
              merged.subscriptionActivatedByAdmin = localUser.subscriptionActivatedByAdmin ?? merged.subscriptionActivatedByAdmin;
              merged.trialEndsAt = localUser.trialEndsAt ?? merged.trialEndsAt;
            }
            // Preserve local isActive flag
            if (localUser.isActive !== undefined && localUser.isActive !== u.isActive) {
              merged.isActive = localUser.isActive;
            }
            // Preserve local lastLogin if it's more recent than server's
            const localLoginTime = new Date(localUser.lastLogin || 0).getTime();
            const serverLoginTime = new Date(u.lastLogin || 0).getTime();
            if (localLoginTime > serverLoginTime) {
              merged.lastLogin = localUser.lastLogin;
            }
            mergedMap.set(u.id, merged);
          }
        } else {
          mergedMap.set(u.id, u);
        }
      }
    }
    // Add local-only entries (not on server)
    for (const u of localUsers) {
      if (u?.id && !mergedMap.has(u.id)) mergedMap.set(u.id, u);
    }

    // Deduplicate by email
    const byEmail = new Map<string, any>();
    const noEmail: any[] = [];
    const deleted: any[] = [];

    for (const user of mergedMap.values()) {
      if (user.isDeleted) { deleted.push(user); continue; }
      const email = (user.email || '').toLowerCase().trim();
      if (!email) { noEmail.push(user); continue; }
      const existing = byEmail.get(email);
      if (!existing) {
        byEmail.set(email, user);
      } else {
        const existingTime = new Date(existing.lastLogin || existing.createdAt || 0).getTime();
        const newTime = new Date(user.lastLogin || user.createdAt || 0).getTime();
        const existingActive = existing.subscriptionStatus === 'active' || existing.subscriptionActivatedByAdmin;
        const newActive = user.subscriptionStatus === 'active' || user.subscriptionActivatedByAdmin;
        if ((newActive && !existingActive) || (newActive === existingActive && newTime > existingTime)) {
          byEmail.set(email, user);
        }
      }
    }

    const finalList = [...deleted, ...noEmail, ...Array.from(byEmail.values())];
    this.storage.setUnscoped('um_users', finalList);
    this.userService.reloadUsersFromStorage();
    console.log(`[DataSync] um_users merged from server: ${finalList.length} users (${deleted.length} deleted preserved)`);
  }

  /**
   * Sync ligero: descarga SOLO la lista de usuarios del servidor.
   * NO requiere sesión activa — se usa ANTES del login/registro para
   * asegurar que la lista local de um_users esté al día.
   */
  async syncUserList(): Promise<void> {
    try {
      const response = await fetch(`${this.API_URL}?key=um_users&_t=${Date.now()}`, {
        headers: { 'X-Auth-Token': this.AUTH_TOKEN },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const serverUsers = await response.json();
      if (Array.isArray(serverUsers) && serverUsers.length > 0) {
        // Merge con la lista local — LOCAL wins for isDeleted flags
        const localUsers = this.storage.getUnscoped<any[]>('um_users') || [];
        const localMap = new Map<string, any>();
        for (const u of localUsers) { if (u?.id) localMap.set(u.id, u); }

        const mergedMap = new Map<string, any>();
        for (const u of serverUsers) {
          if (!u?.id) continue;
          const local = localMap.get(u.id);
          if (local?.isDeleted) {
            // Preserve local deletion — do NOT resurrect from server
            mergedMap.set(u.id, local);
          } else {
            mergedMap.set(u.id, u);
          }
        }
        // Add any local-only users (not on server yet)
        for (const u of localUsers) {
          if (u?.id && !mergedMap.has(u.id)) mergedMap.set(u.id, u);
        }

        // Deduplicate by email — keep the best record per email
        const byEmail = new Map<string, any>();
        const noEmail: any[] = [];
        const deleted: any[] = [];

        for (const user of mergedMap.values()) {
          if (user.isDeleted) { deleted.push(user); continue; }
          const email = (user.email || '').toLowerCase().trim();
          if (!email) { noEmail.push(user); continue; }
          const existing = byEmail.get(email);
          if (!existing) {
            byEmail.set(email, user);
          } else {
            // Keep the one with latest activity
            const existingTime = new Date(existing.lastLogin || existing.createdAt || 0).getTime();
            const newTime = new Date(user.lastLogin || user.createdAt || 0).getTime();
            // Prefer active subscriptions, then most recent activity
            const existingActive = existing.subscriptionStatus === 'active' || existing.subscriptionActivatedByAdmin;
            const newActive = user.subscriptionStatus === 'active' || user.subscriptionActivatedByAdmin;
            if ((newActive && !existingActive) || (newActive === existingActive && newTime > existingTime)) {
              byEmail.set(email, user);
            }
          }
        }

        const finalList = [...deleted, ...noEmail, ...Array.from(byEmail.values())];
        this.storage.setUnscoped('um_users', finalList);
        this.userService.reloadUsersFromStorage();
        console.log(`[DataSync] Lista de usuarios sincronizada: ${finalList.length} usuarios (de ${mergedMap.size} pre-dedup)`);
      }
    } catch (e) {
      console.warn('[DataSync] Error sincronizando lista de usuarios:', e);
    }
  }

  /**
   * Guarda SOLO la lista de usuarios al servidor.
   * NO requiere sesión activa ni hasSynced — se usa para recovery de contraseña.
   */
  async saveUsersToServer(): Promise<void> {
    try {
      const users = this.storage.getUnscoped<any[]>('um_users');
      if (!users || users.length === 0) return;

      const response = await fetch(`${this.API_URL}?key=_bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': this.AUTH_TOKEN,
        },
        body: JSON.stringify({ um_users: users }),
      });
      const result = await response.json();
      console.log('[DataSync] Usuarios guardados al servidor:', result);
    } catch (e) {
      console.warn('[DataSync] Error guardando usuarios al servidor:', e);
    }
  }

  /**
   * Guarda TODOS los datos de localStorage al servidor.
   * Usa debounce para no hacer demasiadas peticiones.
   */
  /** Mark a key as locally modified — prevents syncFromServer from overwriting it */
  trackLocalModification(key: string): void {
    this.locallyModifiedKeys.add(key);
  }

  saveToServerDebounced(): void {
    if (!this.hasSynced) {
      this.pendingSave = true;
      return;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.saveToServer();
    }, 300);
  }

  /** Bypass debounce — use for critical operations like deletions */
  saveToServerImmediate(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.saveToServer();
  }

  /** Guarda inmediatamente al servidor */
  async saveToServer(): Promise<void> {
    if (!this.hasSynced) {
      // Don't silently discard — mark as pending so it runs after sync
      this.pendingSave = true;
      console.log('[DataSync] Save deferred: initial sync not complete yet.');
      return;
    }

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

        // Merge um_users with server data to preserve server-only fields (e.g. password)
        if (payload['um_users']) {
          try {
            await this.mergeUsersBeforeSave(payload);
          } catch (mergeErr) {
            console.warn('[DataSync] Error merging users before save:', mergeErr);
          }
        }

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
        // Server now has our latest data — safe to clear local modification tracking
        this.locallyModifiedKeys.clear();
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
   * Before saving um_users to server, fetch server version and preserve
   * any fields that exist on the server but not locally (e.g. password set via backend reset).
   */
  private async mergeUsersBeforeSave(payload: Record<string, unknown>): Promise<void> {
    const localUsers = payload['um_users'] as any[];
    if (!Array.isArray(localUsers) || localUsers.length === 0) return;

    const response = await fetch(`${this.API_URL}?key=um_users&_t=${Date.now()}`, {
      headers: { 'X-Auth-Token': this.AUTH_TOKEN },
      cache: 'no-store',
    });
    if (!response.ok) return;

    const serverUsers = await response.json();
    if (!Array.isArray(serverUsers) || serverUsers.length === 0) return;

    // Build server user map by ID
    const serverMap = new Map<string, any>();
    for (const u of serverUsers) {
      if (u?.id) serverMap.set(u.id, u);
    }

    // For each local user, preserve server-only fields
    // Fields the frontend never manages but the backend might set
    const SERVER_PROTECTED_FIELDS = ['password'];

    for (let i = 0; i < localUsers.length; i++) {
      const localUser = localUsers[i];
      if (!localUser?.id) continue;
      const serverUser = serverMap.get(localUser.id);
      if (!serverUser) continue;

      for (const field of SERVER_PROTECTED_FIELDS) {
        if (serverUser[field] && !localUser[field]) {
          localUsers[i][field] = serverUser[field];
        }
      }
    }

    payload['um_users'] = localUsers;
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

      const payloadWithToken = {
        ...payload,
        token: this.AUTH_TOKEN
      };

      const blob = new Blob([JSON.stringify(payloadWithToken)], { type: 'application/json' });
      const url = `${this.API_URL}?key=_bulk`;
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
