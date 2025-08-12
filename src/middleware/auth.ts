import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    apiKey?: string;
    ttid?: string;       // TTID cookie for MCP authentication
  };
}

// Authentication middleware - validates API key format and extracts TTID
export const apiKeyAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const cookieHeader = req.headers.cookie as string;
    
    // Extract TTID from cookie header
    let ttid: string | undefined;
    if (cookieHeader) {
      const ttidMatch = cookieHeader.match(/TTID=([^;]+)/);  
      if (ttidMatch) {
        ttid = ttidMatch[1];
      }
    }
    
    // Check for any form of authentication
    if (!apiKey && !ttid) {
      res.status(401).json({ error: 'Authentication is required (API Key or TTID cookie)' });
      return;
    }

    // If API key is provided, validate format
    if (apiKey && !isValidApiKey(apiKey)) {
      res.status(401).json({ error: 'Invalid API key format' });
      return;
    }

    // Attach auth info to request
    req.user = {
      id: apiKey || ttid?.substring(0, 20) || 'anonymous',  // Use API key or part of TTID as ID
      apiKey,
      ttid,  // Store TTID for MCP server
    };

    logger.debug('Auth extracted:', {
      hasApiKey: !!apiKey,
      hasTTID: !!ttid,
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Simplified authentication (only API key)
export const authenticate = apiKeyAuth;

// Generate API key (kept for utility, but not stored in Redis)
export const generateApiKey = (): string => {
  const random = require('crypto').randomBytes(16).toString('hex');
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