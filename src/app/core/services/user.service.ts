import { Injectable, signal, computed, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';

export type UserSubscriptionStatus = 'trial' | 'active' | 'expired';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  password?: string;
  phone?: string;            // Full phone with country code, e.g. '+573001234567'
  occupation?: string;
  companyName?: string;
  businessType?: string;       // Tipo de empresa (sector)
  age?: number;
  companySize?: string;
  department?: string;
  city?: string;
  role: 'superadmin' | 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  /** Subscription management fields */
  subscriptionStatus: UserSubscriptionStatus;
  trialEndsAt: string;                   // ISO date string
  subscriptionActivatedByAdmin: boolean;
  isDeleted?: boolean;
}

// Superadmin seed data
const SUPERADMIN_SEED: UserProfile = {
  id: 'sa-001',
  name: 'Gonzalo Jimenez Ramirez',
  email: 'gonzalo@experiencias.pro',
  password: 'sha256$42fae9da005da346277f0e8149a160159ad9a7a68a8e90dc85d8de194caae381',
  role: 'superadmin',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  subscriptionStatus: 'active',
  trialEndsAt: '2099-12-31T23:59:59.000Z',
  subscriptionActivatedByAdmin: false,
};

@Injectable({ providedIn: 'root' })
export class UserService {
  private storage = inject(StorageService);
  private auth = inject(Auth);
  private readonly PROFILE_KEY = 'um_user_profile';
  private readonly USERS_KEY = 'um_users';

  /** The active user profile signal */
  profile = signal<UserProfile | null>(this.loadActiveProfile());

  /** Reactive signal of ALL registered users — use this in computed() */
  private _usersSignal = signal<UserProfile[]>(this.loadAllUsers());

  /** Public reactive read-only view of all users */
  allUsers = this._usersSignal.asReadonly();

  /** Whether the user has completed onboarding */
  isOnboarded = computed(() => {
    const p = this.profile();
    if (!p) return false;
    // Superadmin bypasses detail checks to avoid migration lockouts
    if (p.role === 'superadmin') return true;
    if (p.name === 'Usuario ActuaYa' || !p.email || !p.phone) {
      return false;
    }
    return true;
  });

  /** User's first name for greetings */
  firstName = computed(() => {
    const name = this.profile()?.name;
    return name ? name.split(' ')[0] : '';
  });

  /** Whether the active user is a superadmin */
  isSuperAdmin = computed(() => this.profile()?.role === 'superadmin');

  /** Whether the active user's profile has the key demographic fields filled */
  isProfileComplete = computed(() => {
    const p = this.profile();
    if (!p) return false;
    return !!(p.occupation || p.companySize);
  });

  constructor() {
    // Si hay un perfil activo en localStorage, restaurar el scope
    const existingProfile = this.profile();
    if (existingProfile?.id) {
      this.storage.setActiveUser(existingProfile.id);
    }
    this.ensureSuperAdmin();
    this.deduplicateUsers();
    this.syncProfileToList();
  }

  // ─── Authentication ────────────────────────────

  /** Hash password using SubtleCrypto SHA-256 with salt 'AcY_2026' */
  async hashPassword(pw: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pw + ':AcY_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256$${hashHex}`;
  }

  /** Authenticate a user by email + password (or name + password for legacy) */
  async authenticate(identifier: string, password: string): Promise<UserProfile | null> {
    this.ensureSuperAdmin();
    
    // Try signal first, then force-reload from localStorage as fallback
    let users = this.getAllUsers();
    let user = users.find(
      u => u.email?.toLowerCase() === identifier.toLowerCase() &&
           u.isActive
    );
    // Fallback: buscar por nombre (legacy)
    if (!user) {
      user = users.find(
        u => u.name.toLowerCase() === identifier.toLowerCase() &&
             u.isActive
      );
    }
    
    // DEFENSIVE: If user not found in signal, reload from localStorage and retry
    if (!user) {
      this.reloadUsersFromStorage();
      users = this.getAllUsers();
      user = users.find(
        u => u.email?.toLowerCase() === identifier.toLowerCase() &&
             u.isActive
      );
      if (!user) {
        user = users.find(
          u => u.name.toLowerCase() === identifier.toLowerCase() &&
               u.isActive
        );
      }
    }
    
    if (user) {
      const hashedInput = await this.hashPassword(password);
      const isHashedMatch = user.password === hashedInput;
      const isRawMatch = user.password === password;

      if (isHashedMatch || isRawMatch) {
        user.lastLogin = new Date().toISOString();
        if (isRawMatch) {
          user.password = hashedInput;
        }
        this.saveUserToList(user);
        // Activar scope ANTES de setActiveProfile para que los datos se lean aislados
        this.storage.setActiveUser(user.id);
        this.setActiveProfile(user);
        return user;
      }
    }
    return null;
  }

