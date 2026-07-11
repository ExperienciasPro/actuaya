import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserService } from '../services/user.service';
import { MockSubscriptionService } from '../services/mock-subscription.service';

/**
 * SubscriptionGuard — Protege las rutas principales del dashboard.
 *
 * Comportamiento:
 *   1. Ejecuta checkAndUpdateStatus() para evaluar si el trial ha vencido.
 *   2. Si el usuario es superadmin → pasa siempre.
 *   3. Si el usuario tiene status 'expired' → redirige a /subscription-required.
 *   4. Si es 'trial' o 'active' → permite la navegación.
 */
export const subscriptionGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const mockSubService = inject(MockSubscriptionService);
  const router = inject(Router);

  const user = userService.profile();
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // Superadmin siempre tiene acceso
  if (user.role === 'superadmin') {
    return true;
  }

  // Check and auto-update trial → expired if needed
  mockSubService.checkAndUpdateStatus();

  // Re-read the profile after potential status update
  const updatedUser = userService.profile();

  if (updatedUser?.subscriptionStatus === 'expired') {
    router.navigate(['/subscription-required']);
    return false;
  }

  return true;
};
