import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: Token no proporcionado', code: 'AUTH_REQUIRED' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || token === 'undefined' || token === 'null' || token === '[object Object]' || token.length < 20) {
    return res.status(401).json({ error: 'No autorizado: Formato de token inválido', code: 'INVALID_TOKEN_FORMAT' });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    const errCode = error?.code || 'auth/unknown';
    // Internal log for operational tracking; do not expose internal details to client
    console.warn(`[AuthMiddleware] Verification failed (${errCode}):`, error?.message);

    if (errCode === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      error: 'Token de autenticación no válido o revocado.',
      code: 'UNAUTHORIZED',
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (token && token !== 'undefined' && token !== 'null' && token !== '[object Object]' && token.length >= 20) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
      } catch (error: any) {
        // Non-blocking for public views - safely ignore invalid/expired tokens without breaking execution
        console.debug('[optionalAuth] Ignored token error:', error?.code || error?.message);
      }
    }
  }
  next();
};
