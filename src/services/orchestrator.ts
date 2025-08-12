import { llmService, LLMMessage } from './llm';
import { mcpClient } from './mcp/client';
import { redisClient } from '../utils/redis';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface ProcessRequest {
  prompt: string;
  model?: string;
  mcpTools?: string[];
  temperature?: number;
  maxTokens?: number;
  ttid?: string;  // TTID for MCP authentication
}

export interface ProcessResponse {
  llmResponse: any;
  mcpData?: any;
  context?: any;
  timestamp: string;
}

export class Orchestrator {
  /**
   * 통합 처리 플로우
   * 1. 클라이언트 토큰으로 MCP 인증
   * 2. MCP 도구로 필요한 데이터 수집
   * 3. 수집된 데이터와 함께 LLM 프롬프트 실행
   * 4. 통합 응답 반환
   */
  async process(request: ProcessRequest): Promise<ProcessResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing integrated request', {
        hasTTID: !!request.ttid,
        mcpTools: request.mcpTools,
      });

      // 1. MCP 데이터 수집 (TTID 사용)
      let mcpData: any = null;
      let enrichedPrompt = request.prompt;

      if (request.mcpTools && request.mcpTools.length > 0) {
        logger.info('Fetching MCP data', {
          hasTTID: !!request.ttid
        });
        
        // MCP 도구 실행 (TTID 전달)
        mcpData = await this.executeMCPTools(request.mcpTools, request.ttid);
        
        // 프롬프트에 MCP 데이터 추가
        enrichedPrompt = this.enrichPrompt(request.prompt, mcpData);
      }

      // 2. LLM 프롬프트 실행
      const llmProvider = 'openai'; // OpenAI only
      const llmModel = request.model || this.getDefaultModel();
      
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful assistant with access to real-time data.'
        },
        {
          role: 'user',
          content: enrichedPrompt
        }
      ];

      logger.info('Executing LLM prompt', { 
        provider: llmProvider,
        model: llmModel,
        promptLength: enrichedPrompt.length 
      });

      const llmResponse = await llmService.chat(llmProvider, {
        model: llmModel,
        messages,
        temperature: request.temperature || 0.7,
        maxTokens: request.maxTokens || 1000,
      });

      // 3. 컨텍스트 저장 (선택사항)
      const contextKey = `context:${Date.now()}`;
      await redisClient.setCache(contextKey, {
        request,
        mcpData,
        llmResponse,
      }, 3600); // 1시간 보관

      const duration = Date.now() - startTime;
      logger.info('Request processed successfully', { duration });

      return {
        llmResponse,
        mcpData,
        context: {
          contextId: contextKey,
          processingTime: duration,
          toolsUsed: request.mcpTools,
        },
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
   * MCP 도구 실행
   */
  private async executeMCPTools(tools: string[], ttid?: string): Promise<any> {
    const results: Record<string, any> = {};
    
    for (const toolName of tools) {
      try {
        logger.info(`Executing MCP tool: ${toolName}`);
        
        let result;
        switch (toolName) {
          case 'get_appraisals':
            result = await mcpClient.getAppraisals({}, ttid);
            break;
          
          case 'get_response_results':
            // 기본값 사용, 실제로는 파라미터 전달 필요
            result = await mcpClient.getResponseResults(1, 1, {}, ttid);
            break;
          
          default:
            // 일반 도구 호출
            result = await mcpClient.callTool({ name: toolName }, ttid);
        }
        
        results[toolName] = result;
      } catch (error: any) {
        logger.error(`Failed to execute MCP tool ${toolName}:`, error);
        results[toolName] = { error: error.message };
      }
    }
    
    return results;
  }

  /**
   * MCP 데이터로 프롬프트 강화
   */
  private enrichPrompt(originalPrompt: string, mcpData: any): string {
    if (!mcpData || Object.keys(mcpData).length === 0) {
      return originalPrompt;
    }

    let enrichedPrompt = originalPrompt + '\n\n=== Available Data ===\n';
    
    for (const [tool, data] of Object.entries(mcpData)) {
      if (data && typeof data === 'object' && !('error' in data)) {
        enrichedPrompt += `\n[${tool} Results]:\n${JSON.stringify(data, null, 2)}\n`;
      }
    }
    
    enrichedPrompt += '\n=== End of Data ===\n\nPlease use the above data to answer the question.';
    
    return enrichedPrompt;
  }

  /**
   * 기본 모델 선택 (OpenAI only)
   */
  private getDefaultModel(): string {
    return 'gpt-3.5-turbo';
  }

  /**
   * 스트리밍 처리 (선택사항)
   */
  async *processStream(request: ProcessRequest): AsyncGenerator<string, void, unknown> {
    // MCP 데이터 먼저 수집
    let mcpData: any = null;
    let enrichedPrompt = request.prompt;

    if (request.mcpTools && request.mcpTools.length > 0) {
      mcpData = await this.executeMCPTools(request.mcpTools, request.ttid);
      enrichedPrompt = this.enrichPrompt(request.prompt, mcpData);
      
      // MCP 데이터를 먼저 스트리밍
      yield `data: ${JSON.stringify({ type: 'mcp_data', data: mcpData })}\n\n`;
    }

    // LLM 응답 스트리밍
    const llmProvider = 'openai'; // OpenAI only
    const llmModel = request.model || this.getDefaultModel();
    
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant with access to real-time data.'
      },
      {
        role: 'user',
        content: enrichedPrompt
      }
    ];

    for await (const chunk of llmService.streamChat(llmProvider, {
      model: llmModel,
      messages,
      temperature: request.temperature || 0.7,
      maxTokens: request.maxTokens || 1000,
      stream: true,
    })) {
      yield `data: ${JSON.stringify({ type: 'llm_chunk', content: chunk })}\n\n`;
    }
    
    yield 'data: [DONE]\n\n';
  }
}

export const orchestrator = new Orchestrator();