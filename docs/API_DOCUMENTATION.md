# API 문서

## 개요

Talenx LLM 게이트웨이는 OpenAI 모델과 MCP(Model Context Protocol) 도구에 접근하기 위한 통합 API를 제공합니다. 모든 엔드포인트는 API 키를 통한 인증이 필요합니다.

## 기본 URL

```
http://localhost:1111
```

## 인증

모든 API 엔드포인트(헬스 체크 제외)는 다음 중 하나 이상의 인증 방식이 필요합니다:

### 1. API 키 인증
```http
X-API-Key: tlx_0123456789abcdef0123456789abcdef
```

**형식:**
- 접두사: `tlx_`
- 본문: 32자리 16진수 (0-9, a-f)
- 전체 길이: 36자

### 2. TTID 쿠키 인증 (MCP 연동 기본)
```http
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYiLCJhbGciOiJSUzI1NiJ9...; 
Cookie: refreshToken=...; signedIn=true
```

**TTID 쿠키:**
- JWT 형식의 인증 토큰
- 원본 API 서버 인증에 사용
- MCP 서버로 자동 전달

### 3. Bearer 토큰 인증 (대체 방법)
```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **참고:** 
> - API 키는 형식만 검증되며 서버에 저장되지 않습니다
> - MCP 기능 사용 시 TTID 쿠키 또는 Bearer 토큰이 필수입니다
> - 쿠키는 MCP 서버로 자동 패스스루됩니다

## 엔드포인트

### 헬스 & 상태

#### 헬스 체크

```http
GET /health
```

인증이 필요하지 않습니다.

**응답:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

---

### 인증

#### API 키 형식 검증

```http
POST /api/v1/auth/api-key/validate
```

**요청 본문:**
```json
{
  "apiKey": "tlx_0123456789abcdef0123456789abcdef"
}
```

**응답:**
```json
{
  "valid": true,
  "message": "Valid API key format"
}
```

#### API 키 정보 조회

```http
GET /api/v1/auth/api-key/info
```

**응답:**
```json
{
  "keyId": "user_615c3457e46ca4a4",
  "apiKey": "tlx_012345..."
}
```

#### API 키 폐기 (정보용)

```http
DELETE /api/v1/auth/api-key/revoke
```

**응답:**
```json
{
  "message": "API key marked as revoked. Note: Keys are not stored server-side, so this action is informational only."
}
```

---

### OpenAI 통합

#### 채팅 완성

```http
POST /api/v1/llm/chat
```

**요청 본문:**
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "당신은 도움이 되는 어시스턴트입니다."
    },
    {
      "role": "user",
      "content": "안녕하세요!"
    }
  ],
  "temperature": 0.7,
  "maxTokens": 500,
  "topP": 1,
  "stream": false
}
```

**파라미터:**

| 필드 | 타입 | 필수 | 설명 |
|-------|------|----------|-------------|
| model | string | 예 | OpenAI 모델 ID (예: "gpt-3.5-turbo", "gpt-4") |
| messages | array | 예 | role과 content를 가진 메시지 객체 배열 |
| temperature | number | 아니오 | 창의성 제어 (0-2, 기본값: 0.7) |
| maxTokens | number | 아니오 | 응답의 최대 토큰 수 (기본값: 모델별 상이) |
| topP | number | 아니오 | 핵 샘플링 (0-1, 기본값: 1) |
| stream | boolean | 아니오 | 스트리밍 응답 활성화 (기본값: false) |

**응답 (비스트리밍):**
```json
{
  "content": "안녕하세요! 오늘 어떻게 도와드릴까요?",
  "model": "gpt-3.5-turbo",
  "usage": {
    "promptTokens": 20,
    "completionTokens": 10,
    "totalTokens": 30
  }
}
```

**응답 (스트리밍):**
```
data: {"content": "안녕"}
data: {"content": "하세요"}
data: {"content": "!"}
data: [DONE]
```

#### 사용 가능한 모델 목록

```http
GET /api/v1/llm/providers
```

**응답:**
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

#### 사용량 통계 조회

```http
GET /api/v1/llm/usage?days=7
```

**쿼리 파라미터:**
- `days` (선택): 포함할 일 수 (기본값: 30)

**응답:**
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

### MCP 통합

#### 사용 가능한 도구 목록

```http
GET /api/v1/mcp/tools
```

