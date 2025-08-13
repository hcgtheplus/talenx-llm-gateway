import { llmService, LLMMessage } from './llm';
import { mcpClient } from './mcp/client';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface ProcessRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  ttid?: string;  // TTID for MCP authentication
  stream?: boolean;
}

export interface ProcessResponse {
  llmResponse: any;
  mcpData?: any;
  toolsUsed?: string[];
  timestamp: string;
}

export class Orchestrator {
  /**
   * 메인 처리 플로우
   * 1. MCP 도구 목록 가져오기
   * 2. LLM에게 프롬프트와 도구 정보 전달하여 분석
   * 3. LLM이 선택한 도구 실행
   * 4. 도구 결과를 포함하여 최종 응답 생성
   */
  async process(request: ProcessRequest): Promise<ProcessResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing integrated request', {
        hasTTID: !!request.ttid,
        promptLength: request.prompt.length,
      });

      let toolsUsed: string[] = [];
      let mcpData: any = null;

      // 1. MCP 도구 목록 가져오기 (TTID가 있을 때만)
      let availableTools: any[] = [];
      if (request.ttid) {
        try {
          availableTools = await mcpClient.listTools(request.ttid);
          logger.info(`Found ${availableTools.length} MCP tools available`);
        } catch (error) {
          logger.warn('Failed to fetch MCP tools, continuing without tools:', error);
        }
      }

      // 2. LLM에게 도구 선택 및 실행 요청
      const toolSelectionMessages: LLMMessage[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(availableTools)
        },
        {
          role: 'user',
          content: request.prompt
        }
      ];

      // 첫 번째 LLM 호출: 도구 선택 및 파라미터 결정
      const toolDecision = await llmService.chat('openai', {
        model: 'gpt-4',
        messages: toolSelectionMessages,
        temperature: 0.1, // 낮은 temperature로 일관된 도구 선택
        maxTokens: 500,
      });

      // 3. LLM 응답에서 도구 호출 추출 및 실행
      const toolCalls = this.extractToolCalls(toolDecision.choices[0].message.content);
      
      if (toolCalls.length > 0 && request.ttid) {
        logger.info(`Executing ${toolCalls.length} tool calls`);
        mcpData = {};
        
        for (const toolCall of toolCalls) {
          try {
            logger.info(`Calling tool: ${toolCall.name}`, toolCall.arguments);
            const result = await mcpClient.callTool(
              {
                name: toolCall.name,
                arguments: toolCall.arguments,
              },
              request.ttid
            );
            
            mcpData[toolCall.name] = result;
            toolsUsed.push(toolCall.name);
          } catch (error: any) {
            logger.error(`Tool call failed for ${toolCall.name}:`, error);
            mcpData[toolCall.name] = { error: error.message };
          }
        }
      }

      // 4. 도구 실행 결과를 포함하여 최종 응답 생성
      const finalMessages: LLMMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant. Use the provided data to answer the user\'s question comprehensively.'
        },
        {
          role: 'user',
          content: request.prompt
        }
      ];

      // 도구 실행 결과가 있으면 추가
      if (mcpData && Object.keys(mcpData).length > 0) {
        finalMessages.push({
          role: 'assistant',
          content: `I've retrieved the following data:\n${JSON.stringify(mcpData, null, 2)}`
        });
        finalMessages.push({
          role: 'user',
          content: 'Based on this data, please provide a comprehensive answer to my original question.'
        });
      }

      // 최종 응답 생성
      const finalResponse = await llmService.chat('openai', {
        model: request.model || 'gpt-4',
        messages: finalMessages,
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || 1000,
        stream: request.stream,
      });

      const duration = Date.now() - startTime;
      logger.info('Request processed successfully', { 
        duration,
        toolsUsed: toolsUsed.length 
      });

      return {
        llmResponse: finalResponse,
        mcpData,
        toolsUsed,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Orchestrator processing error:', error);
      throw new AppError(
        `Processing failed: ${error.message}`,
        error.statusCode || 500
      );
    }
  }

  /**
   * 시스템 프롬프트 생성 - 사용 가능한 도구 정보 포함
   */
  private buildSystemPrompt(tools: any[]): string {
    if (tools.length === 0) {
      return 'You are a helpful assistant. Answer the user\'s question to the best of your ability.';
    }

    const toolDescriptions = tools.map(tool => 
      `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.inputSchema?.properties || {})}`
    ).join('\n');

    return `You are an AI assistant with access to the following tools:

${toolDescriptions}

When the user asks a question that would benefit from using these tools, respond with tool calls in the following format:
[TOOL_CALL: tool_name]
{
  "argument1": "value1",
  "argument2": "value2"
}
[/TOOL_CALL]

You can call multiple tools if needed. Only call tools when they would help answer the user's question.
If the question doesn't require tools, just answer directly.`;
  }

  /**
   * LLM 응답에서 도구 호출 추출
   */
  private extractToolCalls(content: string): Array<{ name: string; arguments: any }> {
    const toolCalls: Array<{ name: string; arguments: any }> = [];
    const regex = /\[TOOL_CALL:\s*(\w+)\]\s*(\{[\s\S]*?\})\s*\[\/TOOL_CALL\]/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      try {
        const name = match[1];
        const arguments_ = JSON.parse(match[2]);
        toolCalls.push({ name, arguments: arguments_ });
      } catch (error) {
        logger.error('Failed to parse tool call:', error);
      }
    }
    
    return toolCalls;
  }

  /**
   * 스트리밍 처리
   */
  async *processStream(request: ProcessRequest): AsyncGenerator<string, void, unknown> {
    try {
      // 도구 실행은 스트리밍 전에 완료
      let availableTools: any[] = [];
      let mcpData: any = null;
      let toolsUsed: string[] = [];

      if (request.ttid) {
        try {
          availableTools = await mcpClient.listTools(request.ttid);
          
          // 도구 선택 및 실행
          const toolSelectionMessages: LLMMessage[] = [
            {
              role: 'system',
              content: this.buildSystemPrompt(availableTools)
            },
            {
              role: 'user',
              content: request.prompt
            }
          ];

          const toolDecision = await llmService.chat('openai', {
            model: 'gpt-4',
            messages: toolSelectionMessages,
            temperature: 0.1,
            maxTokens: 500,
          });

          const toolCalls = this.extractToolCalls(toolDecision.choices[0].message.content);
          
          if (toolCalls.length > 0) {
            mcpData = {};
            for (const toolCall of toolCalls) {
              try {
                const result = await mcpClient.callTool(
                  {
                    name: toolCall.name,
                    arguments: toolCall.arguments,
                  },
                  request.ttid
                );
                mcpData[toolCall.name] = result;
                toolsUsed.push(toolCall.name);
              } catch (error: any) {
                mcpData[toolCall.name] = { error: error.message };
              }
            }
            
            // 도구 실행 결과 먼저 스트리밍
            yield `data: ${JSON.stringify({ type: 'tools_used', tools: toolsUsed })}\n\n`;
            yield `data: ${JSON.stringify({ type: 'mcp_data', data: mcpData })}\n\n`;
          }
        } catch (error) {
          logger.warn('Failed to use MCP tools in stream:', error);
        }
      }

      // 최종 응답 스트리밍
      const finalMessages: LLMMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant. Use the provided data to answer the user\'s question comprehensively.'
        },
        {
          role: 'user',
          content: request.prompt
        }
      ];

      if (mcpData && Object.keys(mcpData).length > 0) {
        finalMessages.push({
          role: 'assistant',
          content: `I've retrieved the following data:\n${JSON.stringify(mcpData, null, 2)}`
        });
        finalMessages.push({
          role: 'user',
          content: 'Based on this data, please provide a comprehensive answer to my original question.'
        });
      }

      // LLM 응답 스트리밍
      for await (const chunk of llmService.streamChat('openai', {
        model: request.model || 'gpt-4',
        messages: finalMessages,
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || 1000,
        stream: true,
      })) {
        yield `data: ${JSON.stringify({ type: 'llm_chunk', content: chunk })}\n\n`;
      }
      
      yield 'data: [DONE]\n\n';
    } catch (error: any) {
      logger.error('Stream processing error:', error);
      yield `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`;
    }
  }
}

export const orchestrator = new Orchestrator();