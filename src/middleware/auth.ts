import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redisClient } from '../utils/redis';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    apiKey?: string;
  };
}

// API Key authentication (simplified)
export const apiKeyAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({ error: 'API key is required' });
      return;
    }

    // Validate API key format
    if (!isValidApiKey(apiKey)) {
      res.status(401).json({ error: 'Invalid API key format' });
      return;
    }

    // Check if API key exists in Redis
    const keyId = await redisClient.getToken(apiKey);
    
    if (!keyId) {
      res.status(401).json({ error: 'Invalid or expired API key' });
      return;
    }

    // Attach key info to request
    req.user = {
      id: keyId,
      apiKey,
    };

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Simplified authentication (only API key)
export const authenticate = apiKeyAuth;

// Generate API key
export const generateApiKey = (): string => {
  const random = crypto.randomBytes(16).toString('hex');
  return `tlx_${random}`;
};

// Validate API key format
const isValidApiKey = (apiKey: string): boolean => {
  return /^tlx_[a-f0-9]{32}$/.test(apiKey);
};

// Optional authentication (allows unauthenticated requests)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (apiKey) {
    return authenticate(req, res, next);
  }
  
  next();
};