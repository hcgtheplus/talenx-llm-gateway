import axios from 'axios';
import { LLMProvider, LLMOptions, LLMResponse, LLMMessage } from './base';
import { logger } from '../../utils/logger';

export class AnthropicProvider extends LLMProvider {
  constructor(apiKey: string, baseUrl: string = 'https://api.anthropic.com') {
    super(apiKey, baseUrl);
  }

  async chat(options: LLMOptions): Promise<LLMResponse> {
    this.validateOptions(options);

    try {
      // Convert messages to Anthropic format
      const { system, messages } = this.formatMessages(options.messages);

      const response = await axios.post(
        `${this.baseUrl}/v1/messages`,
        {
          model: options.model,
          messages: messages,
          system: system,
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature,
          top_p: options.topP,
          stream: false,
          metadata: options.userId ? { user_id: options.userId } : undefined,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      return {
        id: data.id,
        model: data.model,
        choices: [{
          message: {
            role: 'assistant',
            content: data.content[0].text,
          },
          finishReason: data.stop_reason || 'stop',
          index: 0,
        }],
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        } : undefined,
      };
    } catch (error) {
      return this.handleError(error, 'Anthropic');
    }
  }

  async *streamChat(options: LLMOptions): AsyncGenerator<string, void, unknown> {
    this.validateOptions(options);

    try {
      const { system, messages } = this.formatMessages(options.messages);

      const response = await axios.post(
        `${this.baseUrl}/v1/messages`,
        {
          model: options.model,
          messages: messages,
          system: system,
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature,
          top_p: options.topP,
          stream: true,
          metadata: options.userId ? { user_id: options.userId } : undefined,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
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

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta') {
                const content = parsed.delta?.text;
                if (content) {
                  yield content;
                }
              } else if (parsed.type === 'message_stop') {
                return;
              }
            } catch (e) {
              logger.warn('Failed to parse SSE chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      return this.handleError(error, 'Anthropic');
    }
  }

  // Convert OpenAI-style messages to Anthropic format
  private formatMessages(messages: LLMMessage[]): {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let system: string | undefined;
    const formattedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const message of messages) {
      if (message.role === 'system') {
        system = message.content;
      } else if (message.role === 'user' || message.role === 'assistant') {
        formattedMessages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    return { system, messages: formattedMessages };
  }

  // Helper method to validate model names
  static isValidModel(model: string): boolean {
    const validModels = [
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];
    
    return validModels.some(validModel => model.startsWith(validModel));
  }
}