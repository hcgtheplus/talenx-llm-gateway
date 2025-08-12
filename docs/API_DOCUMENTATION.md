# API Documentation

## Overview

The Talenx LLM Gateway provides a unified API for accessing OpenAI models and MCP (Model Context Protocol) tools. All endpoints require authentication via API key.

## Base URL

```
http://localhost:1111
```

## Authentication

All API endpoints (except health checks) require an `X-API-Key` header:

```http
X-API-Key: tlx_0123456789abcdef0123456789abcdef
```

### API Key Format

- **Prefix:** `tlx_`
- **Body:** 32 hexadecimal characters (0-9, a-f)
- **Total Length:** 36 characters
- **Auto-Registration:** Keys are automatically registered in Redis on first use

## Endpoints

### Health & Status

#### Health Check

```http
GET /health
```

No authentication required.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

---

### Authentication

#### Validate API Key

```http
POST /api/v1/auth/api-key/validate
```

**Request Body:**
```json
{
  "apiKey": "tlx_0123456789abcdef0123456789abcdef"
}
```

**Response:**
```json
{
  "valid": true,
  "keyId": "user_615c3457e46ca4a4"
}
```

#### Get API Key Info

```http
GET /api/v1/auth/api-key/info
```

**Response:**
```json
{
  "keyId": "user_615c3457e46ca4a4",
  "apiKey": "tlx_012345..."
}
```

#### Revoke API Key

```http
DELETE /api/v1/auth/api-key/revoke
```

**Response:**
```json
{
  "message": "API key revoked successfully"
}
```

---

### OpenAI Integration

#### Chat Completion

```http
POST /api/v1/llm/chat
```

**Request Body:**
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "temperature": 0.7,
  "maxTokens": 500,
  "topP": 1,
  "stream": false
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| model | string | Yes | OpenAI model ID (e.g., "gpt-3.5-turbo", "gpt-4") |
| messages | array | Yes | Array of message objects with role and content |
| temperature | number | No | Creativity control (0-2, default: 0.7) |
| maxTokens | number | No | Maximum tokens in response (default: model-specific) |
| topP | number | No | Nucleus sampling (0-1, default: 1) |
| stream | boolean | No | Enable streaming response (default: false) |

**Response (Non-streaming):**
```json
{
  "content": "Hello! How can I help you today?",
  "model": "gpt-3.5-turbo",
  "usage": {
    "promptTokens": 20,
    "completionTokens": 10,
    "totalTokens": 30
  }
}
```

**Response (Streaming):**
```
data: {"content": "Hello"}
data: {"content": "!"}
data: {"content": " How"}
data: {"content": " can"}
data: [DONE]
```

#### List Available Models

```http
GET /api/v1/llm/providers
```

**Response:**
```json
{
  "providers": [
    {
      "name": "openai",
      "available": true,
      "models": [
        "gpt-4-turbo-preview",
        "gpt-4",
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-16k"
      ]
    }
  ]
}
```

#### Get Usage Statistics

```http
GET /api/v1/llm/usage?days=7
```

**Query Parameters:**
- `days` (optional): Number of days to include (default: 30)

**Response:**
```json
{
  "usage": {
    "openai": {
      "promptTokens": 50000,
      "completionTokens": 30000,
      "totalTokens": 80000
    }
  }
}
```

---

### MCP Integration

#### List Available Tools

```http
GET /api/v1/mcp/tools
```

**Response:**
```json
{
  "tools": [
    {
      "name": "get_appraisals",
      "description": "Retrieve appraisal list",
      "inputSchema": {
        "type": "object",
        "properties": {
          "page": {"type": "number"},
          "size": {"type": "number"},
          "status": {"type": "string"}
        }
      }
    }
  ]
}
```

#### Execute Tool

```http
POST /api/v1/mcp/tools/call
```

**Request Body:**
```json
{
  "name": "get_appraisals",
  "arguments": {
    "page": 1,
    "size": 10,
    "status": "active"
  }
}
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"appraisals\": [...]}"
    }
  ]
}
```

#### Get Appraisals

