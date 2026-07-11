/**
 * ActuaYa — Auth Middleware
 * 
 * Extracts user identity and role from request headers.
 * In production, this would validate a JWT token.
 * For now, it reads:
 *   X-User-Id:   UUID of the requesting user
 *   X-User-Role: 'admin' | 'user'
 */

/**
 * Middleware that extracts user info from headers and attaches to req.user.
 */
export function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'] || '';
  const userRole = (req.headers['x-user-role'] || 'user').toLowerCase();

  if (!userId) {
    return res.status(401).json({
      error: 'Autenticación requerida. Envía el header X-User-Id.',
    });
  }

  req.user = {
    id: userId,
    role: userRole, // 'admin' or 'user'
    isAdmin: userRole === 'admin',
  };

  next();
}

/**
 * Middleware that requires admin role.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      error: 'Se requieren privilegios de administrador para esta operación.',
    });
  }
  next();
}
