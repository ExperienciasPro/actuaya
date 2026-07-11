import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserService } from '../services/user.service';

/**
 * SuperAdminGuard — Protege las rutas exclusivas de superadministrador.
 */
export const superAdminGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (userService.isSuperAdmin()) {
    return true;
  }

  router.navigate(['/d/dashboard']);
  return false;
};
