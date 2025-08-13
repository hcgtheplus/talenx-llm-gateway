import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { redisClient } from '../../utils/redis';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: any;
}

export interface MCPToolCall {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text?: string;
    data?: any;
  }>;
  error?: string;
}

export class MCPClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.mcp.serverUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('MCP API request:', {
          url: config.url,
          method: config.method,
          headers: config.headers,
          data: config.data,
          timestamp: new Date().toISOString(),
        });
        return config;
      },
      (error) => {
        logger.error('MCP API request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('MCP API response:', {
          url: response.config?.url,
          method: response.config?.method,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          dataSize: JSON.stringify(response.data).length,
          timestamp: new Date().toISOString(),
        });
        return response;
      },
      (error) => {
        const errorLog = {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          requestData: error.config?.data,
          requestHeaders: error.config?.headers,
          errorMessage: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString(),
        };

        if (error.response?.status === 400) {
          logger.error('MCP API 400 Bad Request:', errorLog);
        } else {
          logger.error('MCP API error:', errorLog);
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Helper to create authenticated request config with TTID
  private getAuthConfig(ttid?: string) {
    const headers: any = {};
    
    // Add TTID cookie if present
    if (ttid) {
      headers.Cookie = `TTID=${ttid}`;
    }
    
    return { headers };
  }

  async listTools(ttid?: string): Promise<MCPTool[]> {
    try {
      // Check cache first
      const cacheKey = 'mcp:tools';
      const cached = await redisClient.getCache(cacheKey);
      
      if (cached) {
        logger.info('MCP tools cache hit');
        return cached;
      }

      // Fetch from MCP server with TTID
      const response = await this.client.get('/tools', this.getAuthConfig(ttid));
      const tools = response.data.tools || [];

      // Cache for 1 hour
      await redisClient.setCache(cacheKey, tools, 3600);

      return tools;
    } catch (error: any) {
      throw new AppError(
        `Failed to list MCP tools: ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  async callTool(toolCall: MCPToolCall, ttid?: string): Promise<MCPToolResult> {
    const requestPayload = {
      toolName: toolCall.name,
      arguments: toolCall.arguments || {},
    };

    // Log detailed request information
    logger.info('MCP tool call request:', {
      tool: toolCall.name,
      arguments: toolCall.arguments,
      ttid: ttid ? 'present' : 'absent',
      url: `${config.mcp.serverUrl}/tools/call`,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await this.client.post(
        '/tools/call',
        requestPayload,
        this.getAuthConfig(ttid)
      );

      // Log successful response
      logger.info('MCP tool call success:', {
        tool: toolCall.name,
        status: response.status,
        contentLength: JSON.stringify(response.data).length,
        timestamp: new Date().toISOString(),
      });

      return response.data;
    } catch (error: any) {
      // Detailed error logging for debugging
      const errorDetails = {
        tool: toolCall.name,
        requestPayload,
        ttid: ttid ? 'present' : 'absent',
        errorMessage: error.message,
        errorCode: error.code,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
        requestHeaders: error.config?.headers,
        timestamp: new Date().toISOString(),
      };

      // Special handling for 400 errors
      if (error.response?.status === 400) {
        logger.error('MCP tool call failed with 400 Bad Request:', errorDetails);
        
        // Extract specific validation errors if available
        const responseData = error.response?.data;
        let detailedMessage = 'Bad Request';
        
        if (responseData) {
          if (typeof responseData === 'string') {
            detailedMessage = `Bad Request: ${responseData}`;
          } else if (responseData.errors) {
            detailedMessage = `Bad Request - Validation Errors: ${JSON.stringify(responseData.errors, null, 2)}`;
          } else if (responseData.message) {
            detailedMessage = `Bad Request: ${responseData.message}`;
          } else if (responseData.error) {
            detailedMessage = `Bad Request: ${responseData.error}`;
          } else {
            // Ensure we stringify the entire response data object
            detailedMessage = `Bad Request: ${JSON.stringify(responseData, null, 2)}`;
          }
        } else {
          detailedMessage = `Bad Request: ${error.message}`;
        }
        
        throw new AppError(
          `Failed to call MCP tool '${toolCall.name}': ${detailedMessage}`,
          400
        );
      }

      // Log other errors
      logger.error('MCP tool call failed:', errorDetails);

      throw new AppError(
        `Failed to call MCP tool '${toolCall.name}': ${error.message}`,
        error.response?.status || 500
      );
    }
  }


  // Method to check MCP server health
  async healthCheck(ttid?: string): Promise<boolean> {
    try {
      const response = await this.client.get('/health', this.getAuthConfig(ttid));
      return response.status === 200;
    } catch (error) {
      logger.error('MCP health check failed:', error);
      return false;
    }
  }
}

export const mcpClient = new MCPClient();