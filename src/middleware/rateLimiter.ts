import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../utils/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AuthRequest } from './auth';

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const createRateLimiter = (options: RateLimitOptions = {}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    maxRequests = config.rateLimit.maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = keyGenerator(req);
      
      // Increment counter
      const count = await redisClient.incrementRateLimit(key, windowMs);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      if (count > maxRequests) {
        logger.warn(`Rate limit exceeded for key: ${key}`);
        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again later.`,
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }

      // Hook to potentially skip counting based on response
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.send;
        res.send = function (data) {
          const statusCode = res.statusCode;
          
          if (
            (skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400)
          ) {
            // Decrement the counter if we should skip this request
            redisClient.getClient().decr(`rate:${key}`).catch(err => {
              logger.error('Failed to decrement rate limit counter:', err);
            });
          }
          
          return originalSend.call(this, data);
        };
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
};

// Default key generator - uses user ID if authenticated, otherwise IP
const defaultKeyGenerator = (req: AuthRequest): string => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // Get client IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  
  return `ip:${ip}`;
};

// Strict rate limiter for sensitive endpoints
export const strictRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10,
});

// Standard rate limiter for general API endpoints
export const standardRateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.maxRequests,
});

// Lenient rate limiter for less sensitive endpoints
export const lenientRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 200,
});

// Per-endpoint custom rate limiter
export const endpointRateLimiter = (endpoint: string, maxRequests: number = 100) => {
  return createRateLimiter({
    windowMs: 60000,
    maxRequests,
    keyGenerator: (req: AuthRequest) => {
      const baseKey = defaultKeyGenerator(req);
      return `${baseKey}:${endpoint}`;
    },
  });
};