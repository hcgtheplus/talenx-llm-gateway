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

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('MCP API error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
        });
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
    try {
      const response = await this.client.post(
        '/tools/call',
        {
          name: toolCall.name,
          arguments: toolCall.arguments || {},
        },
        this.getAuthConfig(ttid)
      );

      return response.data;
    } catch (error: any) {
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