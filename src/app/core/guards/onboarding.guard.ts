import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';

/**
 * Guard que redirige a /welcome si el usuario no tiene perfil.
 * Se aplica a las rutas de desktop y mobile.
 */
export const onboardingGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (!userService.isOnboarded()) {
    router.navigate(['/welcome']);
    return false;
  }
  return true;
};

/**
 * Guard que redirige al dashboard si el usuario ya tiene perfil.
 * Se aplica a la ruta /welcome para evitar que vuelva al registro.
 */
export const alreadyOnboardedGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (userService.isOnboarded()) {
    router.navigate(['/d/dashboard']);
    return false;
  }
  return true;
};
