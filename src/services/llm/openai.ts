import axios from 'axios';
import { LLMProvider, LLMOptions, LLMResponse } from './base';
import { logger } from '../../utils/logger';

export class OpenAIProvider extends LLMProvider {
  constructor(apiKey: string, baseUrl: string = 'https://api.openai.com/v1') {
    super(apiKey, baseUrl);
  }

  async chat(options: LLMOptions): Promise<LLMResponse> {
    this.validateOptions(options);

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: options.model,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
          stream: false,
          user: options.userId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      return {
        id: data.id,
        model: data.model,
        choices: data.choices.map((choice: any) => ({
          message: choice.message,
          finishReason: choice.finish_reason,
          index: choice.index,
        })),
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      return this.handleError(error, 'OpenAI');
    }
  }

  async *streamChat(options: LLMOptions): AsyncGenerator<string, void, unknown> {
    this.validateOptions(options);

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: options.model,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          top_p: options.topP,
          frequency_penalty: options.frequencyPenalty,
          presence_penalty: options.presencePenalty,
          stream: true,
          user: options.userId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              
              if (content) {
                yield content;
              }
            } catch (e) {
              logger.warn('Failed to parse SSE chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      return this.handleError(error, 'OpenAI');
    }
  }

  // Helper method to validate model names
  static isValidModel(model: string): boolean {
    const validModels = [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];
    
    return validModels.some(validModel => model.startsWith(validModel));
  }
}