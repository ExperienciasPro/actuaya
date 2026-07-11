import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor HTTP placeholder para futuro backend API.
 * Añadirá headers de autenticación y manejo de errores global.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // TODO: Añadir token de autenticación
  // TODO: Manejar errores HTTP globalmente
  return next(req);
};
