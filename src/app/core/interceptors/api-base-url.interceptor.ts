import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * API Base URL Interceptor — Two-Tier Architecture Support
 *
 * In the two-tier deployment, the frontend (actuaya.co) and
 * backend (api.actuaya.co) live on separate servers.
 *
 * This interceptor automatically prepends the backend server origin
 * to any outgoing HttpClient request that starts with '/api/'.
 *
 * Examples:
 *   DEV:  '/api/test/list' → 'http://localhost:3000/api/test/list'
 *   PROD: '/api/test/list' → 'https://api.actuaya.co/api/test/list'
 *
 * This eliminates the need to change every service that uses hardcoded
 * '/api/...' paths — the interceptor handles it transparently.
 */
export const apiBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept requests to our own API (relative paths starting with /api)
  if (req.url.startsWith('/api')) {
    const fullUrl = `${environment.apiBaseUrl}${req.url}`;
    const cloned = req.clone({ url: fullUrl });
    return next(cloned);
  }

  // Pass through all other requests (external APIs, assets, etc.)
  return next(req);
};
