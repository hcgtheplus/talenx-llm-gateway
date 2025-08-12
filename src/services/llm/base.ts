import { logger } from '../../utils/logger';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  userId?: string;
}

export interface LLMResponse {
  id: string;
  model: string;
  choices: {
    message: LLMMessage;
    finishReason: string;
    index: number;
  }[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export abstract class LLMProvider {
  protected apiKey: string;
  protected baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  abstract chat(options: LLMOptions): Promise<LLMResponse>;
  abstract streamChat(options: LLMOptions): AsyncGenerator<string, void, unknown>;

  protected async handleError(error: any, provider: string): Promise<never> {
    logger.error(`${provider} API error:`, error);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;
      
      if (status === 401) {
        throw new Error(`${provider} authentication failed: Invalid API key`);
      } else if (status === 429) {
        throw new Error(`${provider} rate limit exceeded`);
      } else if (status === 400) {
        throw new Error(`${provider} bad request: ${message}`);
      } else if (status >= 500) {
        throw new Error(`${provider} service error: ${message}`);
      }
    }
    
    throw new Error(`${provider} request failed: ${error.message}`);
  }

  protected validateOptions(options: LLMOptions): void {
    if (!options.model) {
      throw new Error('Model is required');
    }
    
    if (!options.messages || options.messages.length === 0) {
      throw new Error('Messages are required');
    }
    
    if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }
    
    if (options.topP !== undefined && (options.topP < 0 || options.topP > 1)) {
      throw new Error('Top P must be between 0 and 1');
    }
  }
}