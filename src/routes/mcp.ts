import { Router } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { standardRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { mcpClient, MCPAuthConfig } from '../services/mcp/client';
import { Response } from 'express';

const router = Router();

// List available MCP tools
router.get(
  '/tools',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authConfig: MCPAuthConfig = {
      authToken: req.user?.authToken,
      ttid: req.user?.ttid,
      cookies: req.user?.cookies,
    };
    const tools = await mcpClient.listTools(authConfig);
    res.json({ tools });
  })
);

// Call an MCP tool
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
    const authConfig: MCPAuthConfig = {
      authToken: req.user?.authToken,
      ttid: req.user?.ttid,
      cookies: req.user?.cookies,
    };
    
    const result = await mcpClient.callTool(
      {
        name,
        arguments: args,
      },
      authConfig
    );
    
    res.json(result);
  })
);

// Get appraisals
router.get(
  '/appraisals',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, size, status, name } = req.query;
    const authConfig: MCPAuthConfig = {
      authToken: req.user?.authToken,
      ttid: req.user?.ttid,
      cookies: req.user?.cookies,
    };
    
    const appraisals = await mcpClient.getAppraisals(
      {
        page: page ? parseInt(page as string, 10) : undefined,
        size: size ? parseInt(size as string, 10) : undefined,
        status: status as string,
        name: name as string,
      },
      authConfig
    );
    
    res.json(appraisals);
  })
);

// Get response results for a specific appraisal group
router.get(
  '/appraisals/:appraisalId/groups/:groupId/responses',
  authenticate,
  standardRateLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { appraisalId, groupId } = req.params;
    const { page, size } = req.query;
    const authConfig: MCPAuthConfig = {
      authToken: req.user?.authToken,
      ttid: req.user?.ttid,
      cookies: req.user?.cookies,
    };
    
    const responses = await mcpClient.getResponseResults(
      parseInt(appraisalId, 10),
      parseInt(groupId, 10),
      {
        page: page ? parseInt(page as string, 10) : undefined,
        size: size ? parseInt(size as string, 10) : undefined,
      },
      authConfig
    );
    
    res.json(responses);
  })
);

// Validate workspace access
router.post(
  '/workspace/validate',
  authenticate,
  validate([
    { field: 'workspaceHash', required: true, type: 'string' as const },
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { workspaceHash } = req.body;
    
    const isValid = await mcpClient.validateWorkspace(workspaceHash);
    
    res.json({
      valid: isValid,
      workspaceHash: isValid ? workspaceHash : null,
    });
  })
);

// MCP health check
router.get(
  '/health',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authConfig: MCPAuthConfig = {
      authToken: req.user?.authToken,
      ttid: req.user?.ttid,
      cookies: req.user?.cookies,
    };
    const isHealthy = await mcpClient.healthCheck(authConfig);
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;