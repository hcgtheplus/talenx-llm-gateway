# Talenx LLM Gateway

프롬프트 기반 자동 MCP 도구 선택을 지원하는 OpenAI LLM 게이트웨이

## 개요

Talenx LLM Gateway는 OpenAI API와 MCP(Model Context Protocol) 서버를 통합하여 프롬프트를 분석하고 자동으로 적절한 도구를 선택하여 실행하는 지능형 API 게이트웨이입니다. LLM이 사용자의 요청을 이해하고 필요한 도구를 자동으로 호출하여 더 풍부한 응답을 생성합니다.

## 주요 기능

- **자동 도구 선택**: LLM이 프롬프트를 분석하여 MCP 도구 자동 선택 및 실행
- **OpenAI 통합**: GPT 모델을 통한 자연어 처리 및 응답 생성
- **MCP 서버 연동**: 외부 서비스와의 통합을 위한 MCP 프로토콜 지원
- **TTID 인증**: 쿠키 기반 TTID 토큰을 MCP 서버로 전달
- **스트리밍 지원**: 실시간 응답 스트리밍
- **Redis 캐싱**: 성능 최적화를 위한 결과 캐싱

## 아키텍처

```
Client → API Gateway → LLM (도구 선택) → MCP Server → LLM (최종 응답)
           ↓
        Redis Cache
```

## 시작하기

### 필수 요구사항

- Node.js 18.0 이상
- Redis 서버
- OpenAI API 키
- MCP 서버 (talenx-ssq-mcp)

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-org/talenx-llm-gateway.git
cd talenx-llm-gateway

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필요한 값 설정
```

### 환경 변수 설정

```env
# 서버 설정
PORT=1111
NODE_ENV=production

# OpenAI 설정
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DEFAULT_MODEL=gpt-4

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# MCP 서버 설정
MCP_SERVER_URL=http://localhost:9999
MCP_WORKSPACE_HASH=your-workspace-hash

# 로깅
LOG_LEVEL=info
```

### 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

## API 사용법

### 1. 통합 처리 (자동 도구 선택)

LLM이 프롬프트를 분석하여 필요한 MCP 도구를 자동으로 선택하고 실행합니다.

```bash
curl -X POST http://localhost:1111/api/v1/process \
  -H "Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi..." \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "평가 목록을 보여줘",
    "model": "gpt-4",
    "temperature": 0.7
  }'
```

### 2. 단순 프롬프트 처리 (도구 없이)

MCP 도구 없이 순수 LLM만 사용하여 응답을 생성합니다.

```bash
curl -X POST http://localhost:1111/api/v1/prompt \
  -H "Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi..." \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Node.js란 무엇인가요?",
    "model": "gpt-4"
  }'
```

### 3. 스트리밍 응답

실시간으로 응답을 스트리밍 받습니다.

```javascript
const response = await fetch('http://localhost:1111/api/v1/process', {
  method: 'POST',
  headers: {
    'Cookie': 'TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: '평가 결과를 분석해줘',
    stream: true
  })
});

