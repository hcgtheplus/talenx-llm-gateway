import { Router } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { standardRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { mcpClient } from '../services/mcp/client';
import { Response } from 'express';

const router = Router();

// List available MCP tools - MCP 서버에서 사용 가능한 도구 목록 반환
router.get(
  '/tools',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ttid = req.user?.ttid;
    const tools = await mcpClient.listTools(ttid);
    res.json({ tools });
  })
);

// Call an MCP tool directly - 특정 MCP 도구를 직접 실행
router.post(
  '/tools/call',
  authenticate,
  standardRateLimiter,
  validate([
    { field: 'name', required: true, type: 'string' as const },
    { field: 'arguments', required: false, type: 'object' as const },
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, arguments: args } = req.body;
    const ttid = req.user?.ttid;
    
    const result = await mcpClient.callTool(
      {
        name,
        arguments: args,
      },
      ttid
    );
    
    res.json(result);
  })
);

// MCP health check
router.get(
  '/health',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ttid = req.user?.ttid;
    const isHealthy = await mcpClient.healthCheck(ttid);
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;