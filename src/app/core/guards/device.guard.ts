import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DeviceService } from '../services/device.service';

/**
 * Guard para rutas desktop (/d/...).
 * Ya NO bloquea el acceso desde móvil — permitimos que el layout
 * responsivo se encargue de la experiencia.
 */
export const desktopOnlyGuard: CanActivateFn = () => {
  // Mobile users CAN access desktop modules now
  return true;
};

/**
 * Guard que bloquea rutas móviles en escritorio.
 * Redirige a la Consola de Mando (desktop/dashboard).
 */
export const mobileOnlyGuard: CanActivateFn = (route, state) => {
  const syncService = inject(DeviceService);
  const router = inject(Router);
  const isDesktopPath = state.url.startsWith('/d');

  if (syncService.isDesktop()) {
    router.navigate(['/d/dashboard']);
    return false;
  }
  return true;
};
