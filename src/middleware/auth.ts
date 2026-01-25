// JWT 인증 미들웨어

import { Context, Next } from 'hono'
import { createClient } from '@supabase/supabase-js'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export interface AuthUser {
  id: string
  email?: string
  role?: string
}

// Context에 user 정보 추가
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    userId: string
  }
}

export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '로그인이 필요합니다. Authorization 헤더를 확인해주세요.'
        }
      }, 401)
    }

    const token = authHeader.substring(7) // "Bearer " 제거

    // Supabase 클라이언트 생성 (ANON_KEY 사용)
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // JWT 토큰 검증 및 사용자 정보 추출
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: '유효하지 않은 토큰입니다. 다시 로그인해주세요.'
        }
      }, 401)
    }

    // Context에 사용자 정보 저장
    c.set('user', {
      id: user.id,
      email: user.email,
      role: user.role
    })
    c.set('userId', user.id)

    console.log(`✅ 인증 성공: ${user.email} (${user.id})`)

    await next()
  } catch (error: any) {
    console.error('❌ 인증 미들웨어 오류:', error)
    return c.json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: '인증 처리 중 오류가 발생했습니다.'
      }
    }, 500)
  }
}

// 선택적 인증 미들웨어 (로그인 안 해도 접근 가능, 로그인 시 user 정보만 추가)
export async function optionalAuthMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      const supabase = createClient(
        c.env.SUPABASE_URL,
        c.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )

      const { data: { user }, error } = await supabase.auth.getUser(token)

      if (!error && user) {
        c.set('user', {
          id: user.id,
          email: user.email,
          role: user.role
        })
        c.set('userId', user.id)
      }
    }

    await next()
  } catch (error) {
    // 에러가 발생해도 계속 진행 (선택적 인증)
    await next()
  }
}

// 관리자 권한 체크 미들웨어
export async function adminMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = c.get('user')
  
  if (!user) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '로그인이 필요합니다.'
      }
    }, 401)
  }

  // 관리자 권한 체크 (role 또는 특정 user_id)
  const isAdmin = user.role === 'admin' || user.role === 'service_role'
  
  if (!isAdmin) {
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '관리자 권한이 필요합니다.'
      }
    }, 403)
  }

  await next()
}
