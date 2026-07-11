import { Injectable, inject, computed } from '@angular/core';
import { UserService, UserProfile, UserSubscriptionStatus } from './user.service';
import { StorageService } from './storage.service';

/**
 * MockSubscriptionService — Manejo de suscripciones simulado via localStorage.
 *
 * Responsabilidades:
 *   1. Asignar trial de 30 días a nuevos usuarios (se integra con UserService.saveProfile)
 *   2. Validar si un usuario en trial ya superó su fecha de vencimiento → marcarlo como 'expired'
 *   3. Permitir al administrador activar manualmente una suscripción
 *   4. Exponer estado reactivo del usuario actual para guards, banners, etc.
 *
 * Preparado para migrar a MongoDB — los campos ya viven en UserProfile.
 */
@Injectable({ providedIn: 'root' })
export class MockSubscriptionService {
  private userService = inject(UserService);
  private storage = inject(StorageService);

  // ─── Reactive State (current user) ──────────────────

  /** Current user's subscription status */
  currentStatus = computed<UserSubscriptionStatus | null>(() => {
    const user = this.userService.profile();
    return user?.subscriptionStatus ?? null;
  });

  /** Whether the current user's trial is expired */
  isExpired = computed(() => this.currentStatus() === 'expired');

  /** Whether the current user is in trial */
  isTrial = computed(() => this.currentStatus() === 'trial');

  /** Whether the current user has an active subscription */
  isActive = computed(() => this.currentStatus() === 'active');

  /** Days remaining in trial (0 or negative if expired) */
  trialDaysRemaining = computed<number>(() => {
    const user = this.userService.profile();
    if (!user?.trialEndsAt) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(user.trialEndsAt);
    end.setHours(0, 0, 0, 0);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });

  // ─── Check & Update Status ──────────────────────────

  /**
   * Valida el estado de suscripción del usuario actual.
   * Si está en 'trial' o 'active' y la fecha trialEndsAt ya pasó → lo marca como 'expired'.
   * Debe llamarse al login y al navegar (via guard o en layout init).
   */
  checkAndUpdateStatus(): void {
    const user = this.userService.profile();
    if (!user) return;

    // Superadmin never expires
    if (user.role === 'superadmin') return;

    // Transition trial or active → expired if expiration date has passed
    if (user.subscriptionStatus === 'trial' || user.subscriptionStatus === 'active') {
      const now = new Date();
      const expirationDate = new Date(user.trialEndsAt);

      if (now > expirationDate) {
        this.updateUserSubscription(user.id, {
          subscriptionStatus: 'expired',
        });
      }
    }
  }

  /**
   * Valida un usuario específico por ID (batch check para admin panel).
   */
  checkUserStatus(userId: string): void {
    const user = this.userService.getUserById(userId);
    if (!user || user.role === 'superadmin') return;

    if (user.subscriptionStatus === 'trial' || user.subscriptionStatus === 'active') {
      const now = new Date();
      const expirationDate = new Date(user.trialEndsAt);

      if (now > expirationDate) {
        this.updateUserSubscription(userId, {
          subscriptionStatus: 'expired',
        });
      }
    }
  }

  // ─── Admin: Activate Subscription ────────────────────

  /**
   * Activa la suscripción de un usuario (acción de administrador).
   * Cambia subscriptionStatus → 'active' y subscriptionActivatedByAdmin → true.
   * Permite indicar la duración en meses.
   */
  activateSubscription(userId: string, months?: number): boolean {
    const user = this.userService.getUserById(userId);
    if (!user) return false;

    let expirationDate = '2099-12-31T23:59:59.000Z'; // Indefinido por defecto
    if (months && months > 0) {
      const date = new Date();
      date.setMonth(date.getMonth() + months);
      expirationDate = date.toISOString();
    }

    this.updateUserSubscription(userId, {
      subscriptionStatus: 'active',
      subscriptionActivatedByAdmin: true,
      trialEndsAt: expirationDate,
    });

    return true;
  }

  /**
   * Desactiva la suscripción de un usuario (vuelve a 'expired').
   */
  deactivateSubscription(userId: string): boolean {
    const user = this.userService.getUserById(userId);
    if (!user || user.role === 'superadmin') return false;

    this.updateUserSubscription(userId, {
      subscriptionStatus: 'expired',
    });

    return true;
  }

  // ─── Helpers ──────────────────────────────────────────

  /** Get subscription info for a specific user */
  getUserSubscriptionInfo(userId: string) {
    const user = this.userService.getUserById(userId);
    if (!user) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(user.trialEndsAt);
    end.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      status: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      daysRemaining,
      activatedByAdmin: user.subscriptionActivatedByAdmin,
    };
  }

  /** Update subscription fields on a user */
  private updateUserSubscription(
    userId: string,
    changes: Partial<Pick<UserProfile, 'subscriptionStatus' | 'subscriptionActivatedByAdmin' | 'trialEndsAt'>>
  ): void {
    this.userService.updateUser(userId, changes);
  }
}
