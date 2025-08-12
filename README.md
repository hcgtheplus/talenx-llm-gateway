# Talenx LLM 게이트웨이

OpenAI 모델과 MCP(Model Context Protocol) 서버를 매끄럽게 통합하는 경량 프로덕션 준비 API 게이트웨이입니다. 자동 API 키 등록과 지능형 캐싱으로 최적의 성능을 제공합니다.

## 🚀 주요 기능

- **유연한 인증** - API 키, TTID 쿠키, Bearer 토큰 지원
- **OpenAI 통합** - GPT-3.5, GPT-4 및 기타 OpenAI 모델 지원
- **MCP 통합** - TTID 쿠키를 통한 MCP 서버 연결
- **인증 패스스루** - 클라이언트 인증 정보를 MCP 서버에 직접 전달
- **스마트 캐싱** - 응답 시간 개선을 위한 Redis 기반 캐싱
- **요청 제한** - API 남용 방지를 위한 내장 보호 기능
- **사용량 추적** - 과금 및 분석을 위한 토큰 사용량 모니터링

## 📋 사전 요구사항

- Node.js 18+
- Redis 서버
- OpenAI API 키

## 🛠️ 빠른 시작

### 1. 설치

```bash
# 저장소 복제
git clone https://github.com/yourusername/talenx-llm-gateway.git
cd talenx-llm-gateway

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

### 2. 설정

`.env` 파일을 편집하여 설정을 구성합니다:

```env
# 서버
PORT=1111
NODE_ENV=development

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# MCP 서버 (선택사항)
MCP_SERVER_URL=http://localhost:9999
MCP_WORKSPACE_HASH=your_workspace_hash
```

### 3. 서버 시작

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm run build
npm start
```

## 🔑 인증

### 1. API 키 인증 (선택사항)
모든 API 요청에 `X-API-Key` 헤더를 사용할 수 있습니다:

```http
X-API-Key: tlx_0123456789abcdef0123456789abcdef
```

**형식:** `tlx_` + 32자리 16진수

### 2. TTID 쿠키 인증 (MCP 연동용)
MCP 서버와 연동할 때 TTID 쿠키를 사용합니다:

```http
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYiLCJhbGciOiJSUzI1NiJ9...
```

### 3. Bearer 토큰 인증 (대체 방법)
```http
Authorization: Bearer your_jwt_token_here
```

> **참고:** 
> - API 키는 형식만 검증되며 서버에 저장되지 않습니다
> - MCP 기능을 사용하려면 TTID 쿠키 또는 Bearer 토큰이 필요합니다
> - TTID는 원본 API 서버의 인증에 사용됩니다

### 예시 요청

```bash
curl -X GET http://localhost:1111/api/v1/llm/providers \
  -H "X-API-Key: tlx_0123456789abcdef0123456789abcdef"
```

## 📚 핵심 API 엔드포인트

### OpenAI 채팅 완성

```http
POST /api/v1/llm/chat
```

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "user", "content": "안녕하세요!"}
  ],
  "temperature": 0.7,
  "maxTokens": 500,
  "stream": false
}
```

### MCP 도구 실행

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

### 통합 처리 (OpenAI + MCP)

```http
POST /api/v1/process
```

```json
{
  "prompt": "현재 평가를 분석하고 인사이트를 제공해주세요",
  "model": "gpt-4",
  "mcpTools": ["get_appraisals"],
  "temperature": 0.5
}
```

## 📁 프로젝트 구조

```
src/
├── config/          # 설정 관리
├── middleware/      
│   ├── auth.ts      # API 키 인증 및 자동 등록
│   ├── rateLimiter.ts
│   └── validation.ts
├── routes/          
│   ├── auth.ts      # 인증 엔드포인트
│   ├── llm.ts       # OpenAI 엔드포인트
│   ├── mcp.ts       # MCP 엔드포인트
│   └── process.ts   # 통합 처리
├── services/        
│   ├── llm/         # OpenAI 서비스 계층
│   ├── mcp/         # MCP 클라이언트
│   └── orchestrator.ts
└── utils/           
    ├── logger.ts    # Winston 로거
    └── redis.ts     # Redis 클라이언트
```

## 🧪 테스트

```bash
# 테스트 실행
npm test

# 타입 체크
npm run typecheck

# 린트 검사
npm run lint
```

## 📊 모니터링

### 헬스 체크

```http
GET /health
```

서버 상태, Redis 연결 및 가동 시간을 반환합니다.

### 사용량 통계

```http
GET /api/v1/llm/usage?days=7
```

지정된 기간의 토큰 사용량 통계를 반환합니다.

## 🔧 고급 설정

### 요청 제한

`.env`에서 설정:

```env
RATE_LIMIT_WINDOW_MS=60000  # 1분
RATE_LIMIT_MAX_REQUESTS=100
```

### 캐싱

- MCP 도구: 1시간 캐시
- LLM 응답 (temperature=0): 5분 캐시
- 평가 데이터: 5분 캐시

### 지원되는 OpenAI 모델

- gpt-4-turbo-preview
- gpt-4
- gpt-3.5-turbo
- gpt-3.5-turbo-16k

## 🐛 문제 해결

### Redis 연결 오류

```bash
# Redis가 실행 중인지 확인
redis-cli ping

# .env의 포트가 Redis 설정과 일치하는지 확인
echo $REDIS_PORT
```

### 잘못된 API 키 형식

API 키가 다음 패턴을 따르는지 확인: `tlx_[32자리 16진수]`

```javascript
// 유효한 형식 예시
const validKey = 'tlx_0123456789abcdef0123456789abcdef';
```

### OpenAI API 오류

- OpenAI API 키가 유효한지 확인
- OpenAI 계정의 요청 제한 확인
- 선택한 모델이 계정에서 사용 가능한지 확인

## 📦 API 응답 형식

### 성공 응답

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

### 오류 응답

```json
{
  "error": {
    "message": "오류 설명",
    "statusCode": 400
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

## 🤝 기여

기여를 환영합니다! Pull Request를 제출해주세요.

## 📄 라이선스

MIT 라이선스 - 자세한 내용은 LICENSE 파일을 참조하세요

## 🔗 링크

- [API 문서](./docs/API_DOCUMENTATION.md)
- [Postman 컬렉션](./postman/)
- [OpenAI API 참조](https://platform.openai.com/docs)

---

Node.js, TypeScript, Redis로 ❤️를 담아 제작