import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get current user info from TTID
router.get(
  '/user-info',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ttid = req.user?.ttid;
    
    if (!ttid) {
      res.status(401).json({ error: 'No TTID found' });
      return;
    }
    
    // Parse JWT payload (without verification, just for display)
    try {
      const [, payload] = ttid.split('.');
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      res.json({
        userId: req.user?.id,
        accountId: decoded.accountId || decoded.sub,
        loginId: decoded.loginId,
        issuer: decoded.iss,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        authenticated: true,
      });
    } catch (error) {
      logger.error('Failed to parse TTID:', error);
      res.json({
        userId: req.user?.id,
        authenticated: true,
        message: 'TTID present but could not parse details',
      });
    }
  })
);

// Check authentication status
router.get(
  '/status',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const cookieHeader = req.headers.cookie as string;
    let hasTTID = false;
    
    if (cookieHeader) {
      const ttidMatch = cookieHeader.match(/TTID=([^;]+)/);
      hasTTID = !!ttidMatch;
    }
    
    res.json({
      authenticated: hasTTID,
      authMethod: hasTTID ? 'TTID Cookie' : 'None',
      message: hasTTID ? 'Authenticated via TTID cookie' : 'No authentication found',
    });
  })
);

export default router;