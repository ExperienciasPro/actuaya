import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private updateTokenSignal = signal<number>(0);

  /**
   * Safari (private browsing / ITP) can block localStorage entirely.
   * We detect availability once at startup and fall back to an in-memory Map
   * so the app remains functional for the current session.
   */
  private readonly storageAvailable: boolean;
  private memoryFallback = new Map<string, string>();

  /** Active user ID — when set, all um_ keys are scoped to this user */
  private _activeUserId: string | null = null;

  /** Keys that are GLOBAL (shared across all users) and never get userId suffix */
  private readonly GLOBAL_KEYS = new Set([
    'um_users',
    'um_subscribers',
    'um_subscriptions',
  ]);

  /** Keys that are device-local (never scoped, never synced) */
  private readonly SESSION_LOCAL_KEYS = new Set([
    'um_user_profile',
    'um_nav_order',
  ]);

  constructor() {
    this.storageAvailable = this.checkLocalStorageAvailable();
    if (!this.storageAvailable) {
      console.warn(
        'StorageService: localStorage no disponible (Safari privado / ITP). ' +
        'Usando almacenamiento en memoria — los datos NO persistirán al cerrar la pestaña.'
      );
    }
  }

  readonly updateToken = this.updateTokenSignal.asReadonly();

  private notifyChange() {
    this.updateTokenSignal.update(v => v + 1);
  }

  // ─── User Scoping ──────────────────────────────

  /**
   * Sets the active user ID for key scoping.
   * Called by UserService on login/logout.
   * Also triggers one-time migration of legacy unscoped data.
   */
  setActiveUser(userId: string | null): void {
    this._activeUserId = userId;
    if (userId) {
      this.migrateLocalLegacyData(userId);
    }
    console.log(`[StorageService] Usuario activo: ${userId ?? '(ninguno)'}`);
  }

  /** Returns the currently active user ID */
  getActiveUserId(): string | null {
    return this._activeUserId;
  }

  /**
   * Resolves the actual storage key based on scoping rules:
   * - Global keys (um_users, etc.) → never scoped
   * - Session-local keys (um_user_profile, etc.) → never scoped
   * - Non-um_ keys → never scoped
   * - All other um_ keys with active user → um_key_userId
   */
  private resolveKey(key: string): string {
    if (!this._activeUserId) return key;
    if (!key.startsWith('um_')) return key;
    if (this.GLOBAL_KEYS.has(key)) return key;
    if (this.SESSION_LOCAL_KEYS.has(key)) return key;
    return `${key}_${this._activeUserId}`;
  }

  // ─── Core CRUD (with scoping) ──────────────────

  get<T>(key: string): T | null {
    const resolvedKey = this.resolveKey(key);
    return this.getRawValue<T>(resolvedKey);
  }

  set<T>(key: string, value: T): void {
    const resolvedKey = this.resolveKey(key);
    this.setRawValue(resolvedKey, value);
    this.notifyChange();
  }

  remove(key: string): void {
    const resolvedKey = this.resolveKey(key);
    this.removeRawValue(resolvedKey);
    this.notifyChange();
  }

  has(key: string): boolean {
    const resolvedKey = this.resolveKey(key);
    try {
      if (this.storageAvailable) {
        return localStorage.getItem(resolvedKey) !== null;
      }
      return this.memoryFallback.has(resolvedKey);
    } catch {
      return false;
    }
  }

  // ─── Unscoped Access (for UserService and DataSync internals) ──

  /** Read a key WITHOUT applying user scoping */
  getUnscoped<T>(key: string): T | null {
    return this.getRawValue<T>(key);
  }

  /** Write a key WITHOUT applying user scoping */
  setUnscoped<T>(key: string, value: T): void {
    this.setRawValue(key, value);
    this.notifyChange();
  }

  /** Remove a key WITHOUT applying user scoping */
  removeUnscoped(key: string): void {
    this.removeRawValue(key);
    this.notifyChange();
  }

  // ─── Keys and Clear ────────────────────────────

  /** Keys that should NEVER be wiped by clear() */
  private readonly PROTECTED_KEYS = new Set([
    'um_subscriptions',
    'um_users',
    'um_current_user',
    'um_renewal_notifications',
    'um_enabled_modules',
    'um_user_profile',
  ]);

  /** Returns all um_ keys (resolved — includes userId suffix) from storage */
  getAllKeys(prefix = 'um_'): string[] {
    try {
      if (this.storageAvailable) {
        return Object.keys(localStorage).filter(k => k.startsWith(prefix));
      }
      return [...this.memoryFallback.keys()].filter(k => k.startsWith(prefix));
    } catch {
      return [];
    }
  }

  /** Returns all um_ keys that belong to the current active user */
  getAllKeysForCurrentUser(): string[] {
    if (!this._activeUserId) return [];
    const suffix = `_${this._activeUserId}`;
    return this.getAllKeys('um_').filter(k =>
      k.endsWith(suffix) || this.GLOBAL_KEYS.has(k) || this.SESSION_LOCAL_KEYS.has(k)
    );
  }

  clear(includeProtected = false): void {
    try {
      const keysToRemove = this.getAllKeys('um_').filter(k =>
        includeProtected || !this.PROTECTED_KEYS.has(k)
      );
      for (const k of keysToRemove) {
        this.removeRawValue(k);
      }
      this.notifyChange();
    } catch {
      // silently ignore
    }
  }

  /** Raw string access for admin/stats (avoids JSON parse) */
  getRaw(key: string): string | null {
    try {
      if (this.storageAvailable) {
        return localStorage.getItem(key);
      }
      return this.memoryFallback.get(key) ?? null;
    } catch {
      return null;
    }
  }

  // ─── Internal Raw Operations (no scoping, no notifications) ──

  private getRawValue<T>(key: string): T | null {
    try {
      let raw: string | null = null;
      if (this.storageAvailable) {
        raw = localStorage.getItem(key);
      }
      if (!raw) {
        raw = this.memoryFallback.get(key) ?? null;
      }
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private setRawValue<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      this.memoryFallback.set(key, serialized);
      if (this.storageAvailable) {
        try {
          localStorage.setItem(key, serialized);
        } catch (e) {
          console.warn('localStorage setItem falló, usando memoria:', e);
        }
      }
    } catch (error) {
      console.error('StorageService: Error guardando datos', error);
    }
  }

  private removeRawValue(key: string): void {
    try {
      // Always clean BOTH localStorage AND memoryFallback (fix A4)
      this.memoryFallback.delete(key);
      if (this.storageAvailable) {
        localStorage.removeItem(key);
      }
    } catch {
      // silently ignore
    }
  }

  // ─── Legacy Data Migration ─────────────────────

  /**
   * One-time, non-destructive migration of legacy unscoped data.
   * For each known um_ key: if the scoped key doesn't exist but the
   * legacy unscoped key does, COPY (not move) the data to the scoped key.
   * Original unscoped keys are NEVER deleted.
   */
  private migrateLocalLegacyData(userId: string): void {
    const migrationFlag = `um_migrated_v2_${userId}`;
    if (this.getRawValue<boolean>(migrationFlag)) return; // Already migrated

    console.log(`[StorageService] Ejecutando migración local para usuario ${userId}...`);

    // Collect all um_ keys from storage that DON'T have a userId suffix
    const allKeys = this.getAllKeys('um_');

    // Prevent legacy data leakage if the user already has scoped keys
    const hasScopedKeys = allKeys.some(k => k.endsWith(`_${userId}`) && k !== migrationFlag);
    if (hasScopedKeys) {
      console.log(`[StorageService] El usuario ${userId} ya tiene claves con scope. Omitiendo migración.`);
      this.setRawValue(migrationFlag, true);
      return;
    }

    let migratedCount = 0;

    for (const key of allKeys) {
      // Skip if it's not a base um_ key (already scoped, global, or session-local)
      if (this.GLOBAL_KEYS.has(key)) continue;
      if (this.SESSION_LOCAL_KEYS.has(key)) continue;
      if (key.includes('_migrated_v2_')) continue;

      // Check if this is a legacy unscoped key (no userId suffix)
      // A scoped key looks like um_goals_u-abc123 — has underscore + ID pattern
      // We only want to migrate base keys like um_goals, um_cashflow, etc.
      const isScoped = allKeys.some(k => k !== key && k.startsWith(key + '_'));
      if (key.match(/_[a-z]+-[a-z0-9]+$/i)) continue; // Already a scoped key

      const scopedKey = `${key}_${userId}`;

      // Only copy if scoped version doesn't exist
      const scopedValue = this.getRawValue(scopedKey);
      if (scopedValue !== null) continue; // Scoped data already exists, don't overwrite

      const legacyValue = this.getRawValue(key);
      if (legacyValue === null) continue; // Nothing to migrate

      // COPY legacy data to scoped key (non-destructive)
      this.setRawValue(scopedKey, legacyValue);
      migratedCount++;
      console.log(`[StorageService] Migrada: ${key} → ${scopedKey}`);
    }

    // Set migration flag
    this.setRawValue(migrationFlag, true);
    console.log(`[StorageService] Migración completa: ${migratedCount} claves copiadas`);
  }

  /**
   * Detect whether localStorage is actually available and writable.
   * Safari private browsing throws a QuotaExceededError on setItem.
   */
  private checkLocalStorageAvailable(): boolean {
    const testKey = '__storage_test__';
    try {
      localStorage.setItem(testKey, 'ok');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}
