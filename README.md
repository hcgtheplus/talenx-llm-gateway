# Talenx LLM Gateway

A lightweight, production-ready API gateway that seamlessly integrates OpenAI models with MCP (Model Context Protocol) servers. Features automatic API key registration and intelligent caching for optimal performance.

## 🚀 Key Features

- **Auto API Key Registration** - API keys are automatically registered in Redis on first use
- **OpenAI Integration** - Support for GPT-3.5, GPT-4 and other OpenAI models
- **MCP Integration** - Connect to MCP servers for extended tool capabilities
- **Smart Caching** - Redis-based caching for improved response times
- **Rate Limiting** - Built-in protection against API abuse
- **Usage Tracking** - Monitor token usage for billing and analytics

## 📋 Prerequisites

- Node.js 18+
- Redis Server
- OpenAI API Key

## 🛠️ Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/talenx-llm-gateway.git
cd talenx-llm-gateway

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### 2. Configuration

Edit `.env` file with your settings:

```env
# Server
PORT=1111
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# MCP Server (optional)
MCP_SERVER_URL=http://localhost:9999
MCP_WORKSPACE_HASH=your_workspace_hash
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 🔑 Authentication

All API requests require an `X-API-Key` header. The API key format is:

```
tlx_[32 hexadecimal characters]
```

Example: `tlx_0123456789abcdef0123456789abcdef`

> **Note:** API keys are automatically registered in Redis on first use - no manual registration needed!

### Example Request

```bash
curl -X GET http://localhost:1111/api/v1/llm/providers \
  -H "X-API-Key: tlx_0123456789abcdef0123456789abcdef"
```

## 📚 Core API Endpoints

### OpenAI Chat Completion

```http
POST /api/v1/llm/chat
```

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "maxTokens": 500,
  "stream": false
}
```

### MCP Tool Execution

```http
POST /api/v1/mcp/tools/call
```

```json
{
  "name": "get_appraisals",
  "arguments": {
    "page": 1,
    "size": 10
  }
}
```

### Integrated Processing (OpenAI + MCP)

```http
POST /api/v1/process
```

```json
{
  "prompt": "Analyze the current appraisals and provide insights",
  "model": "gpt-4",
  "mcpTools": ["get_appraisals"],
  "temperature": 0.5
}
```

## 📁 Project Structure

```
src/
├── config/          # Configuration management
├── middleware/      
│   ├── auth.ts      # API key authentication & auto-registration
│   ├── rateLimiter.ts
│   └── validation.ts
├── routes/          
│   ├── auth.ts      # Authentication endpoints
│   ├── llm.ts       # OpenAI endpoints
│   ├── mcp.ts       # MCP endpoints
│   └── process.ts   # Integrated processing
├── services/        
│   ├── llm/         # OpenAI service layer
│   ├── mcp/         # MCP client
│   └── orchestrator.ts
└── utils/           
    ├── logger.ts    # Winston logger
    └── redis.ts     # Redis client
```

## 🧪 Testing

```bash
# Run tests
npm test

# Check types
npm run typecheck

# Lint code
npm run lint
```

## 📊 Monitoring

### Health Check

```http
GET /health
```

Returns server status, Redis connection, and uptime.

### Usage Statistics

```http
GET /api/v1/llm/usage?days=7
```

Returns token usage statistics for the specified period.

## 🔧 Advanced Configuration

### Rate Limiting

Configure in `.env`:

```env
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100
```

### Caching

- MCP tools: 1 hour cache
- LLM responses (temperature=0): 5 minutes cache
- Appraisal data: 5 minutes cache

### Supported OpenAI Models

- gpt-4-turbo-preview
- gpt-4
- gpt-3.5-turbo
- gpt-3.5-turbo-16k

## 🐛 Troubleshooting

### Redis Connection Error

```bash
# Check Redis is running
redis-cli ping

# Verify port in .env matches Redis config
echo $REDIS_PORT
```

### Invalid API Key Format

Ensure your API key follows the pattern: `tlx_[32 hex chars]`

```javascript
// Valid format example
const validKey = 'tlx_0123456789abcdef0123456789abcdef';
```

### OpenAI API Errors

- Verify your OpenAI API key is valid
- Check rate limits on your OpenAI account
- Ensure selected model is available for your account

## 📦 API Response Format

### Success Response

```json
{
  "data": "...",
  "usage": {
    "promptTokens": 100,
    "completionTokens": 150,
    "totalTokens": 250
  }
}
```

### Error Response

```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Postman Collection](./postman/)
- [OpenAI API Reference](https://platform.openai.com/docs)

---

Built with ❤️ using Node.js, TypeScript, and Redis