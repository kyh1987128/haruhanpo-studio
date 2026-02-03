/**
 * Rate Limiting 미들웨어
 * IP 기반 요청 제한으로 악의적 사용 방지
 */

import { Context, Next } from 'hono';

interface RateLimitConfig {
  windowMs: number;      // 시간 윈도우 (밀리초)
  maxRequests: number;   // 최대 요청 수
  message?: string;      // 제한 초과 시 메시지
}

// 메모리 기반 저장소 (간단한 구현)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate Limiting 미들웨어 생성
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  } = config;

  return async (c: Context, next: Next) => {
    // IP 주소 가져오기 (Cloudflare 헤더 우선)
    const ip = c.req.header('CF-Connecting-IP') 
      || c.req.header('X-Forwarded-For')?.split(',')[0]
      || c.req.header('X-Real-IP')
      || 'unknown';

    const now = Date.now();
    const key = `rate_limit:${ip}`;

    // 기존 기록 가져오기
    let record = requestCounts.get(key);

    // 시간 윈도우 초과 시 초기화
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      requestCounts.set(key, record);
    }

    // 요청 카운트 증가
    record.count++;

    // 제한 초과 확인
    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      
      return c.json(
        {
          error: message,
          retry_after: retryAfter
        },
        429,
        {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': record.resetTime.toString()
        }
      );
    }

    // 응답 헤더에 Rate Limit 정보 추가
    const remaining = maxRequests - record.count;
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', record.resetTime.toString());

    await next();
  };
}

/**
 * 만료된 레코드 정리 (메모리 관리)
 */
export function cleanupRateLimitRecords() {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// 5분마다 자동 정리
setInterval(cleanupRateLimitRecords, 5 * 60 * 1000);

/**
 * 미리 정의된 Rate Limiter들
 */
export const rateLimiters = {
  // 일반 API: 분당 60회
  api: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60
  }),

  // 인증 API: 분당 10회
  auth: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: '인증 요청이 너무 많습니다. 1분 후 다시 시도해주세요.'
  }),

  // 콘텐츠 생성: 분당 5회
  generate: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: '콘텐츠 생성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  }),

  // YouTube 분석: 분당 20회
  youtube: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20
  })
};
