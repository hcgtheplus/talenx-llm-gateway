import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';
import { redisClient } from '../utils/redis';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();

// Generate API key (simplified - no user registration)
router.post(
  '/api-key/generate',
  strictRateLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    // Generate unique API key
    const apiKey = `tlx_${crypto.randomBytes(16).toString('hex')}`;
    const keyId = crypto.randomUUID();
    
    // Store API key in Redis (no user data needed)
    await redisClient.setToken(apiKey, keyId, 86400 * 365); // 1 year TTL
    
    logger.info(`New API key generated: ${keyId}`);
    
    res.status(201).json({
      apiKey,
      keyId,
      expiresIn: 86400 * 365,
      message: 'API key created successfully. Keep it secure!'
    });
  })
);

// Validate API key
router.post(
  '/api-key/validate',
  asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      res.status(400).json({ error: 'API key is required' });
      return;
    }
    
    // Check if API key exists
    const keyId = await redisClient.getToken(apiKey);
    
    res.json({
      valid: !!keyId,
      keyId: keyId || null
    });
  })
);

// Revoke API key
router.delete(
  '/api-key/revoke',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const apiKey = req.user?.apiKey;
    
    if (!apiKey) {
      res.status(400).json({ error: 'No API key to revoke' });
      return;
    }
    
    await redisClient.deleteToken(apiKey);
    
    logger.info(`API key revoked: ${req.user?.id}`);
    
    res.json({ message: 'API key revoked successfully' });
  })
);

// Get API key info (for debugging/monitoring)
router.get(
  '/api-key/info',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({
      keyId: req.user?.id,
      apiKey: req.user?.apiKey?.substring(0, 10) + '...' // Show partial key only
    });
  })
);

export default router;