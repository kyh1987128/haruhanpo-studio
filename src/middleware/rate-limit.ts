/**
 * Rate Limiting Middleware
 * IP 기반 요청 제한 (Cloudflare Workers 환경)
 */

import { Context, Next } from 'hono';

// Rate limit 설정
const RATE_LIMIT_CONFIG = {
  // API 엔드포인트별 제한
  '/api/generate': { maxRequests: 10, windowMs: 60000 }, // 분당 10회
  '/api/auth/signup': { maxRequests: 5, windowMs: 300000 }, // 5분당 5회
  '/api/auth/login': { maxRequests: 10, windowMs: 300000 }, // 5분당 10회
  '/api/profiles': { maxRequests: 30, windowMs: 60000 }, // 분당 30회
  '/api/history': { maxRequests: 30, windowMs: 60000 }, // 분당 30회
  default: { maxRequests: 60, windowMs: 60000 }, // 기본: 분당 60회
};

// 간단한 인메모리 저장소 (프로덕션에서는 KV 사용 권장)
const requestStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate Limiting 미들웨어
 */
export async function rateLimit(c: Context, next: Next) {
  try {
    // Cloudflare에서 제공하는 실제 클라이언트 IP
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               'unknown';
    
    // 현재 경로
    const path = new URL(c.req.url).pathname;
    
    // 경로별 설정 가져오기
    const config = getRateLimitConfig(path);
    
    // Rate limit 체크
    const allowed = checkRateLimit(ip, path, config);
    
    if (!allowed) {
      // Rate limit 초과
      console.warn(`🚫 Rate limit exceeded: ${ip} - ${path}`);
      
      return c.json(
        {
          error: 'Too many requests',
          message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: Math.ceil(config.windowMs / 1000),
        },
        429 // Too Many Requests
      );
    }
    
    // Rate limit 통과
    await next();
    
  } catch (error) {
    // Rate limiting 실패해도 요청은 통과 (안전 장치)
    console.error('⚠️ Rate limit middleware error:', error);
    await next();
  }
}

/**
 * 경로별 Rate Limit 설정 가져오기
 */
function getRateLimitConfig(path: string): { maxRequests: number; windowMs: number } {
  // 정확히 일치하는 경로 찾기
  if (RATE_LIMIT_CONFIG[path as keyof typeof RATE_LIMIT_CONFIG]) {
    return RATE_LIMIT_CONFIG[path as keyof typeof RATE_LIMIT_CONFIG];
  }
  
  // 경로 패턴 매칭
  for (const [pattern, config] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (pattern !== 'default' && path.startsWith(pattern)) {
      return config;
    }
  }
  
  // 기본값
  return RATE_LIMIT_CONFIG.default;
}

/**
 * Rate Limit 체크
 */
function checkRateLimit(
  ip: string,
  path: string,
  config: { maxRequests: number; windowMs: number }
): boolean {
  const key = `${ip}:${path}`;
  const now = Date.now();
  
  // 기존 기록 가져오기
  const record = requestStore.get(key);
  
  if (!record) {
    // 첫 요청
    requestStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return true;
  }
  
  // 시간 윈도우 초과 → 리셋
  if (now > record.resetTime) {
    requestStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return true;
  }
  
  // 요청 수 체크
  if (record.count >= config.maxRequests) {
    return false; // Rate limit 초과
  }
  
  // 카운트 증가
  record.count++;
  return true;
}

/**
 * Rate Limit 저장소 정리 (메모리 관리)
 * 주기적으로 만료된 기록 삭제
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime + 60000) { // 1분 여유
      requestStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Rate limit store cleaned: ${cleaned} entries removed`);
  }
}

// 5분마다 자동 정리
setInterval(cleanupRateLimitStore, 300000);

/**
 * Export rate limiters for different endpoints
 */
export const rateLimiters = {
  // 인증 API: 5분당 10회
  auth: async (c: Context, next: Next) => {
    const config = { maxRequests: 10, windowMs: 300000 };
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const path = new URL(c.req.url).pathname;
    
    if (!checkRateLimit(ip, path, config)) {
      return c.json({
        error: 'Too many requests',
        message: '인증 요청이 너무 많습니다. 5분 후 다시 시도해주세요.',
        retryAfter: 300
      }, 429);
    }
    
    await next();
  },
  
  // 콘텐츠 생성: 분당 5회
  generate: async (c: Context, next: Next) => {
    const config = { maxRequests: 5, windowMs: 60000 };
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const path = new URL(c.req.url).pathname;
    
    if (!checkRateLimit(ip, path, config)) {
      return c.json({
        error: 'Too many requests',
        message: '콘텐츠 생성 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
        retryAfter: 60
      }, 429);
    }
    
    await next();
  },
  
  // YouTube API: 분당 20회
  youtube: async (c: Context, next: Next) => {
    const config = { maxRequests: 20, windowMs: 60000 };
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const path = new URL(c.req.url).pathname;
    
    if (!checkRateLimit(ip, path, config)) {
      return c.json({
        error: 'Too many requests',
        message: 'YouTube API 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
        retryAfter: 60
      }, 429);
    }
    
    await next();
  },
  
  // 일반 API: 분당 60회
  api: async (c: Context, next: Next) => {
    const config = { maxRequests: 60, windowMs: 60000 };
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const path = new URL(c.req.url).pathname;
    
    if (!checkRateLimit(ip, path, config)) {
      return c.json({
        error: 'Too many requests',
        message: 'API 요청이 너무 많습니다. 1분 후 다시 시도해주세요.',
        retryAfter: 60
      }, 429);
    }
    
    await next();
  }
};
