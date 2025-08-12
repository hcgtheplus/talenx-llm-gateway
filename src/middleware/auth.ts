import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    apiKey?: string;
    authToken?: string;  // Original auth token for MCP server
    ttid?: string;       // TTID cookie for authentication
    cookies?: string;    // Full cookie string to pass through
  };
}

// API Key authentication - validates format and passes through
export const apiKeyAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const authToken = req.headers['authorization'] as string;  // Get auth token for MCP
    const cookieHeader = req.headers.cookie as string;  // Get full cookie string
    
    // Extract TTID from cookie header
    let ttid: string | undefined;
    if (cookieHeader) {
      const ttidMatch = cookieHeader.match(/TTID=([^;]+)/);  
      if (ttidMatch) {
        ttid = ttidMatch[1];
      }
    }
    
    // Check for any form of authentication
    if (!apiKey && !authToken && !ttid) {
      res.status(401).json({ error: 'Authentication is required (API Key, Bearer token, or TTID cookie)' });
      return;
    }

    // If API key is provided, validate format
    if (apiKey && !isValidApiKey(apiKey)) {
      res.status(401).json({ error: 'Invalid API key format' });
      return;
    }

    // Attach auth info to request (no Redis storage)
    req.user = {
      id: apiKey || ttid || 'bearer_auth',  // Use API key, TTID, or indicate bearer auth
      apiKey,
      authToken: authToken?.replace('Bearer ', ''),  // Store clean token for MCP
      ttid,  // Store TTID for MCP server
      cookies: cookieHeader,  // Store full cookie string for passthrough
    };

    logger.debug('Auth extracted:', {
      hasApiKey: !!apiKey,
      hasAuthToken: !!authToken,
      hasTTID: !!ttid,
    });

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
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