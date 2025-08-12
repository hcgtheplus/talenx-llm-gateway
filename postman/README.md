# Postman 테스트 가이드

## 🚀 빠른 시작

### 1. Postman 설치
- [Postman 다운로드](https://www.postman.com/downloads/)
- 또는 웹 버전 사용: [Postman Web](https://web.postman.co)

### 2. 컬렉션 가져오기

1. Postman 열기
2. 왼쪽 메뉴 **Collections** → **Import** 클릭
3. `LLM-Gateway.postman_collection.json` 파일 선택
4. **Import** 클릭

### 3. 서버 실행

```bash
# Terminal 1: Redis 실행 (포트 3333)
redis-server --port 3333

# Terminal 2: Gateway 서버 실행 (포트 1111)
npm run dev
```

## 📝 테스트 순서

### Step 1: API Key 생성 ⭐ 필수
```
1. 인증 (Auth) 폴더 열기
2. "API Key 생성" 클릭
3. Send 버튼 클릭
4. 응답에서 API Key 확인 (자동 저장됨)
```

**성공 응답 예시:**
```json
{
  "apiKey": "tlx_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "keyId": "123e4567-e89b-12d3-a456-426614174000",
  "expiresIn": 31536000,
  "message": "API key created successfully. Keep it secure!"
}
```

### Step 2: LLM 테스트 

**⚠️ 주의: `.env` 파일에 실제 API Key 설정 필요**
```env
OPENAI_API_KEY=sk-xxxxx  # OpenAI API Key
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Anthropic API Key
```

테스트 가능한 요청들:
- **프로바이더 목록**: 사용 가능한 LLM 확인
- **OpenAI 채팅**: GPT-3.5 테스트
- **Anthropic Claude**: Claude 테스트
- **스트리밍**: 실시간 응답 (Postman에서는 전체 응답만 보임)

### Step 3: MCP 테스트

**⚠️ 주의: MCP 서버가 실행 중이어야 함**
```bash
# MCP 서버 위치에서
npm start
```

테스트 순서:
1. **MCP 도구 목록**: 사용 가능한 도구 확인
2. **평가 목록 조회**: 평가 데이터 가져오기
3. **MCP 도구 실행**: 특정 도구 실행

## 🔧 변수 설정

컬렉션에는 2개의 변수가 있습니다:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `baseUrl` | `http://localhost:3000` | 서버 주소 |
| `apiKey` | (자동 설정) | API Key 생성 시 자동 저장 |

### 변수 수정 방법:
1. 컬렉션 우클릭 → **Edit**
2. **Variables** 탭 클릭
3. 값 수정 후 **Save**

## 🧪 테스트 스크립트

각 요청에는 자동 테스트가 포함되어 있습니다:

- ✅ 상태 코드 확인
- ✅ 응답 구조 검증
- ✅ API Key 자동 저장
- ✅ 에러 메시지 확인

테스트 결과는 응답 하단 **Test Results** 탭에서 확인 가능합니다.

## 🔍 디버깅

### Rate Limit 확인
응답 헤더에서 확인:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-12T10:30:00.000Z
```

### 캐시 동작 확인
1. 동일한 요청을 2번 실행
2. 두 번째 요청이 더 빠르면 캐시 히트

### 에러 테스트
"4. 헬스체크 & 에러" 폴더의 요청들로 에러 처리 확인

## 📊 환경 설정

### 개발 환경
```
baseUrl: http://localhost:1111
```

### 프로덕션 환경
```
baseUrl: https://api.your-domain.com
```

### Docker 환경
```
baseUrl: http://localhost:1111
```

## 💡 팁

1. **요청 복제**: 우클릭 → Duplicate로 요청 복사 후 수정
2. **히스토리**: 왼쪽 History 탭에서 이전 요청 확인
3. **콘솔 로그**: View → Show Postman Console (디버깅용)
4. **환경 변수**: Environments 기능으로 dev/prod 전환

## 🚨 문제 해결

### "Could not get response" 에러
- 서버가 실행 중인지 확인: `npm run dev`
- Redis가 실행 중인지 확인: `redis-cli ping`

### 401 Unauthorized
- API Key가 올바른지 확인
- Variables 탭에서 `apiKey` 값 확인

### 429 Too Many Requests
- Rate Limit 초과
- 1분 후 다시 시도

### 500 Internal Server Error
- 서버 로그 확인: `logs/error.log`
- `.env` 파일 설정 확인

## 📚 추가 자료

- [Postman Documentation](https://learning.postman.com/docs/)
- [API Documentation](../README.md)
- [Flow Guide](../docs/FLOW_GUIDE.md)