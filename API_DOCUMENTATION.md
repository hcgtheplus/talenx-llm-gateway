# API 문서

Talenx LLM Gateway API 상세 문서

## 기본 정보

**Base URL**: `http://localhost:1111/api/v1`

**인증**: 모든 API 요청에는 TTID 쿠키 인증이 필요합니다:
- Cookie 헤더: `TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...`

TTID는 JWT 형식의 토큰으로, 원본 서비스에서 발급된 인증 정보를 포함합니다.

## 엔드포인트

### 1. 통합 처리 API

프롬프트를 분석하여 자동으로 MCP 도구를 선택하고 실행합니다.

#### `POST /process`

**설명**: LLM이 프롬프트를 분석하여 필요한 MCP 도구를 자동으로 선택하고 실행한 후 최종 응답을 생성합니다.

**요청 헤더**:
```
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...
Content-Type: application/json
```

**요청 본문**:
```json
{
  "prompt": "string",           // 필수: 사용자 프롬프트
  "model": "string",             // 선택: OpenAI 모델 (기본: gpt-3.5-turbo)
  "temperature": 0.7,            // 선택: 0-2 사이 (기본: 0.7)
  "maxTokens": 1000,            // 선택: 최대 토큰 수 (기본: 1000)
  "stream": false                // 선택: 스트리밍 여부 (기본: false)
}
```

**응답 (일반)**:
```json
{
  "llmResponse": {
    "id": "chatcmpl-xxx",
    "object": "chat.completion",
    "created": 1234567890,
    "model": "gpt-3.5-turbo",
    "choices": [{
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "응답 내용"
      },
      "finish_reason": "stop"
    }],
    "usage": {
      "prompt_tokens": 100,
      "completion_tokens": 200,
      "total_tokens": 300
    }
  },
  "mcpData": {
    "get_appraisals": {
      "content": [{
        "type": "text",
        "text": "도구 실행 결과"
      }]
    }
  },
  "toolsUsed": ["get_appraisals"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**응답 (스트리밍)**:
```
data: {"type": "tools_used", "tools": ["get_appraisals"]}

data: {"type": "mcp_data", "data": {...}}

data: {"type": "llm_chunk", "content": "응답 "}

data: {"type": "llm_chunk", "content": "내용"}

