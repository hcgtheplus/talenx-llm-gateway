import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { standardRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { orchestrator } from '../services/orchestrator';
import { logger } from '../utils/logger';

const router = Router();

// 통합 처리 엔드포인트 - 클라이언트의 토큰을 재활용
router.post(
  '/process',
  authenticate,
  standardRateLimiter,
  validate([
    { field: 'prompt', required: true, type: 'string' as const, min: 1 },
    { field: 'model', required: false, type: 'string' as const },
    { field: 'mcpTools', required: false, type: 'array' as const },
    { field: 'temperature', required: false, type: 'number' as const, min: 0, max: 2 },
    { field: 'maxTokens', required: false, type: 'number' as const, min: 1, max: 4096 },
    { field: 'stream', required: false, type: 'boolean' as const },
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
      prompt, 
      model, 
      mcpTools, 
      temperature, 
      maxTokens, 
      stream 
    } = req.body;

    // 클라이언트의 Authorization 헤더 추출 (Bearer 토큰)
    const clientToken = req.headers.authorization?.replace('Bearer ', '') || 
                       req.headers['x-client-token'] as string;

    logger.info('Processing integrated request', {
      userId: req.user?.id,
      hasClientToken: !!clientToken,
      mcpTools: mcpTools?.length || 0,
      stream,
    });

    const processRequest = {
      prompt,
      model,
      mcpTools,
      temperature,
      maxTokens,
      clientToken,
    };

    if (stream) {
      // 스트리밍 응답
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      try {
        for await (const chunk of orchestrator.processStream(processRequest)) {
          res.write(chunk);
        }
        res.end();
      } catch (error: any) {
        logger.error('Streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    } else {
      // 일반 응답
      const response = await orchestrator.process(processRequest);
      res.json(response);
    }
  })
);

// 간단한 프롬프트 처리 (MCP 없이, OpenAI only)
router.post(
  '/prompt',
  authenticate,
  standardRateLimiter,
  validate([
    { field: 'prompt', required: true, type: 'string' as const, min: 1 },
    { field: 'model', required: false, type: 'string' as const },
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { prompt, model } = req.body;

    const response = await orchestrator.process({
      prompt,
      model,
      mcpTools: [], // MCP 도구 사용 안함
    });

    res.json({
      response: response.llmResponse.choices[0].message.content,
      usage: response.llmResponse.usage,
      timestamp: response.timestamp,
    });
  })
);

// MCP 도구 목록 조회 (클라이언트 토큰 사용)
router.get(
  '/available-tools',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const clientToken = req.headers.authorization?.replace('Bearer ', '') || 
                       req.headers['x-client-token'] as string;

    if (!clientToken) {
      res.json({ 
        tools: [],
        message: 'No client token provided. MCP tools unavailable.' 
      });
      return;
    }

    try {
      const { mcpClient } = await import('../services/mcp/client');
      await mcpClient.setAuthToken(clientToken);
      const tools = await mcpClient.listTools();
      
      res.json({ 
        tools,
        authenticated: true 
      });
    } catch (error: any) {
      logger.error('Failed to list MCP tools:', error);
      res.json({ 
        tools: [],
        error: 'Failed to fetch MCP tools',
        authenticated: false 
      });
    }
  })
);

// 컨텍스트 조회
router.get(
  '/context/:contextId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { contextId } = req.params;
    const { redisClient } = await import('../utils/redis');
    
    const context = await redisClient.getCache(contextId);
    
    if (!context) {
      res.status(404).json({ error: 'Context not found or expired' });
      return;
    }
    
    res.json(context);
  })
);

export default router;