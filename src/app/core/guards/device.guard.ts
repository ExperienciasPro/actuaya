import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SyncService } from '../services/sync.service';

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
export const mobileOnlyGuard: CanActivateFn = () => {
  const syncService = inject(SyncService);
  const router = inject(Router);

  if (syncService.isDesktop()) {
    router.navigate(['/d/dashboard']);
    return false;
  }
  return true;
};