data: [DONE]
```

---

### 2. 단순 프롬프트 처리

#### `POST /prompt`

**설명**: MCP 도구 없이 순수 OpenAI만 사용하여 응답을 생성합니다.

**요청 헤더**:
```
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...
Content-Type: application/json
```

**요청 본문**:
```json
{
  "prompt": "string",    // 필수: 사용자 프롬프트
  "model": "string"      // 선택: OpenAI 모델
}
```

**응답**:
```json
{
  "response": "LLM 응답 내용",
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 100,
    "total_tokens": 150
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 3. 사용 가능한 도구 조회

#### `GET /available-tools`

**설명**: 현재 사용 가능한 MCP 도구 목록을 조회합니다.

**요청 헤더**:
```
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...
```

**응답**:
```json
{
  "tools": [
    {
      "name": "get_appraisals",
      "description": "Performance Plus 평가 목록을 조회합니다",
      "inputSchema": {
        "type": "object",
        "properties": {
          "page": {
            "type": "number",
            "description": "페이지 번호",
            "default": 1
          },
          "size": {
            "type": "number",
            "description": "페이지 크기",
            "default": 10
          },
          "status": {
            "type": "string",
            "description": "평가 상태 필터"
          },
          "name": {
            "type": "string",
            "description": "평가 이름 검색"
          }
        }
      }
    },
    {
      "name": "get_response_results",
      "description": "특정 평가 그룹의 응답 결과를 조회합니다",
      "inputSchema": {
        "type": "object",
        "properties": {
          "appraisal_id": {
            "type": "number",
            "description": "평가 ID"
          },
          "group_id": {
            "type": "number",
            "description": "그룹 ID"
          }
        },
        "required": ["appraisal_id", "group_id"]
      }
    }
  ],
  "authenticated": true
}
```

---

### 4. OpenAI 채팅 완성

#### `POST /llm/chat`

**설명**: OpenAI Chat Completion API를 직접 호출합니다.

**요청 헤더**:
```
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...
Content-Type: application/json
```

**요청 본문**:
```json
{
  "provider": "openai",
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
  "maxTokens": 1000,
  "stream": false
}
```

**응답**:
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-3.5-turbo",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

---

### 5. MCP 도구 직접 실행

#### `POST /mcp/tools/call`

**설명**: 특정 MCP 도구를 직접 실행합니다.

**요청 헤더**:
```
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...
Content-Type: application/json
```

**요청 본문**:
```json
{
  "name": "get_appraisals",
  "arguments": {
    "page": 1,
    "size": 10,
    "status": "pending",
    "name": "2022"
  }
}
```

**응답**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"total_pages\": 5,\n  \"total_count\": 50,\n  \"appraisals\": [...]\n}"
    }
  ]
}
```

---

### 6. MCP 도구 목록 조회

#### `GET /mcp/tools`

**설명**: MCP 서버에서 사용 가능한 모든 도구 목록을 조회합니다.

**요청 헤더**:
```
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...
```

**응답**:
```json
{
  "tools": [
    {
      "name": "get_appraisals",
      "description": "Performance Plus 평가 목록을 조회합니다",
      "inputSchema": {...}
    },
    {
      "name": "get_response_results",
      "description": "특정 평가 그룹의 응답 결과를 조회합니다",
      "inputSchema": {...}
    }
  ]
}
```

---

### 7. Health Check

#### `GET /mcp/health`

**설명**: MCP 서버의 상태를 확인합니다.

**요청 헤더**:
```
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi... (선택사항)
```

**응답**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 8. 사용자 정보 조회

#### `GET /auth/user-info`

**설명**: TTID에서 사용자 정보를 추출합니다.

**요청 헤더**:
```
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...
```

**응답**:
```json
{
  "userId": "eyJraWQiOiI2Mzg1ZWRh",
  "accountId": "1EEBD06B05E411EFB11C0A31B96280A2",
  "loginId": "yj@perpl.io",
  "issuer": "localhost",
  "expiresAt": "2024-01-15T10:30:00.000Z",
  "authenticated": true
}
```

---

### 9. 인증 상태 확인

#### `GET /auth/status`

**설명**: 현재 인증 상태를 확인합니다.

**응답**:
```json
{
  "authenticated": true,
  "authMethod": "TTID Cookie",
  "message": "Authenticated via TTID cookie"
}
```

---

## 에러 응답

모든 API는 오류 발생시 다음 형식으로 응답합니다:

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

### 주요 에러 코드

- `400 Bad Request`: 잘못된 요청 형식
- `401 Unauthorized`: TTID 쿠키 없음 또는 만료
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스를 찾을 수 없음
- `429 Too Many Requests`: Rate limit 초과
- `500 Internal Server Error`: 서버 내부 오류
- `503 Service Unavailable`: 서비스 일시 중단

---

## Rate Limiting

- 표준 엔드포인트: 분당 100개 요청
- 엄격한 엔드포인트 (인증 관련): 분당 10개 요청

Rate limit 초과시 `429 Too Many Requests` 응답과 함께 `Retry-After` 헤더가 포함됩니다.

---

## 지원되는 OpenAI 모델

- `gpt-4-turbo-preview`
- `gpt-4`
- `gpt-3.5-turbo`
- `gpt-3.5-turbo-16k`

---

## MCP 도구 예시

### get_appraisals
평가 목록을 조회합니다.

**파라미터**:
- `page` (number): 페이지 번호 (기본: 1)
- `size` (number): 페이지 크기 (기본: 10)
- `status` (string): 평가 상태 필터
- `name` (string): 평가 이름 검색

### get_response_results
특정 평가 그룹의 응답 결과를 조회합니다.

**파라미터**:
- `appraisal_id` (number, 필수): 평가 ID
- `group_id` (number, 필수): 그룹 ID
- `page` (number): 페이지 번호 (기본: 1)
- `size` (number): 페이지 크기 (기본: 10)

---

## 사용 예시

### 자동 도구 선택 예시

```javascript
// 평가 목록을 자동으로 조회
const response = await fetch('http://localhost:1111/api/v1/process', {
  method: 'POST',
  headers: {
    'Cookie': 'TTID=eyJraWQiOiI2Mzg1ZWRhYy09NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: '2022년 평가 목록을 보여주고 요약해줘'
  })
});

const data = await response.json();
console.log(data.llmResponse.choices[0].message.content);
// LLM이 자동으로 get_appraisals 도구를 선택하여 실행하고 결과를 요약
```

### 직접 도구 실행 예시

```javascript
// 특정 도구를 직접 실행
const response = await fetch('http://localhost:1111/api/v1/mcp/tools/call', {
  method: 'POST',
  headers: {
    'Cookie': 'TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'get_appraisals',
    arguments: {
      page: 1,
      size: 5,
      name: '2022'
    }
  })
});

const result = await response.json();
const appraisals = JSON.parse(result.content[0].text);
console.log(appraisals);
```

### 스트리밍 응답 처리 예시

```javascript
const response = await fetch('http://localhost:1111/api/v1/process', {
  method: 'POST',
  headers: {
    'Cookie': 'TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: '평가 결과를 자세히 분석해줘',
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        console.log('Stream completed');
      } else {
        const parsed = JSON.parse(data);
        if (parsed.type === 'llm_chunk') {
          process.stdout.write(parsed.content);
        }
      }
    }
  }
}
```

---

## TTID 토큰 구조

TTID는 JWT 토큰으로 다음과 같은 페이로드를 포함합니다:

```json
{
  "sub": "1EEBD06B05E411EFB11C0A31B96280A2",
  "aud": "localhost",
  "accountId": "1EEBD06B05E411EFB11C0A31B96280A2",
  "nbf": 1755010742,
  "loginId": "yj@perpl.io",
  "iss": "localhost",
  "exp": 1755011642,
  "iat": 1755010742
}
```

- `sub`: 사용자 ID
- `accountId`: 계정 ID
- `loginId`: 로그인 이메일
- `exp`: 토큰 만료 시간 (Unix timestamp)
- `iss`: 토큰 발급자