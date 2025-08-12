#!/usr/bin/env node

/**
 * 요청 추적 스크립트
 * 실제 API 요청이 어떻게 처리되는지 단계별로 보여줍니다
 * 
 * 사용법: node scripts/trace-request.js
 */

const chalk = require('chalk');
const axios = require('axios');

// 색상 설정
const colors = {
  step: chalk.cyan,
  success: chalk.green,
  error: chalk.red,
  info: chalk.yellow,
  data: chalk.gray,
  header: chalk.magenta.bold
};

// 단계별 지연 시간 (ms)
const DELAY = 1000;

// 테스트 설정
const BASE_URL = 'http://localhost:1111';
let API_KEY = '';

// 지연 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 단계 출력 함수
async function printStep(stepNumber, title, description, code = null) {
  console.log('\n' + colors.header(`━━━ STEP ${stepNumber}: ${title} ━━━`));
  console.log(colors.info(description));
  
  if (code) {
    console.log(colors.data('\n코드 위치:'));
    console.log(colors.data(code));
  }
  
  await delay(DELAY);
}

// API 요청 추적
async function traceRequest(config) {
  const { method, url, headers = {}, data = null } = config;
  
  console.log(colors.step('\n📡 API 요청 시작:'));
  console.log(colors.data(`${method} ${url}`));
  
  if (headers) {
    console.log(colors.data('Headers:', JSON.stringify(headers, null, 2)));
  }
  
  if (data) {
    console.log(colors.data('Body:', JSON.stringify(data, null, 2)));
  }
  
  try {
    const response = await axios({ method, url, headers, data });
    console.log(colors.success('✅ 응답 성공:', response.status));
    console.log(colors.data(JSON.stringify(response.data, null, 2)));
    return response.data;
  } catch (error) {
    console.log(colors.error('❌ 에러 발생:'));
    if (error.response) {
      console.log(colors.error(`Status: ${error.response.status}`));
      console.log(colors.error(`Data: ${JSON.stringify(error.response.data)}`));
    } else {
      console.log(colors.error(error.message));
    }
    throw error;
  }
}

// 메인 흐름
async function main() {
  console.clear();
  console.log(colors.header('\n🚀 LLM Gateway 요청 흐름 추적 시작\n'));
  console.log(colors.info('이 스크립트는 실제 API 요청이 어떻게 처리되는지 보여줍니다.\n'));

  try {
    // STEP 1: API 키 발급
    await printStep(
      1,
      'API 키 발급',
      'API 키를 생성하여 인증 토큰으로 사용합니다.',
      'src/routes/auth.ts:12-32 (router.post("/api-key/generate"))'
    );
    
    const registerResponse = await traceRequest({
      method: 'POST',
      url: `${BASE_URL}/api/v1/auth/api-key/generate`
    });
    
    API_KEY = registerResponse.apiKey;
    console.log(colors.success(`\n✨ API 키 발급 완료: ${API_KEY}`));

    // STEP 2: 인증 미들웨어 통과
    await printStep(
      2,
      '인증 확인',
      'API 키를 사용하여 인증 미들웨어를 통과합니다.',
      'src/middleware/auth.ts:16-43 (apiKeyAuth)'
    );
    
    await traceRequest({
      method: 'GET',
      url: `${BASE_URL}/api/v1/auth/api-key/info`,
      headers: { 'X-API-Key': API_KEY }
    });

    // STEP 3: Rate Limiting 체크
    await printStep(
      3,
      'Rate Limiting 확인',
      'Rate Limiter가 요청 횟수를 체크합니다.',
      'src/middleware/rateLimiter.ts:22-60 (createRateLimiter)'
    );
    
    console.log(colors.info('Rate Limit 테스트를 위해 3번 연속 요청...'));
    
    for (let i = 1; i <= 3; i++) {
      console.log(colors.data(`\n요청 ${i}/3:`));
      const response = await axios.get(`${BASE_URL}/api/v1/auth/api-key/info`, {
        headers: { 'X-API-Key': API_KEY }
      });
      
      console.log(colors.data(`Rate Limit 헤더:`));
      console.log(colors.data(`- Limit: ${response.headers['x-ratelimit-limit']}`));
      console.log(colors.data(`- Remaining: ${response.headers['x-ratelimit-remaining']}`));
    }

    // STEP 4: LLM 요청 라우팅
    await printStep(
      4,
      'LLM 요청 라우팅',
      'LLM 채팅 요청이 라우터를 통해 서비스로 전달됩니다.',
      'src/routes/llm.ts:23-60 (router.post("/chat"))'
    );

    // STEP 5: 캐시 확인
    await printStep(
      5,
      '캐시 확인',
      'Redis에서 동일한 요청의 캐시를 확인합니다.',
      'src/services/llm/index.ts:35-42 (캐시 확인 로직)'
    );

    const chatRequest = {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Reply with exactly: "Hello from Gateway!"' },
        { role: 'user', content: 'Hi' }
      ],
      temperature: 0, // 캐싱을 위해 0으로 설정
      maxTokens: 20
    };

    console.log(colors.info('\n첫 번째 요청 (캐시 미스):'));
    await traceRequest({
      method: 'POST',
      url: `${BASE_URL}/api/v1/llm/chat`,
      headers: { 'X-API-Key': API_KEY },
      data: chatRequest
    });

    console.log(colors.info('\n두 번째 요청 (캐시 히트):'));
    await traceRequest({
      method: 'POST',
      url: `${BASE_URL}/api/v1/llm/chat`,
      headers: { 'X-API-Key': API_KEY },
      data: chatRequest
    });

    // STEP 6: MCP 통합
    await printStep(
      6,
      'MCP 서버 통신',
      'MCP 서버의 도구를 호출합니다.',
      'src/services/mcp/client.ts:85-103 (callTool)'
    );

    await traceRequest({
      method: 'GET',
      url: `${BASE_URL}/api/v1/mcp/tools`,
      headers: { 'X-API-Key': API_KEY }
    });

    // 완료
    console.log('\n' + colors.header('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(colors.success('\n✅ 전체 흐름 추적 완료!\n'));
    console.log(colors.info('주요 처리 순서:'));
    console.log(colors.data('1. 클라이언트 요청'));
    console.log(colors.data('2. Express 미들웨어 (CORS, Body Parser)'));
    console.log(colors.data('3. 인증 미들웨어 (API Key 검증)'));
    console.log(colors.data('4. Rate Limiting 미들웨어'));
    console.log(colors.data('5. 유효성 검사 미들웨어'));
    console.log(colors.data('6. 라우터 → 서비스 → 외부 API'));
    console.log(colors.data('7. 응답 캐싱 및 반환'));

  } catch (error) {
    console.log(colors.error('\n추적 중 에러 발생:'));
    console.log(colors.error(error.message));
    
    console.log(colors.info('\n💡 서버가 실행 중인지 확인하세요:'));
    console.log(colors.data('npm run dev'));
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}