  /** Authenticate using Firebase Google Login */
  async loginWithGoogle(): Promise<UserProfile | null> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const googleUser = result.user;

      const users = this.getAllUsers();
      let user = users.find(u => u.email?.toLowerCase() === googleUser.email?.toLowerCase());

      if (user) {
        // User exists, update lastLogin
        if (user.isActive) {
          user.lastLogin = new Date().toISOString();
          this.saveUserToList(user);
          this.storage.setActiveUser(user.id);
          this.setActiveProfile(user);
          return user;
        } else {
          throw new Error('User account is inactive');
        }
      } else {
        // Create new user profile for the Google user
        const newUser: Partial<UserProfile> = {
          name: googleUser.displayName || 'Google User',
          email: googleUser.email || '',
        };
        await this.saveProfile(newUser);
        const created = this.profile();
        if (created) {
          this.storage.setActiveUser(created.id);
        }
        return created;
      }
    } catch (error: any) {
      console.error('Google Sign-In Error', error);
      throw error;
    }
  }

  // ─── Profile Management ────────────────────────

  /** Save/update user profile (used in registration and profile edit) */
  async saveProfile(data: Partial<UserProfile>): Promise<void> {
    const current = this.profile();
    const isNew = !current;
    const now = new Date();

    let password = data.password ?? current?.password;
    if (password && !password.startsWith('sha256$')) {
      password = await this.hashPassword(password);
    }

    // If creating a new profile, check if email already exists to avoid duplicates
    let existingByEmail: UserProfile | undefined;
    if (isNew && data.email) {
      const allUsers = this.storage.get<UserProfile[]>(this.USERS_KEY) || [];
      existingByEmail = allUsers.find(
        u => (u.email || '').toLowerCase() === data.email!.toLowerCase() && !u.isDeleted
      );
    }

    const baseUser = existingByEmail || current;

    const updated: UserProfile = {
      id: baseUser?.id || this.generateId(),
      name: data.name || baseUser?.name || '',
      email: data.email ?? baseUser?.email,
      password: password,
      phone: data.phone ?? baseUser?.phone,
      occupation: data.occupation ?? baseUser?.occupation,
      companyName: data.companyName ?? baseUser?.companyName,
      age: data.age ?? baseUser?.age,
      companySize: data.companySize ?? baseUser?.companySize,
      department: data.department ?? baseUser?.department,
      city: data.city ?? baseUser?.city,
      role: baseUser?.role || 'user',
      isActive: baseUser?.isActive ?? true,
      createdAt: baseUser?.createdAt || now.toISOString(),
      lastLogin: baseUser?.lastLogin,
      // Subscription: new users start with 30-day trial
      subscriptionStatus: baseUser?.subscriptionStatus ?? data.subscriptionStatus ?? 'trial',
      trialEndsAt: baseUser?.trialEndsAt ?? data.trialEndsAt ?? this.calculateTrialEnd(now),
      subscriptionActivatedByAdmin: baseUser?.subscriptionActivatedByAdmin ?? data.subscriptionActivatedByAdmin ?? false,
    };
    this.saveUserToList(updated);
    this.storage.setActiveUser(updated.id);
    this.setActiveProfile(updated);
  }

  /**
   * Clear active profile (logout).
   * NO destruye datos del usuario — solo desactiva la sesión activa.
   * Los datos del usuario permanecen aislados bajo sus claves scoped en localStorage.
   */
  clearProfile(): void {
    // Desactivar scope primero
    this.storage.setActiveUser(null);
    // Limpiar solo la sesión activa (clave sin scope)
    this.storage.removeUnscoped(this.PROFILE_KEY);
    this.profile.set(null);
  }

  // ─── Admin: User Management ────────────────────

  /** Get all registered users (non-reactive plain array) */
  getAllUsers(): UserProfile[] {
    return this._usersSignal();
  }

  /** Force-reload the users signal from localStorage (call after external sync writes) */
  reloadUsersFromStorage(): void {
    this._usersSignal.set(this.loadAllUsers());
  }

  /** Get a user by ID */
  getUserById(id: string): UserProfile | undefined {
    return this.getAllUsers().find(u => u.id === id);
  }

  /** Update an existing user's data */
  updateUser(id: string, changes: Partial<UserProfile>): void {
    const users = this.storage.get<UserProfile[]>(this.USERS_KEY) || [];
    const idx = users.findIndex(u => u.id === id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...changes };
      this.storage.set(this.USERS_KEY, users);
      this._usersSignal.set(users.filter(u => !u.isDeleted));
      // If editing the active user, refresh profile
      if (this.profile()?.id === id) {
        this.setActiveProfile(users[idx]);
      }
    }
  }

  /** Change a user's password */
  updateUserPassword(id: string, newPassword: string): void {
    this.updateUser(id, { password: newPassword });
  }

  /** Toggle user active status */
  toggleUserActive(id: string): void {
    const user = this.getUserById(id);
    if (user && user.role !== 'superadmin') {
      this.updateUser(id, { isActive: !user.isActive });
    }
  }

  /** Delete a user (cannot delete superadmin) */
  deleteUser(id: string): void {
    const rawUsers = this.storage.get<UserProfile[]>(this.USERS_KEY) || [];
    const idx = rawUsers.findIndex(u => u.id === id);
    if (idx >= 0 && rawUsers[idx].role !== 'superadmin') {
      rawUsers[idx].isDeleted = true;
      this.storage.set(this.USERS_KEY, rawUsers);
      this._usersSignal.set(rawUsers.filter(u => !u.isDeleted));
    }
  }

  /** Admin: create a new user without affecting the active profile */
  adminCreateUser(data: Partial<UserProfile>): UserProfile {
    const now = new Date();
    const newUser: UserProfile = {
      id: this.generateId(),
      name: data.name || '',
      email: data.email,
      password: data.password,
      phone: data.phone,
      occupation: data.occupation,
      companyName: data.companyName,
      age: data.age,
      companySize: data.companySize,
      department: data.department,
      city: data.city,
      role: data.role || 'user',
      isActive: data.isActive ?? true,
      createdAt: now.toISOString(),
      subscriptionStatus: data.subscriptionStatus ?? 'trial',
      trialEndsAt: data.trialEndsAt ?? this.calculateTrialEnd(now),
      subscriptionActivatedByAdmin: data.subscriptionActivatedByAdmin ?? false,
    };
    this.saveUserToList(newUser);
    return newUser;
  }

  /** Get system stats */
  getSystemStats() {
    const users = this.getAllUsers();
    const storageKeys = this.storage.getAllKeys('um_');
    let totalBytes = 0;
    storageKeys.forEach(k => {
      totalBytes += (this.storage.getRaw(k) || '').length * 2; // 2 bytes per char
    });
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      inactiveUsers: users.filter(u => !u.isActive).length,
      storageUsed: totalBytes,
      storageKeys: storageKeys.length,
    };
  }

  // ─── Internal Helpers ──────────────────────────

  private setActiveProfile(user: UserProfile): void {
    this.storage.set(this.PROFILE_KEY, user);
    this.profile.set(user);
  }

  private saveUserToList(user: UserProfile): void {
    const users = this.storage.get<UserProfile[]>(this.USERS_KEY) || [];
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      // Before adding a new user, check if another user with the same email exists
      if (user.email) {
        const emailDupeIdx = users.findIndex(
          u => u.id !== user.id && (u.email || '').toLowerCase() === user.email!.toLowerCase() && !u.isDeleted
        );
        if (emailDupeIdx >= 0) {
          // Merge: update the existing record instead of creating a duplicate
          users[emailDupeIdx] = { ...users[emailDupeIdx], ...user, id: users[emailDupeIdx].id };
          this.storage.set(this.USERS_KEY, users);
          this._usersSignal.set(users.filter(u => !u.isDeleted));
          return;
        }
      }
      users.push(user);
    }
    this.storage.set(this.USERS_KEY, users);
    this._usersSignal.set(users.filter(u => !u.isDeleted));
  }

  private loadAllUsers(): UserProfile[] {
    const users = this.storage.get<UserProfile[]>(this.USERS_KEY) || [];
    return users.filter(u => !u.isDeleted);
  }

  private loadActiveProfile(): UserProfile | null {
    const raw = this.storage.get<UserProfile>(this.PROFILE_KEY);
    if (raw) {
      return this.migrateUser(raw);
    }
    return null;
  }

  private ensureSuperAdmin(): void {
    const users = this.storage.get<UserProfile[]>(this.USERS_KEY) || [];
    const existingGonzalo = users.find(u => u.email?.toLowerCase() === 'gonzalo@experiencias.pro');
    const seedHash = 'sha256$42fae9da005da346277f0e8149a160159ad9a7a68a8e90dc85d8de194caae381';
    const fallbackRaw = 'gonzalete7';
    if (!existingGonzalo) {
      this.saveUserToList({ ...SUPERADMIN_SEED });
    } else {
      if (existingGonzalo.password !== seedHash && existingGonzalo.password !== fallbackRaw) {
        existingGonzalo.password = seedHash;
      }
      existingGonzalo.isActive = true;
      existingGonzalo.role = 'superadmin';
      this.saveUserToList(existingGonzalo);
    }
  }

  /** Calculate a trial end date 30 days from a given date */
  private calculateTrialEnd(from: Date): string {
    const end = new Date(from);
    end.setDate(end.getDate() + 30);
    return end.toISOString();
  }

  /** Backfill subscription fields for users created before this feature */
  private migrateUser(user: UserProfile): UserProfile {
    if (!user.subscriptionStatus) {
      user.subscriptionStatus = user.role === 'superadmin' ? 'active' : 'trial';
      user.trialEndsAt = user.trialEndsAt || this.calculateTrialEnd(new Date(user.createdAt));
      user.subscriptionActivatedByAdmin = user.subscriptionActivatedByAdmin ?? false;
    }
    return user;
  }

  refreshActiveProfileFromList(): void {
    const current = this.profile();
    if (!current) return;
    const updated = this.getUserById(current.id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(current)) {
      // Evita sobreescribir un perfil real activo con un placeholder vacío de la lista
      if (updated.name !== 'Usuario ActuaYa' || current.name === 'Usuario ActuaYa') {
        this.setActiveProfile(updated);
      }
    }
  }

  /** Sincroniza los detalles del perfil activo al listado de usuarios si este último es un placeholder */
  syncProfileToList(): void {
    const current = this.profile();
    if (!current || current.name === 'Usuario ActuaYa') return;

    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === current.id);
    if (idx >= 0) {
      const inList = users[idx];
      if (inList.name === 'Usuario ActuaYa' && current.name !== 'Usuario ActuaYa') {
        users[idx] = { ...current };
        this.storage.set(this.USERS_KEY, users);
        this._usersSignal.set([...users]);
        console.log('[UserService] Perfil del listado sanado con los datos del perfil activo:', current.name);
      }
    } else {
      // Before re-adding, check if a user with the same email already exists under a different ID
      if (current.email) {
        const emailMatch = users.findIndex(
          u => (u.email || '').toLowerCase() === current.email!.toLowerCase()
        );
        if (emailMatch >= 0) {
          // Update existing record instead of creating a duplicate
          users[emailMatch] = { ...users[emailMatch], ...current, id: users[emailMatch].id };
          this.storage.set(this.USERS_KEY, users);
          this._usersSignal.set([...users]);
          console.log('[UserService] Perfil sincronizado con registro existente por email:', current.email);
          return;
        }
      }
      users.push({ ...current });
      this.storage.set(this.USERS_KEY, users);
      this._usersSignal.set([...users]);
      console.log('[UserService] Perfil faltante re-incorporado al listado:', current.name);
    }
  }

  /**
   * Deduplicate users by email. Keeps the most recently active entry per email.
   * This cleans up any existing duplicates in the stored data.
   */
  deduplicateUsers(): void {
    const rawUsers = this.storage.get<UserProfile[]>(this.USERS_KEY) || [];
    const emailMap = new Map<string, UserProfile>();
    const deduped: UserProfile[] = [];
    let removed = 0;

    for (const user of rawUsers) {
      // Keep deleted users as-is (don't deduplicate them away, they need to persist)
      if (user.isDeleted) {
        deduped.push(user);
        continue;
      }

      const email = (user.email || '').toLowerCase().trim();

      // Users without email can't be deduped by email, keep all
      if (!email) {
        deduped.push(user);
        continue;
      }

      const existing = emailMap.get(email);
      if (!existing) {
        emailMap.set(email, user);
      } else {
        // Keep the one with the most recent activity or the one with richer data
        const existingScore = this.getUserActivityScore(existing);
        const newScore = this.getUserActivityScore(user);

        if (newScore > existingScore) {
          // Replace with the better record
          emailMap.set(email, user);
        }
        removed++;
      }
    }

    if (removed > 0) {
      // Rebuild deduped list: non-email users + best per email
      const finalList = deduped.concat(Array.from(emailMap.values()));
      this.storage.set(this.USERS_KEY, finalList);
      this._usersSignal.set(finalList.filter(u => !u.isDeleted));
      console.log(`[UserService] Deduplicación: ${removed} registros duplicados eliminados`);
    }
  }

  /** Score a user record for deduplication — higher score = more valuable record to keep */
  private getUserActivityScore(user: UserProfile): number {
    let score = 0;
    // Prefer superadmin
    if (user.role === 'superadmin') score += 1000;
    // Prefer active subscriptions
    if (user.subscriptionStatus === 'active') score += 100;
    if (user.subscriptionActivatedByAdmin) score += 50;
    // Prefer more recently active
    if (user.lastLogin) score += 20 + (new Date(user.lastLogin).getTime() / 1e12);
    // Prefer richer profiles
    if (user.phone) score += 5;
    if (user.occupation) score += 3;
    if (user.companyName) score += 3;
    // Prefer older accounts (established)
    if (user.createdAt) score += new Date(user.createdAt).getTime() / 1e13;
    return score;
  }

  private generateId(): string {
    return 'u-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }
}

