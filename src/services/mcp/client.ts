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

export interface MCPAuthConfig {
  authToken?: string;  // Bearer token
  ttid?: string;       // TTID cookie value
  cookies?: string;    // Full cookie string
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

  // Helper to create authenticated request config
  private getAuthConfig(auth?: MCPAuthConfig | string) {
    const headers: any = {};
    
    // Handle backward compatibility - if string, treat as authToken
    if (typeof auth === 'string') {
      headers.Authorization = `Bearer ${auth}`;
      return { headers };
    }
    
    // Handle MCPAuthConfig object
    if (auth) {
      // Add Bearer token if present
      if (auth.authToken) {
        headers.Authorization = `Bearer ${auth.authToken}`;
      }
      
      // Add cookies if present (prioritize full cookie string, then TTID)
      if (auth.cookies) {
        headers.Cookie = auth.cookies;
      } else if (auth.ttid) {
        headers.Cookie = `TTID=${auth.ttid}`;
      }
    }
    
    return { headers };
  }

  async listTools(auth?: MCPAuthConfig | string): Promise<MCPTool[]> {
    try {
      // Check cache first
      const cacheKey = 'mcp:tools';
      const cached = await redisClient.getCache(cacheKey);
      
      if (cached) {
        logger.info('MCP tools cache hit');
        return cached;
      }

      // Fetch from MCP server with auth
      const response = await this.client.get('/tools', this.getAuthConfig(auth));
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

  async callTool(toolCall: MCPToolCall, auth?: MCPAuthConfig | string): Promise<MCPToolResult> {
    try {
      const response = await this.client.post(
        '/tools/call',
        {
          name: toolCall.name,
          arguments: toolCall.arguments || {},
        },
        this.getAuthConfig(auth)
      );

      return response.data;
    } catch (error: any) {
      throw new AppError(
        `Failed to call MCP tool '${toolCall.name}': ${error.message}`,
        error.response?.status || 500
      );
    }
  }

  async getAppraisals(
    params?: {
      page?: number;
      size?: number;
      status?: string;
      name?: string;
    },
    auth?: MCPAuthConfig | string
  ): Promise<any> {
    try {
      const cacheKey = `mcp:appraisals:${JSON.stringify(params || {})}`;
      const cached = await redisClient.getCache(cacheKey);
      
      if (cached) {
        logger.info('MCP appraisals cache hit');
        return cached;
      }

      const result = await this.callTool(
        {
          name: 'get_appraisals',
          arguments: params,
        },
        auth
      );

      if (result.error) {
        throw new Error(result.error);
      }

      const data = JSON.parse(result.content[0]?.text || '{}');
      
      // Cache for 5 minutes
      await redisClient.setCache(cacheKey, data, 300);

      return data;
    } catch (error: any) {
      throw new AppError(
        `Failed to get appraisals: ${error.message}`,
        500
      );
    }
  }

  async getResponseResults(
    appraisalId: number,
    groupId: number,
    params?: {
      page?: number;
      size?: number;
    },
    auth?: MCPAuthConfig | string
  ): Promise<any> {
    try {
      const cacheKey = `mcp:responses:${appraisalId}:${groupId}:${JSON.stringify(params || {})}`;
      const cached = await redisClient.getCache(cacheKey);
      
      if (cached) {
        logger.info('MCP response results cache hit');
        return cached;
      }

      const result = await this.callTool(
        {
          name: 'get_response_results',
          arguments: {
            appraisal_id: appraisalId,
            group_id: groupId,
            ...params,
          },
        },
        auth
      );

      if (result.error) {
        throw new Error(result.error);
      }

      const data = JSON.parse(result.content[0]?.text || '{}');
      
      // Cache for 5 minutes
      await redisClient.setCache(cacheKey, data, 300);

      return data;
    } catch (error: any) {
      throw new AppError(
        `Failed to get response results: ${error.message}`,
        500
      );
    }
  }

  // Helper method to validate workspace access
  async validateWorkspace(workspaceHash: string): Promise<boolean> {
    return workspaceHash === config.mcp.workspaceHash;
  }

  // Method to check MCP server health
  async healthCheck(auth?: MCPAuthConfig | string): Promise<boolean> {
    try {
      const response = await this.client.get('/health', this.getAuthConfig(auth));
      return response.status === 200;
    } catch (error) {
      logger.error('MCP health check failed:', error);
      return false;
    }
  }
}

export const mcpClient = new MCPClient();