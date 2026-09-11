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
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  // Handle Demo Mode token
  if (token.startsWith('demo_token_') || token === 'demo_merchant_token') {
    const demoUid = token.startsWith('demo_token_')
      ? token.replace('demo_token_', '')
      : 'demo_merchant_uid_1';

    req.user = {
      uid: demoUid || 'demo_merchant_uid_1',
      email: 'contacto@elmolino.com',
      name: 'Carlos Mendoza (Demo)',
      auth_time: Math.floor(Date.now() / 1000),
      iss: 'demo-auth',
      aud: 'demo-app',
      sub: demoUid || 'demo_merchant_uid_1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
      firebase: { identities: {}, sign_in_provider: 'custom' },
    } as DecodedIdToken;
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
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
    if (token) {
      if (token.startsWith('demo_token_') || token === 'demo_merchant_token') {
        const demoUid = token.startsWith('demo_token_')
          ? token.replace('demo_token_', '')
          : 'demo_merchant_uid_1';
        req.user = {
          uid: demoUid,
          email: 'contacto@elmolino.com',
          name: 'Carlos Mendoza (Demo)',
          auth_time: Math.floor(Date.now() / 1000),
          iss: 'demo-auth',
          aud: 'demo-app',
          sub: demoUid,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400 * 7,
          firebase: { identities: {}, sign_in_provider: 'custom' },
        } as DecodedIdToken;
        return next();
      }

      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
      } catch {
        // non-blocking for public views
      }
    }
  }
  next();
};
