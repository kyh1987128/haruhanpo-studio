/**
 * 인증 미들웨어
 * 회원/비회원 구분 및 세션 관리
 */

import { Context, Next } from 'hono';
import { createSupabaseClient, createSupabaseAdminClient } from '../lib/supabase';

/**
 * 환경 변수 타입 정의
 */
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  OPENAI_API_KEY: string;
  GEMINI_API_KEY?: string;
  TOSS_CLIENT_KEY: string;
  TOSS_SECRET_KEY: string;
}

/**
 * 사용자 정보 타입
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  credits: number;
  subscription_status: 'free' | 'active' | 'expired' | 'cancelled';
  subscription_plan?: 'starter' | 'easy' | 'pro';
}

/**
 * 인증 미들웨어
 * 
 * Authorization 헤더가 있으면 회원으로 처리
 * 없으면 비회원 체험으로 처리
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader) {
    // 비회원 처리
    c.set('isGuest', true);
    return await next();
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY
    );
    
    // 토큰 검증 및 사용자 정보 조회
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return c.json({ 
        error: '인증 실패', 
        message: '유효하지 않은 토큰입니다. 다시 로그인해주세요.' 
      }, 401);
    }
    
    // 사용자 상세 정보 조회 (관리자 권한 필요)
    const adminClient = createSupabaseAdminClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      return c.json({ 
        error: '사용자 정보 조회 실패',
        message: '사용자 데이터를 찾을 수 없습니다.'
      }, 404);
    }
    
    // Context에 사용자 정보 저장
    c.set('user', userData as AuthUser);
    c.set('isGuest', false);
    
    await next();
  } catch (error: any) {
    console.error('인증 미들웨어 오류:', error);
    return c.json({ 
      error: '인증 처리 오류', 
      message: error.message 
    }, 500);
  }
}

/**
 * 비회원 체험 제한 확인
 * 
 * IP 주소 및 디바이스 핑거프린트 기반으로 1회 제한
 */
export async function checkTrialLimit(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const adminClient = createSupabaseAdminClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // IP 주소 및 디바이스 핑거프린트 수집
    const ipAddress = c.req.header('CF-Connecting-IP') || 
                      c.req.header('X-Forwarded-For') || 
                      c.req.header('X-Real-IP') || 
                      'unknown';
    
    const deviceFingerprint = c.req.header('X-Device-Fingerprint') || 
                              c.req.header('User-Agent') || 
                              'unknown';
    
    const userAgent = c.req.header('User-Agent') || 'unknown';
    
    // 기존 체험 기록 조회
    const { data: trialData, error: queryError } = await adminClient
      .from('trial_usage')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('device_fingerprint', deviceFingerprint)
      .single();
    
    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = 데이터 없음
      throw queryError;
    }
    
    // 이미 사용한 경우
    if (trialData) {
      if (trialData.is_blocked) {
        return c.json({
          error: '접근 차단',
          message: trialData.block_reason || '어뷰징이 감지되어 체험이 차단되었습니다.',
          redirect: '/signup'
        }, 403);
      }
      
      if (trialData.usage_count >= 1) {
        return c.json({
          error: '무료 체험 제한',
          message: '무료 체험은 1회만 가능합니다. 회원 가입하시면 월 10회 무료로 이용하실 수 있습니다.',
          redirect: '/signup'
        }, 403);
      }
    }
    
    // 체험 기록 생성 또는 업데이트
    if (!trialData) {
      await adminClient
        .from('trial_usage')
        .insert({
          ip_address: ipAddress,
          device_fingerprint: deviceFingerprint,
          user_agent: userAgent,
          usage_count: 0
        });
    }
    
    // Context에 정보 저장
    c.set('ipAddress', ipAddress);
    c.set('deviceFingerprint', deviceFingerprint);
    
    await next();
    
    // 요청 성공 시 사용 횟수 증가
    await adminClient
      .from('trial_usage')
      .update({
        usage_count: (trialData?.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('ip_address', ipAddress)
      .eq('device_fingerprint', deviceFingerprint);
      
  } catch (error: any) {
    console.error('비회원 체험 확인 오류:', error);
    return c.json({ 
      error: '체험 확인 오류', 
      message: error.message 
    }, 500);
  }
}

/**
 * 크레딧 체크 미들웨어
 * 
 * 회원: 크레딧 잔액 확인
 * 비회원: 체험 제한 확인
 */
export async function checkCredits(c: Context<{ Bindings: Env }>, next: Next) {
  const isGuest = c.get('isGuest');
  
  if (isGuest) {
    // 비회원: 체험 제한 확인
    return await checkTrialLimit(c, next);
  }
  
  try {
    const user = c.get('user') as AuthUser;
    
    if (!user) {
      return c.json({ 
        error: '인증 필요', 
        message: '로그인이 필요합니다.' 
      }, 401);
    }
    
    // 크레딧 잔액 확인
    if (user.credits < 1) {
      return c.json({
        error: '크레딧 부족',
        message: '크레딧이 부족합니다. 결제하여 크레딧을 충전해주세요.',
        currentCredits: user.credits,
        redirect: '/payment'
      }, 403);
    }
    
    await next();
  } catch (error: any) {
    console.error('크레딧 체크 오류:', error);
    return c.json({ 
      error: '크레딧 확인 오류', 
      message: error.message 
    }, 500);
  }
}

/**
 * 관리자 권한 확인 미들웨어 (선택사항)
 */
export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as AuthUser;
  
  if (!user) {
    return c.json({ 
      error: '인증 필요', 
      message: '로그인이 필요합니다.' 
    }, 401);
  }
  
  // 관리자 이메일 확인 (환경변수에서 관리)
  const adminEmails = (c.env as any).ADMIN_EMAILS?.split(',') || [];
  
  if (!adminEmails.includes(user.email)) {
    return c.json({ 
      error: '권한 없음', 
      message: '관리자만 접근 가능합니다.' 
    }, 403);
  }
  
  await next();
}