```http
GET /api/v1/mcp/appraisals
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `size` (optional): Page size (default: 20)
- `status` (optional): Filter by status
- `name` (optional): Filter by name

**Response:**
```json
{
  "appraisals": [...],
  "total": 100,
  "page": 1,
  "size": 20
}
```

#### Get Response Results

```http
GET /api/v1/mcp/appraisals/:appraisalId/groups/:groupId/responses
```

**Path Parameters:**
- `appraisalId`: Appraisal ID
- `groupId`: Group ID

**Query Parameters:**
- `page` (optional): Page number
- `size` (optional): Page size

#### Validate Workspace

```http
POST /api/v1/mcp/workspace/validate
```

**Request Body:**
```json
{
  "workspaceHash": "04dfe596cb2bc3f10b70606fd80b8068"
}
```

**Response:**
```json
{
  "valid": true,
  "workspaceHash": "04dfe596cb2bc3f10b70606fd80b8068"
}
```

#### MCP Health Check

```http
GET /api/v1/mcp/health
```

No authentication required.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Integrated Processing

#### Process with OpenAI + MCP

```http
POST /api/v1/process
```

Combines OpenAI processing with MCP tool execution for advanced workflows.

**Request Body:**
```json
{
  "prompt": "Analyze current appraisals and provide insights",
  "model": "gpt-4",
  "mcpTools": ["get_appraisals"],
  "temperature": 0.5,
  "maxTokens": 1000,
  "stream": false
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | string | Yes | The prompt to process |
| model | string | No | OpenAI model (default: "gpt-3.5-turbo") |
| mcpTools | array | No | List of MCP tools to use |
| temperature | number | No | Creativity control (0-2) |
| maxTokens | number | No | Maximum response tokens |
| stream | boolean | No | Enable streaming |

**Response:**
```json
{
  "llmResponse": {
    "content": "Based on the analysis...",
    "model": "gpt-4",
    "usage": {...}
  },
  "mcpData": {...},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid API key |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Rate Limiting

Rate limits are applied per API key:

| Endpoint Type | Limit | Window |
|--------------|-------|---------|
| Standard | 100 requests | 1 minute |
| Strict (auth) | 10 requests | 1 minute |
| Lenient (health) | 1000 requests | 1 minute |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Caching

The following data is cached for performance:

| Data Type | Cache Duration |
|-----------|----------------|
| MCP tool list | 1 hour |
| MCP appraisals | 5 minutes |
| LLM responses (temperature=0) | 5 minutes |

Cache can be bypassed by including `Cache-Control: no-cache` header.

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:1111',
  headers: {
    'X-API-Key': 'tlx_0123456789abcdef0123456789abcdef',
    'Content-Type': 'application/json'
  }
});

// Chat with OpenAI
async function chat(message) {
  const response = await client.post('/api/v1/llm/chat', {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }]
  });
  return response.data;
}

// Execute MCP tool
async function executeTool(toolName, args) {
  const response = await client.post('/api/v1/mcp/tools/call', {
    name: toolName,
    arguments: args
  });
  return response.data;
}

// Integrated processing
async function process(prompt) {
  const response = await client.post('/api/v1/process', {
    prompt: prompt,
    model: 'gpt-4',
    mcpTools: ['get_appraisals']
  });
  return response.data;
}
```

### Python

```python
import requests

class TalenxClient:
    def __init__(self, api_key, base_url='http://localhost:1111'):
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def chat(self, message, model='gpt-3.5-turbo'):
        response = requests.post(
            f'{self.base_url}/api/v1/llm/chat',
            headers=self.headers,
            json={
                'model': model,
                'messages': [{'role': 'user', 'content': message}]
            }
        )
        return response.json()
    
    def execute_tool(self, tool_name, **kwargs):
        response = requests.post(
            f'{self.base_url}/api/v1/mcp/tools/call',
            headers=self.headers,
            json={'name': tool_name, 'arguments': kwargs}
        )
        return response.json()
    
    def process(self, prompt, model='gpt-4', mcp_tools=None):
        response = requests.post(
            f'{self.base_url}/api/v1/process',
            headers=self.headers,
            json={
                'prompt': prompt,
                'model': model,
                'mcpTools': mcp_tools or []
            }
        )
        return response.json()

# Usage
client = TalenxClient('tlx_0123456789abcdef0123456789abcdef')
result = client.chat('Hello!')
print(result)
```

### cURL

```bash
# Chat completion
curl -X POST http://localhost:1111/api/v1/llm/chat \
  -H "X-API-Key: tlx_0123456789abcdef0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Execute MCP tool
curl -X POST http://localhost:1111/api/v1/mcp/tools/call \
  -H "X-API-Key: tlx_0123456789abcdef0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_appraisals",
    "arguments": {"page": 1, "size": 10}
  }'

# Integrated processing
curl -X POST http://localhost:1111/api/v1/process \
  -H "X-API-Key: tlx_0123456789abcdef0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze appraisals",
    "model": "gpt-4",
    "mcpTools": ["get_appraisals"]
  }'
```

---

## Webhooks (Coming Soon)

Future support for webhook notifications on:
- Long-running task completion
- Error events
- Usage threshold alerts

---

## Best Practices

1. **API Key Security**
   - Store API keys in environment variables
   - Never commit keys to version control
   - Rotate keys regularly

2. **Error Handling**
   - Implement exponential backoff for retries
   - Log errors for debugging
   - Handle rate limit responses gracefully

3. **Performance**
   - Use streaming for long responses
   - Leverage caching when possible
   - Batch requests where appropriate

4. **Token Usage**
   - Monitor usage via `/api/v1/llm/usage`
   - Set appropriate `maxTokens` limits
   - Use lower temperature for consistent responses

---

## Support

For issues or questions:
- GitHub Issues: [github.com/yourusername/talenx-llm-gateway](https://github.com/yourusername/talenx-llm-gateway)
- API Status: Check `/health` endpoint