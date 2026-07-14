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
}

// Superadmin seed data
const SUPERADMIN_SEED: UserProfile = {
  id: 'sa-001',
  name: 'Gonzalo Jimenez Ramirez',
  email: 'gonzalo@experiencias.pro',
  password: 'gonzalete7',
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
  isOnboarded = computed(() => !!this.profile()?.name);

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
    this.ensureSuperAdmin();
  }

  // ─── Authentication ────────────────────────────

  /** Authenticate a user by email + password (or name + password for legacy) */
  authenticate(identifier: string, password: string): UserProfile | null {
    this.ensureSuperAdmin();
    const users = this.getAllUsers();
    const user = users.find(
      u => (u.email?.toLowerCase() === identifier.toLowerCase() ||
            u.name.toLowerCase() === identifier.toLowerCase()) &&
            u.password === password &&
            u.isActive
    );
    if (user) {
      user.lastLogin = new Date().toISOString();
      this.saveUserToList(user);
      this.setActiveProfile(user);
    }
    return user || null;
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
        this.saveProfile(newUser);
        return this.profile();
      }
    } catch (error: any) {
      console.error('Google Sign-In Error', error);
      throw error;
    }
  }

  // ─── Profile Management ────────────────────────

  /** Save/update user profile (used in registration and profile edit) */
  saveProfile(data: Partial<UserProfile>): void {
    const current = this.profile();
    const isNew = !current;
    const now = new Date();
    const updated: UserProfile = {
      id: current?.id || this.generateId(),
      name: data.name || current?.name || '',
      email: data.email ?? current?.email,
      password: data.password ?? current?.password,
      phone: data.phone ?? current?.phone,
      occupation: data.occupation ?? current?.occupation,
      companyName: data.companyName ?? current?.companyName,
      age: data.age ?? current?.age,
      companySize: data.companySize ?? current?.companySize,
      department: data.department ?? current?.department,
      city: data.city ?? current?.city,
      role: current?.role || 'user',
      isActive: current?.isActive ?? true,
      createdAt: current?.createdAt || now.toISOString(),
      lastLogin: current?.lastLogin,
      // Subscription: new users start with 30-day trial
      subscriptionStatus: current?.subscriptionStatus ?? data.subscriptionStatus ?? 'trial',
      trialEndsAt: current?.trialEndsAt ?? data.trialEndsAt ?? this.calculateTrialEnd(now),
      subscriptionActivatedByAdmin: current?.subscriptionActivatedByAdmin ?? data.subscriptionActivatedByAdmin ?? false,
    };
    this.saveUserToList(updated);
    this.setActiveProfile(updated);
  }

  /** Clear active profile (logout) */
  clearProfile(): void {
    this.storage.remove(this.PROFILE_KEY);
    this.profile.set(null);
  }

  // ─── Admin: User Management ────────────────────

  /** Get all registered users (non-reactive plain array) */
  getAllUsers(): UserProfile[] {
    return this._usersSignal();
  }

  /** Get a user by ID */
  getUserById(id: string): UserProfile | undefined {
    return this.getAllUsers().find(u => u.id === id);
  }

  /** Update an existing user's data */
  updateUser(id: string, changes: Partial<UserProfile>): void {
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...changes };
      this.storage.set(this.USERS_KEY, users);
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
    const users = this.getAllUsers().filter(u => u.id !== id || u.role === 'superadmin');
    this.storage.set(this.USERS_KEY, users);
    this._usersSignal.set([...users]);
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
    const users = this.getAllUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.storage.set(this.USERS_KEY, users);
    this._usersSignal.set([...users]);
  }

  private loadAllUsers(): UserProfile[] {
    return this.storage.get<UserProfile[]>(this.USERS_KEY) || [];
  }

  private loadActiveProfile(): UserProfile | null {
    const raw = this.storage.get<UserProfile>(this.PROFILE_KEY);
    if (raw) {
      return this.migrateUser(raw);
    }
    return null;
  }

  private ensureSuperAdmin(): void {
    const users = this.getAllUsers();
    const existingGonzalo = users.find(u => u.email?.toLowerCase() === 'gonzalo@experiencias.pro');
    if (!existingGonzalo) {
      this.saveUserToList({ ...SUPERADMIN_SEED });
    } else {
      if (existingGonzalo.password !== 'gonzalete7') {
        existingGonzalo.password = 'gonzalete7';
      }
      existingGonzalo.isActive = true;
      existingGonzalo.role = 'superadmin';
      this.saveUserToList(existingGonzalo);
    }

    // ── Restore missing registered users ──
    this.ensureUserExists({
      name: 'maira Dayana',
      email: 'dayana.81m@gmail.com',
      role: 'user',
      isActive: true,
      subscriptionStatus: 'active',
      createdAt: '2026-06-29T00:00:00.000Z',
      trialEndsAt: '2099-12-31T23:59:59.000Z',
      subscriptionActivatedByAdmin: true,
      password: 'Actua2025!',
    });

    this.ensureUserExists({
      name: 'anniella baena lorduv',
      email: 'anniellabaena@gmail.com',
      phone: '+573008112376',
      role: 'user',
      isActive: true,
      subscriptionStatus: 'active',
      createdAt: '2026-06-30T00:00:00.000Z',
      trialEndsAt: '2099-12-31T23:59:59.000Z',
      subscriptionActivatedByAdmin: true,
      password: 'Actua2025!',
    });
  }

  /** Ensure a user exists by email; if not, create them */
  private ensureUserExists(seed: Partial<UserProfile>): void {
    const users = this.getAllUsers();
    const existsIdx = users.findIndex(u => u.email?.toLowerCase() === (seed.email || '').toLowerCase());
    if (existsIdx === -1) {
      this.saveUserToList({
        id: this.generateId(),
        name: seed.name || '',
        email: seed.email,
        password: seed.password,
        phone: seed.phone,
        occupation: seed.occupation,
        companyName: seed.companyName,
        age: seed.age,
        companySize: seed.companySize,
        department: seed.department,
        city: seed.city,
        role: (seed.role as any) || 'user',
        isActive: seed.isActive ?? true,
        createdAt: seed.createdAt || new Date().toISOString(),
        subscriptionStatus: seed.subscriptionStatus ?? 'trial',
        trialEndsAt: seed.trialEndsAt ?? this.calculateTrialEnd(new Date()),
        subscriptionActivatedByAdmin: seed.subscriptionActivatedByAdmin ?? false,
      });
    } else {
      const existing = users[existsIdx];
      if (seed.subscriptionStatus === 'active' && existing.subscriptionStatus !== 'active') {
        existing.subscriptionStatus = 'active';
        existing.subscriptionActivatedByAdmin = true;
        existing.trialEndsAt = seed.trialEndsAt || '2099-12-31T23:59:59.000Z';
        this.saveUserToList(existing);
      }
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
      this.setActiveProfile(updated);
    }
  }

  private generateId(): string {
    return 'u-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }
}

