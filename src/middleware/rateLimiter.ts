import { Request, Response, NextFunction } from 'express';

interface RateLimiterOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max number of requests allowed in window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    message = 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.',
    keyGenerator = (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || '127.0.0.1';
      return ip.trim();
    },
  } = options;

  const store = new Map<string, RateLimitRecord>();

  // Periodically clean up expired entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetTime <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Allow Node.js process to exit cleanly if needed
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetTime <= now) {
      store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.ceil((existing.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: retryAfterSeconds,
      });
    }

    existing.count += 1;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - existing.count));
    next();
  };
}

// Pre-configured rate limiters for sensitive endpoints
export const reviewsRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 reviews per 5 minutes per IP
  message: 'Has enviado demasiadas reseñas recientemente. Por favor, espera unos minutos.',
});

export const storeCreationRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 stores per 10 minutes per IP
  message: 'Has alcanzado el límite de creación de tiendas por período. Espera 10 minutos.',
});

export const authSyncRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 sync requests per minute
  message: 'Demasiadas solicitudes de autenticación.',
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 uploads per minute per IP
  message: 'Límite de subida de imágenes alcanzado. Espera un momento antes de subir más imágenes.',
});

export const webhooksRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 webhook calls per minute
  message: 'Webhook rate limit exceeded.',
});
