import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    ttid?: string;       // TTID cookie for authentication
  };
}

// Authentication middleware - extracts TTID from cookie
export const ttidAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cookieHeader = req.headers.cookie as string;
    
    // Extract TTID from cookie header
    let ttid: string | undefined;
    if (cookieHeader) {
      const ttidMatch = cookieHeader.match(/TTID=([^;]+)/);  
      if (ttidMatch) {
        ttid = ttidMatch[1];
      }
    }
    
    // TTID is required for authentication
    if (!ttid) {
      res.status(401).json({ error: 'Authentication required. Please provide TTID cookie.' });
      return;
    }

    // Attach auth info to request
    req.user = {
      id: ttid.substring(0, 20),  // Use part of TTID as ID for logging
      ttid,  // Store full TTID for MCP server
    };

    logger.debug('Auth extracted:', {
      hasTTID: true,
      userId: req.user.id,
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Main authentication middleware
export const authenticate = ttidAuth;


// Optional authentication (allows unauthenticated requests)
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const cookieHeader = req.headers.cookie as string;
  
  // Extract TTID if available
  let ttid: string | undefined;
  if (cookieHeader) {
    const ttidMatch = cookieHeader.match(/TTID=([^;]+)/);
    if (ttidMatch) {
      ttid = ttidMatch[1];
      req.user = {
        id: ttid.substring(0, 20),
        ttid,
      };
    }
  }
  
  next();
};