const reader = response.body.getReader();
// 스트림 처리...
```

## MCP 도구 통합

게이트웨이는 MCP 서버의 도구를 자동으로 감지하고 사용합니다:

1. 사용 가능한 도구 목록 조회
2. LLM이 프롬프트 분석 후 적절한 도구 선택
3. 도구 실행 및 결과 수집
4. 도구 결과를 포함한 최종 응답 생성

### 지원되는 MCP 도구 예시

- `get_appraisals`: 평가 목록 조회
- `get_response_results`: 평가 응답 결과 조회
- 기타 MCP 서버에 등록된 모든 도구

## 인증

### TTID 쿠키 인증

모든 API 요청에는 TTID 쿠키가 필요합니다:

```
Cookie: TTID=eyJraWQiOiI2Mzg1ZWRhYy05NTAwLTQwYzAtOTQzNy04YThlYmRkNWY1NWYi...
```

TTID는 원본 서비스의 JWT 토큰으로, 사용자 인증 및 MCP 서버 접근에 사용됩니다.

### TTID 구조

TTID는 JWT 토큰으로 다음 정보를 포함합니다:
- `sub`: 사용자 ID
- `accountId`: 계정 ID
- `loginId`: 로그인 ID (이메일)
- `exp`: 토큰 만료 시간
- `iss`: 발급자

## 프로젝트 구조 및 파일 역할

### 📁 루트 디렉토리
- **README.md** - 프로젝트 개요, 설치 및 사용 가이드
- **API_DOCUMENTATION.md** - 상세한 API 엔드포인트 문서
- **.env.example** - 환경 변수 템플릿
- **package.json** - Node.js 프로젝트 설정 및 의존성
- **tsconfig.json** - TypeScript 컴파일러 설정
- **docker-compose.yml** - Docker 컨테이너 오케스트레이션
- **Dockerfile** - Docker 이미지 빌드 설정

### 📂 /src

#### 🚀 엔트리 포인트
- **index.ts** - 서버 시작점, Express 서버 실행
- **app.ts** - Express 애플리케이션 설정, 미들웨어 및 라우트 등록

#### ⚙️ /config
- **index.ts** - 환경 변수 관리 및 중앙 설정 관리
  - 서버 포트 (1111)
  - Redis 연결 정보 (6379)
  - OpenAI API 설정
  - MCP 서버 URL (9999)
  - Rate limiting 설정

#### 🛡️ /middleware
- **auth.ts** - TTID 쿠키 인증 처리
  - Cookie 헤더에서 TTID 추출
  - JWT 토큰 검증
  - 사용자 정보 파싱
- **errorHandler.ts** - 전역 에러 처리 및 표준화된 에러 응답
- **rateLimiter.ts** - API 요청 제한 (분당 100/10 요청)
- **validation.ts** - 요청 데이터 유효성 검사

#### 🛣️ /routes
- **process.ts** - 통합 처리 라우트
  - `/process` - LLM 자동 도구 선택 및 실행
  - `/prompt` - 단순 LLM 응답
  - `/available-tools` - 사용 가능한 MCP 도구 목록
- **llm.ts** - OpenAI 직접 호출 라우트
  - `/llm/chat` - Chat completion
  - `/llm/complete` - Text completion
  - `/llm/usage` - 사용량 통계
  - `/llm/providers` - 지원 프로바이더
  - `/llm/models/:provider` - 모델 목록
- **mcp.ts** - MCP 도구 관리 라우트
  - `/mcp/tools` - 도구 목록 조회
  - `/mcp/tools/call` - 도구 직접 실행
  - `/mcp/health` - MCP 서버 상태
- **auth.ts** - 인증 관련 라우트
  - `/auth/user-info` - TTID에서 사용자 정보 조회
  - `/auth/status` - 인증 상태 확인

#### 🧠 /services
- **orchestrator.ts** - 핵심 비즈니스 로직
  - 프롬프트 분석 및 MCP 도구 자동 선택
  - 도구 실행 및 결과 수집
  - LLM 응답 생성 및 스트리밍
- **/llm**
  - **base.ts** - LLM 프로바이더 추상 클래스
  - **openai.ts** - OpenAI API 구현
  - **index.ts** - LLM 서비스 팩토리 및 인터페이스
- **/mcp**
  - **client.ts** - MCP 서버 통신 클라이언트
    - 도구 목록 조회
    - 도구 실행
    - TTID 인증 처리
    - Redis 캐싱

#### 🔧 /utils
- **logger.ts** - Winston 로거 설정 (구조화된 로깅)
- **redis.ts** - Redis 클라이언트 및 캐싱 유틸리티

### 📂 /postman
- **Talenx-LLM-Gateway.postman_collection.json** - 모든 API 엔드포인트 테스트 컬렉션

### 📂 /docs
- 추가 문서 (필요시)

### 📂 /logs
- 애플리케이션 로그 파일 저장

## 성능 최적화

- **Redis 캐싱**: MCP 도구 목록과 결과를 캐싱하여 응답 속도 향상
- **Rate Limiting**: API 남용 방지
- **스트리밍**: 대용량 응답의 실시간 전송
- **연결 풀링**: 데이터베이스 및 외부 API 연결 최적화

## 모니터링

- Winston 로거를 통한 구조화된 로깅
- 에러 추적 및 성능 메트릭
- Health check 엔드포인트: `/api/v1/health`

## 문제 해결

### Redis 연결 오류
```bash
# Redis 서버 상태 확인
redis-cli ping

# Redis 서버 시작
redis-server
```

### MCP 서버 연결 오류
```bash
# MCP 서버 상태 확인
curl http://localhost:9999/health

# MCP 서버 로그 확인
tail -f ~/Desktop/talenx-ssq-mcp/logs/mcp-*.log
```

### OpenAI API 오류
- API 키 확인
- Rate limit 확인
- 모델 이름 확인

## 라이선스

MIT License

## 기여

이슈 및 PR을 환영합니다. 기여 가이드라인을 참조해주세요.

## 지원

문제가 있으시면 이슈를 생성하거나 support@talenx.com으로 문의해주세요.