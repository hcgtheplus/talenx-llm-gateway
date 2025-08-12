import { Router } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { standardRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { llmService, LLMProviderType } from '../services/llm';
import { Response } from 'express';

const router = Router();

// Validation rules for chat endpoint
const chatValidation = [
  { field: 'model', required: true, type: 'string' as const },
  { field: 'messages', required: true, type: 'array' as const, min: 1 },
  { field: 'temperature', required: false, type: 'number' as const, min: 0, max: 2 },
  { field: 'maxTokens', required: false, type: 'number' as const, min: 1, max: 4096 },
  { field: 'stream', required: false, type: 'boolean' as const },
];

// Chat completion endpoint
router.post(
  '/chat',
  authenticate,
  standardRateLimiter,
  validate(chatValidation),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { model, messages, temperature, maxTokens, topP, stream } = req.body;
    const provider = 'openai'; // OpenAI only

    const options = {
      model,
      messages,
      temperature,
      maxTokens,
      topP,
      stream,
      userId: req.user?.id,
    };

    if (stream) {
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        for await (const chunk of llmService.streamChat(provider, options)) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error: any) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    } else {
      const response = await llmService.chat(provider, options);
      res.json(response);
    }
  })
);

// List available providers
router.get(
  '/providers',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const providers = llmService.getAvailableProviders();
    
    res.json({
      providers: providers.map(p => ({
        name: p,
        available: true,
        models: getModelsForProvider(p),
      })),
    });
  })
);

// Get usage statistics
router.get(
  '/usage',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { provider, days } = req.query;
    const userId = req.user!.id;

    const usage = await llmService.getUsage(
      userId,
      provider as LLMProviderType | undefined,
      days ? parseInt(days as string, 10) : 30
    );

    res.json({ usage });
  })
);

// Helper function to get available models for a provider
function getModelsForProvider(provider: LLMProviderType): string[] {
  switch (provider) {
    case 'openai':
      return [
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
      ];
    default:
      return [];
  }
}

export default router;