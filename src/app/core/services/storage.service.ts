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

  get<T>(key: string): T | null {
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

  set<T>(key: string, value: T): void {
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
      this.notifyChange();
    } catch (error) {
      console.error('StorageService: Error guardando datos', error);
    }
  }

  remove(key: string): void {
    try {
      if (this.storageAvailable) {
        localStorage.removeItem(key);
      } else {
        this.memoryFallback.delete(key);
      }
      this.notifyChange();
    } catch {
      // silently ignore
    }
  }

  /** Keys that should NEVER be wiped by clear() */
  private readonly PROTECTED_KEYS = new Set([
    'um_subscriptions',
    'um_users',
    'um_current_user',
    'um_renewal_notifications',
    'um_enabled_modules',
    'um_user_profile',
    'um_setup_intro_seen',
  ]);

  clear(includeProtected = false): void {
    try {
      if (this.storageAvailable) {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith('um_') && (includeProtected || !this.PROTECTED_KEYS.has(k))
        );
        keys.forEach(k => localStorage.removeItem(k));
      } else {
        for (const key of [...this.memoryFallback.keys()]) {
          if (key.startsWith('um_') && (includeProtected || !this.PROTECTED_KEYS.has(key))) {
            this.memoryFallback.delete(key);
          }
        }
      }
      this.notifyChange();
    } catch {
      // silently ignore
    }
  }

  has(key: string): boolean {
    try {
      if (this.storageAvailable) {
        return localStorage.getItem(key) !== null;
      }
      return this.memoryFallback.has(key);
    } catch {
      return false;
    }
  }

  /** Returns all keys matching a prefix (for admin stats, etc.) */
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
