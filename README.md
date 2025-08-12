# TalenX LLM Gateway

Enterprise-grade LLM Gateway server with MCP integration, built with TypeScript, Express, and Redis.

## Features

- **Multi-LLM Support**: OpenAI and Anthropic providers
- **MCP Integration**: Seamless integration with Model Context Protocol servers
- **Authentication**: API key and Bearer token authentication
- **Rate Limiting**: Configurable per-user and per-endpoint rate limiting
- **Caching**: Redis-based response caching for improved performance
- **Session Management**: Secure session handling with Redis
- **Usage Tracking**: Token usage monitoring and reporting
- **Security**: Helmet, CORS, input validation, and sanitization
- **Logging**: Comprehensive logging with Winston
- **Docker Support**: Production-ready containerization

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Clients    │─────▶│  LLM Gateway │─────▶│  LLM APIs    │
└──────────────┘      │              │      │  (OpenAI,    │
                      │   - Auth     │      │   Anthropic) │
                      │   - Rate Limit│      └──────────────┘
                      │   - Caching  │
                      │   - Routing  │      ┌──────────────┐
                      │              │─────▶│  MCP Server  │
                      └──────────────┘      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │    Redis     │
                      └──────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Redis 7+
- Docker (optional)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Development

```bash
# Start Redis (포트 3333)
redis-server redis.conf
# 또는
redis-server --port 3333

# Run in development mode (포트 1111)
npm run dev
```

서버는 http://localhost:1111 에서 실행됩니다.

### Production

```bash
# Build TypeScript
npm run build

# Start server
npm start
```

### Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Documentation

### Authentication

#### Generate API Key
```bash
POST /api/v1/auth/api-key/generate

Response:
{
  "apiKey": "tlx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "keyId": "uuid",
  "expiresIn": 31536000,
  "message": "API key created successfully. Keep it secure!"
}
```

#### Validate API Key
```bash
POST /api/v1/auth/api-key/validate
Content-Type: application/json

{
  "apiKey": "tlx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}

Response:
{
  "valid": true,
  "keyId": "uuid"
}
```

### LLM Operations

#### Chat Completion
```bash
POST /api/v1/llm/chat
X-API-Key: tlx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "maxTokens": 1000
}
```

#### Stream Chat
```bash
POST /api/v1/llm/chat
X-API-Key: tlx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "provider": "anthropic",
  "model": "claude-3-sonnet-20240229",
  "messages": [...],
  "stream": true
}
```

### MCP Integration

#### List Tools
```bash
GET /api/v1/mcp/tools
X-API-Key: tlx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Call Tool
```bash
POST /api/v1/mcp/tools/call
X-API-Key: tlx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "name": "get_appraisals",
  "arguments": {
    "page": 1,
    "size": 10,
    "status": "pending"
  }
}
```

#### Get Appraisals
```bash
GET /api/v1/mcp/appraisals?page=1&size=10&status=pending
X-API-Key: tlx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | 60000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `MCP_SERVER_URL` | MCP server URL | http://localhost:4000 |
| `JWT_SECRET` | JWT secret key | - |

## Security Features

- **Authentication**: API key and Bearer token support
- **Rate Limiting**: Per-user and per-endpoint limits
- **Input Validation**: Request validation and sanitization
- **CORS**: Configurable CORS policies
- **Helmet**: Security headers
- **HTTPS**: SSL/TLS support in production

## Monitoring

### Health Check
```bash
GET http://localhost:1111/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-12T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Usage Statistics
```bash
GET /api/v1/llm/usage?days=30
X-API-Key: tlx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Response:
{
  "usage": {
    "openai": {
      "promptTokens": 10000,
      "completionTokens": 5000,
      "totalTokens": 15000
    }
  }
}
```

## Project Structure

```
talenx-llm-gateway/
├── src/
│   ├── config/         # Configuration
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   │   ├── llm/       # LLM providers
│   │   └── mcp/       # MCP client
│   ├── utils/         # Utilities
│   ├── app.ts         # Express app setup
│   └── index.ts       # Entry point
├── logs/              # Application logs
├── docker-compose.yml # Docker configuration
├── Dockerfile         # Container definition
├── tsconfig.json      # TypeScript config
└── package.json       # Dependencies
```

## Development

### Build
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Production Deployment

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llm-gateway
  template:
    metadata:
      labels:
        app: llm-gateway
    spec:
      containers:
      - name: llm-gateway
        image: talenx/llm-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          value: "redis-service"
```

### AWS ECS
Use the provided Dockerfile with ECS task definitions and ALB for load balancing.

### Scaling
- Horizontal scaling with multiple instances
- Redis cluster for high availability
- Load balancer for request distribution

## License

MIT