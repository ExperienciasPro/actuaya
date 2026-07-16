import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { UserService } from '../services/user.service';

/**
 * Auth guard — intercepta el Magic Link (auth=id) y redirige a /welcome si el usuario no se ha registrado.
 */
export const authGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const userService = inject(UserService);
  const router = inject(Router);

  // 1. Interceptar el "Magic Link" de Códigos QR o enlaces
  // Verificamos en toda la raiz para atrapar ?auth=XYZ
  const urlTree = router.parseUrl(state.url);
  const magicToken = urlTree.queryParams['auth'];

  if (magicToken) {
    const user = userService.getUserById(magicToken);
    if (user) {
      await userService.saveProfile(user); // Auto-login
    }
    
    // Si NO estamos en la pantalla de instalación, limpiamos la URL
    if (!state.url.includes('/install')) {
      delete urlTree.queryParams['auth'];
      return router.navigateByUrl(urlTree, { replaceUrl: true });
    }
  }

  // 2. Comportamiento estándar
  if (userService.isOnboarded()) {
    return true;
  }

  // Si no está autenticado, redirigimos al login con el returnUrl para que tras ingresar sus claves vuelva directamente al Coach Móvil
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
