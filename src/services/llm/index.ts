import { LLMProvider, LLMOptions, LLMResponse } from './base';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { redisClient } from '../../utils/redis';
import { logger } from '../../utils/logger';

export type LLMProviderType = 'openai' | 'anthropic';

export class LLMService {
  private providers: Map<LLMProviderType, LLMProvider>;

  constructor() {
    this.providers = new Map();
    
    // Initialize providers
    if (config.llm.openai.apiKey) {
      this.providers.set('openai', new OpenAIProvider(
        config.llm.openai.apiKey,
        config.llm.openai.baseUrl
      ));
    }
    
    if (config.llm.anthropic.apiKey) {
      this.providers.set('anthropic', new AnthropicProvider(
        config.llm.anthropic.apiKey,
        config.llm.anthropic.baseUrl
      ));
    }
  }

  async chat(provider: LLMProviderType, options: LLMOptions): Promise<LLMResponse> {
    const llmProvider = this.providers.get(provider);
    
    if (!llmProvider) {
      throw new AppError(`LLM provider '${provider}' is not configured`, 400);
    }

    // Check cache if applicable
    const cacheKey = this.getCacheKey(provider, options);
    const cachedResponse = await redisClient.getCache(cacheKey);
    
    if (cachedResponse) {
      logger.info(`Cache hit for ${provider} request`);
      return cachedResponse;
    }

    // Make API call
    const startTime = Date.now();
    const response = await llmProvider.chat(options);
    const duration = Date.now() - startTime;

    // Log usage
    logger.info(`LLM request completed`, {
      provider,
      model: options.model,
      userId: options.userId,
      duration,
      usage: response.usage,
    });

    // Cache response (only for non-streaming, deterministic requests)
    if (options.temperature === 0 && !options.stream) {
      await redisClient.setCache(cacheKey, response, 300); // 5 minutes cache
    }

    // Track usage for billing/monitoring
    if (options.userId && response.usage) {
      await this.trackUsage(options.userId, provider, response.usage);
    }

    return response;
  }

  async *streamChat(provider: LLMProviderType, options: LLMOptions): AsyncGenerator<string, void, unknown> {
    const llmProvider = this.providers.get(provider);
    
    if (!llmProvider) {
      throw new AppError(`LLM provider '${provider}' is not configured`, 400);
    }

    const startTime = Date.now();
    let tokenCount = 0;

    try {
      for await (const chunk of llmProvider.streamChat(options)) {
        tokenCount += chunk.length; // Rough approximation
        yield chunk;
      }
    } finally {
      const duration = Date.now() - startTime;
      
      logger.info(`LLM stream completed`, {
        provider,
        model: options.model,
        userId: options.userId,
        duration,
        approximateTokens: tokenCount,
      });

      // Track approximate usage
      if (options.userId) {
        await this.trackUsage(options.userId, provider, {
          promptTokens: 0,
          completionTokens: tokenCount,
          totalTokens: tokenCount,
        });
      }
    }
  }

  private getCacheKey(provider: LLMProviderType, options: LLMOptions): string {
    const key = JSON.stringify({
      provider,
      model: options.model,
      messages: options.messages,
      temperature: options.temperature || 0,
      maxTokens: options.maxTokens,
      topP: options.topP,
    });
    
    return `llm:${Buffer.from(key).toString('base64')}`;
  }

  private async trackUsage(
    userId: string,
    provider: LLMProviderType,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  ): Promise<void> {
    const key = `usage:${userId}:${provider}:${new Date().toISOString().split('T')[0]}`;
    const client = redisClient.getClient();
    
    await client.hincrby(key, 'promptTokens', usage.promptTokens);
    await client.hincrby(key, 'completionTokens', usage.completionTokens);
    await client.hincrby(key, 'totalTokens', usage.totalTokens);
    await client.expire(key, 86400 * 30); // Keep for 30 days
  }

  async getUsage(userId: string, provider?: LLMProviderType, days: number = 30): Promise<any> {
    const client = redisClient.getClient();
    const usage: any = {};
    
    const providers = provider ? [provider] : Array.from(this.providers.keys());
    
    for (const prov of providers) {
      usage[prov] = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
      
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const key = `usage:${userId}:${prov}:${dateStr}`;
        
        const dayUsage = await client.hgetall(key);
        
        if (dayUsage) {
          usage[prov].promptTokens += parseInt(dayUsage.promptTokens || '0', 10);
          usage[prov].completionTokens += parseInt(dayUsage.completionTokens || '0', 10);
          usage[prov].totalTokens += parseInt(dayUsage.totalTokens || '0', 10);
        }
      }
    }
    
    return usage;
  }

  getAvailableProviders(): LLMProviderType[] {
    return Array.from(this.providers.keys());
  }

  isProviderAvailable(provider: LLMProviderType): boolean {
    return this.providers.has(provider);
  }
}

export const llmService = new LLMService();

export * from './base';