**응답:**
```json
{
  "tools": [
    {
      "name": "get_appraisals",
      "description": "평가 목록 가져오기",
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

#### 도구 실행

```http
POST /api/v1/mcp/tools/call
```

**요청 본문:**
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

**응답:**
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

#### 평가 목록 조회

```http
GET /api/v1/mcp/appraisals
```

**쿼리 파라미터:**
- `page` (선택): 페이지 번호 (기본값: 1)
- `size` (선택): 페이지 크기 (기본값: 20)
- `status` (선택): 상태별 필터
- `name` (선택): 이름별 필터

**응답:**
```json
{
  "appraisals": [...],
  "total": 100,
  "page": 1,
  "size": 20
}
```

#### 응답 결과 조회

```http
GET /api/v1/mcp/appraisals/:appraisalId/groups/:groupId/responses
```

**경로 파라미터:**
- `appraisalId`: 평가 ID
- `groupId`: 그룹 ID

**쿼리 파라미터:**
- `page` (선택): 페이지 번호
- `size` (선택): 페이지 크기

#### 워크스페이스 검증

```http
POST /api/v1/mcp/workspace/validate
```

**요청 본문:**
```json
{
  "workspaceHash": "04dfe596cb2bc3f10b70606fd80b8068"
}
```

**응답:**
```json
{
  "valid": true,
  "workspaceHash": "04dfe596cb2bc3f10b70606fd80b8068"
}
```

#### MCP 헬스 체크

```http
GET /api/v1/mcp/health
```

인증이 필요하지 않습니다.

**응답:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 통합 처리

#### OpenAI + MCP로 처리

```http
POST /api/v1/process
```

고급 워크플로우를 위해 OpenAI 처리와 MCP 도구 실행을 결합합니다.

**요청 본문:**
```json
{
  "prompt": "현재 평가를 분석하고 인사이트를 제공하세요",
  "model": "gpt-4",
  "mcpTools": ["get_appraisals"],
  "temperature": 0.5,
  "maxTokens": 1000,
  "stream": false
}
```

**파라미터:**

| 필드 | 타입 | 필수 | 설명 |
|-------|------|----------|-------------|
| prompt | string | 예 | 처리할 프롬프트 |
| model | string | 아니오 | OpenAI 모델 (기본값: "gpt-3.5-turbo") |
| mcpTools | array | 아니오 | 사용할 MCP 도구 목록 |
| temperature | number | 아니오 | 창의성 제어 (0-2) |
| maxTokens | number | 아니오 | 최대 응답 토큰 |
| stream | boolean | 아니오 | 스트리밍 활성화 |

**응답:**
```json
{
  "llmResponse": {
    "content": "분석 결과에 따르면...",
    "model": "gpt-4",
    "usage": {...}
  },
  "mcpData": {...},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 오류 처리

### 오류 응답 형식

```json
{
  "error": {
    "message": "오류 설명",
    "statusCode": 400,
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

### 일반적인 오류 코드

| 코드 | 설명 |
|------|-------------|
| 400 | 잘못된 요청 - 유효하지 않은 파라미터 |
| 401 | 인증되지 않음 - API 키 누락 또는 유효하지 않음 |
| 403 | 금지됨 - 접근 거부 |
| 404 | 찾을 수 없음 - 리소스가 존재하지 않음 |
| 429 | 너무 많은 요청 - 요청 제한 초과 |
| 500 | 내부 서버 오류 |
| 503 | 서비스 이용 불가 |

---

## 요청 제한

API 키별로 요청 제한이 적용됩니다:

| 엔드포인트 유형 | 제한 | 시간 창 |
|--------------|-------|---------|
| 표준 | 100 요청 | 1분 |
| 엄격 (인증) | 10 요청 | 1분 |
| 느슨 (헬스) | 1000 요청 | 1분 |

응답에 포함되는 요청 제한 헤더:
- `X-RateLimit-Limit`: 허용된 최대 요청 수
- `X-RateLimit-Remaining`: 남은 요청 수
- `X-RateLimit-Reset`: 제한이 재설정되는 시간 (Unix 타임스탬프)

---

## 캐싱

성능을 위해 다음 데이터가 캐시됩니다:

| 데이터 유형 | 캐시 기간 |
|-----------|----------------|
| MCP 도구 목록 | 1시간 |
| MCP 평가 | 5분 |
| LLM 응답 (temperature=0) | 5분 |

`Cache-Control: no-cache` 헤더를 포함하여 캐시를 우회할 수 있습니다.

---

## 코드 예제

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

// OpenAI와 채팅
async function chat(message) {
  const response = await client.post('/api/v1/llm/chat', {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: message }]
  });
  return response.data;
}

// MCP 도구 실행
async function executeTool(toolName, args) {
  const response = await client.post('/api/v1/mcp/tools/call', {
    name: toolName,
    arguments: args
  });
  return response.data;
}

// 통합 처리
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

# 사용 예시
client = TalenxClient('tlx_0123456789abcdef0123456789abcdef')
result = client.chat('안녕하세요!')
print(result)
```

### cURL

```bash
# 채팅 완성
curl -X POST http://localhost:1111/api/v1/llm/chat \
  -H "X-API-Key: tlx_0123456789abcdef0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "안녕하세요!"}]
  }'

# MCP 도구 실행
curl -X POST http://localhost:1111/api/v1/mcp/tools/call \
  -H "X-API-Key: tlx_0123456789abcdef0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_appraisals",
    "arguments": {"page": 1, "size": 10}
  }'

# 통합 처리
curl -X POST http://localhost:1111/api/v1/process \
  -H "X-API-Key: tlx_0123456789abcdef0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "평가 분석",
    "model": "gpt-4",
    "mcpTools": ["get_appraisals"]
  }'
```

---

## 웹훅 (곧 출시)

다음에 대한 웹훅 알림 지원 예정:
- 장시간 실행 작업 완료
- 오류 이벤트
- 사용량 임계값 경고

---

## 모범 사례

1. **API 키 보안**
   - 환경 변수에 API 키 저장
   - 버전 관리에 키를 커밋하지 않기
   - 정기적으로 키 교체

2. **오류 처리**
   - 재시도를 위한 지수 백오프 구현
   - 디버깅을 위한 오류 로깅
   - 요청 제한 응답을 우아하게 처리

3. **성능**
   - 긴 응답에는 스트리밍 사용
   - 가능한 경우 캐싱 활용
   - 적절한 경우 요청 배치 처리

4. **토큰 사용량**
   - `/api/v1/llm/usage`를 통해 사용량 모니터링
   - 적절한 `maxTokens` 제한 설정
   - 일관된 응답을 위해 낮은 temperature 사용

---

## 지원

문제나 질문이 있는 경우:
- GitHub 이슈: [github.com/yourusername/talenx-llm-gateway](https://github.com/yourusername/talenx-llm-gateway)
- API 상태: `/health` 엔드포인트 확인