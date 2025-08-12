import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();

// Generate API key (for testing/utility - not stored)
router.post(
  '/api-key/generate',
  strictRateLimiter,
  asyncHandler(async (_req: Request, res: Response) => {
    // Generate unique API key
    const apiKey = `tlx_${crypto.randomBytes(16).toString('hex')}`;
    const keyId = crypto.randomUUID();
    
    logger.info(`New API key generated (not stored): ${keyId}`);
    
    res.status(201).json({
      apiKey,
      keyId,
      message: 'API key generated. Note: Keys are not stored server-side. Use any valid format key for authentication.'
    });
  })
);

// Validate API key format
router.post(
  '/api-key/validate',
  asyncHandler(async (req: Request, res: Response) => {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      res.status(400).json({ error: 'API key is required' });
      return;
    }
    
    // Only validate format, not storage
    const isValid = /^tlx_[a-f0-9]{32}$/.test(apiKey);
    
    res.json({
      valid: isValid,
      message: isValid ? 'Valid API key format' : 'Invalid API key format'
    });
  })
);

// Revoke API key (informational only - keys not stored)
router.delete(
  '/api-key/revoke',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const apiKey = req.user?.apiKey;
    
    if (!apiKey) {
      res.status(400).json({ error: 'No API key to revoke' });
      return;
    }
    
    logger.info(`API key revoke requested (no-op): ${req.user?.id}`);
    
    res.json({ 
      message: 'API key marked as revoked. Note: Keys are not stored server-side, so this action is informational only.' 
    });
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