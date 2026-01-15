/**
 * 토스페이먼츠 결제 라우트
 * Cloudflare Workers + Hono 환경에서 토스페이먼츠 연동
 */

import { Hono } from 'hono';
import { Context } from 'hono';
import { createSupabaseAdmin } from '../lib/supabase';
import { authMiddleware, Env, AuthUser } from '../middleware/auth';

const payments = new Hono<{ Bindings: Env }>();

/**
 * 결제 요청 생성
 * POST /api/payments/create
 * 
 * Body:
 * {
 *   paymentType: 'subscription' | 'credit_pack',
 *   amount: number,
 *   plan?: 'easy' | 'pro',
 *   creditPackSize?: 10 | 20 | 50
 * }
 */
payments.post('/create', authMiddleware, async (c: Context<{ Bindings: Env }>) => {
  try {
    const user = c.get('user') as AuthUser;
    
    if (!user) {
      return c.json({ 
        error: '인증 필요', 
        message: '로그인이 필요합니다.' 
      }, 401);
    }
    
    const body = await c.req.json();
    const { paymentType, amount, plan, creditPackSize } = body;
    
    // 입력 검증
    if (!paymentType || !amount) {
      return c.json({ 
        error: '필수 파라미터 누락', 
        message: 'paymentType과 amount는 필수입니다.' 
      }, 400);
    }
    
    if (!['subscription', 'credit_pack'].includes(paymentType)) {
      return c.json({ 
        error: '잘못된 결제 타입', 
        message: 'paymentType은 subscription 또는 credit_pack이어야 합니다.' 
      }, 400);
    }
    
    // 주문 ID 생성
    const orderId = `order_${Date.now()}_${user.id.substring(0, 8)}_${Math.random().toString(36).substring(2, 8)}`;
    
    // 결제 이름 생성
    let orderName = '';
    if (paymentType === 'subscription') {
      orderName = plan === 'pro' ? '마케팅허브 PRO 월구독' : '마케팅허브 EASY 월구독';
    } else {
      orderName = `마케팅허브 크레딧 ${creditPackSize}회`;
    }
    
    // Supabase에 결제 기록 생성 (pending 상태)
    const adminClient = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: payment, error: insertError } = await adminClient
      .from('payments')
      .insert({
        user_id: user.id,
        order_id: orderId,
        amount: amount,
        status: 'pending',
        payment_type: paymentType
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('결제 기록 생성 실패:', insertError);
      return c.json({ 
        error: '결제 기록 생성 실패', 
        message: insertError.message 
      }, 500);
    }
    
    // 토스페이먼츠 결제 창 호출 정보 반환
    return c.json({
      success: true,
      paymentData: {
        orderId,
        amount,
        orderName,
        customerEmail: user.email,
        customerName: user.name || user.email.split('@')[0],
        successUrl: `${c.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success`,
        failUrl: `${c.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/fail`
      },
      paymentId: payment.id
    });
  } catch (error: any) {
    console.error('결제 요청 생성 오류:', error);
    return c.json({ 
      error: '결제 요청 생성 실패', 
      message: error.message 
    }, 500);
  }
});

/**
 * 결제 성공 확인
 * POST /api/payments/confirm
 * 
 * Body:
 * {
 *   paymentKey: string,
 *   orderId: string,
 *   amount: number
 * }
 */
payments.post('/confirm', async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json();
    const { paymentKey, orderId, amount } = body;
    
    // 입력 검증
    if (!paymentKey || !orderId || !amount) {
      return c.json({ 
        error: '필수 파라미터 누락', 
        message: 'paymentKey, orderId, amount는 필수입니다.' 
      }, 400);
    }
    
    // 토스페이먼츠 API 호출하여 결제 검증
    const tossApiUrl = 'https://api.tosspayments.com/v1/payments/confirm';
    const secretKey = c.env.TOSS_SECRET_KEY;
    const encodedKey = btoa(`${secretKey}:`);
    
    const response = await fetch(tossApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('토스페이먼츠 결제 검증 실패:', errorData);
      
      // 결제 실패 처리
      const adminClient = createSupabaseAdmin(
        c.env.SUPABASE_URL,
        c.env.SUPABASE_SERVICE_KEY
      );
      
      await adminClient
        .from('payments')
        .update({
          status: 'failed',
          error_code: errorData.code,
          error_message: errorData.message
        })
        .eq('order_id', orderId);
      
      return c.json({ 
        error: '결제 검증 실패', 
        message: errorData.message || '결제 처리 중 오류가 발생했습니다.',
        code: errorData.code
      }, 400);
    }
    
    const paymentData = await response.json();
    
    // DB 업데이트: 결제 성공 → 크레딧 충전
    await confirmPaymentAndChargeCredits(c, {
      orderId,
      paymentKey,
      paymentData
    });
    
    return c.json({
      success: true,
      message: '결제가 완료되었습니다.',
      payment: paymentData
    });
  } catch (error: any) {
    console.error('결제 확인 오류:', error);
    return c.json({ 
      error: '결제 확인 실패', 
      message: error.message 
    }, 500);
  }
});

/**
 * 토스페이먼츠 Webhook 처리
 * POST /api/payments/webhook
 * 
 * 결제 상태 변경 시 토스페이먼츠가 호출하는 엔드포인트
 */
payments.post('/webhook', async (c: Context<{ Bindings: Env }>) => {
  try {
    const body = await c.req.json();
    const signature = c.req.header('toss-signature');
    
    // 서명 검증
    if (!verifyTossSignature(signature, body, c.env.TOSS_WEBHOOK_SECRET)) {
      console.error('토스페이먼츠 Webhook 서명 검증 실패');
      return c.json({ error: '서명 검증 실패' }, 401);
    }
    
    const { eventType, data } = body;
    
    console.log(`Webhook 이벤트 수신: ${eventType}`, data);
    
    // 이벤트별 처리
    switch (eventType) {
      case 'PAYMENT_STATUS_CHANGED':
        await handlePaymentStatusChange(c, data);
        break;
      
      case 'VIRTUAL_ACCOUNT_ISSUED':
        await handleVirtualAccountIssued(c, data);
        break;
      
      case 'PAYMENT_CANCELLED':
        await handlePaymentCancelled(c, data);
        break;
      
      default:
        console.log(`미처리 Webhook 이벤트: ${eventType}`);
    }
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Webhook 처리 오류:', error);
    return c.json({ 
      error: 'Webhook 처리 실패', 
      message: error.message 
    }, 500);
  }
});

/**
 * 결제 내역 조회
 * GET /api/payments/history
 */
payments.get('/history', authMiddleware, async (c: Context<{ Bindings: Env }>) => {
  try {
    const user = c.get('user') as AuthUser;
    
    if (!user) {
      return c.json({ 
        error: '인증 필요', 
        message: '로그인이 필요합니다.' 
      }, 401);
    }
    
    const adminClient = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: payments, error } = await adminClient
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    return c.json({
      success: true,
      payments
    });
  } catch (error: any) {
    console.error('결제 내역 조회 오류:', error);
    return c.json({ 
      error: '결제 내역 조회 실패', 
      message: error.message 
    }, 500);
  }
});

// ==========================================
// 헬퍼 함수들
// ==========================================

/**
 * 결제 성공 후 크레딧 충전
 */
async function confirmPaymentAndChargeCredits(
  c: Context<{ Bindings: Env }>,
  params: {
    orderId: string;
    paymentKey: string;
    paymentData: any;
  }
) {
  const adminClient = createSupabaseAdmin(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_KEY
  );
  
  // 1. payments 테이블 업데이트
  const { data: payment, error: updateError } = await adminClient
    .from('payments')
    .update({
      toss_payment_key: params.paymentKey,
      status: 'success',
      payment_method: params.paymentData.method,
      approved_at: new Date().toISOString()
    })
    .eq('order_id', params.orderId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  if (!payment) throw new Error('결제 정보를 찾을 수 없습니다.');
  
  // 2. 크레딧 충전 계산
  let creditsToAdd = 0;
  let description = '';
  
  if (payment.payment_type === 'subscription') {
    // 구독: 플랜별 크레딧
    if (payment.amount === 9900) {
      creditsToAdd = 30;
      description = 'EASY 플랜 구독 (월 30회)';
    } else if (payment.amount === 29900) {
      creditsToAdd = 100;
      description = 'PRO 플랜 구독 (월 100회)';
    }
    
    // 구독 상태 업데이트
    await adminClient
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_plan: payment.amount === 9900 ? 'easy' : 'pro',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', payment.user_id);
  } else {
    // 크레딧 팩: 개수별 충전
    if (payment.amount === 5000) {
      creditsToAdd = 10;
      description = 'STARTER 크레딧 10개 구매';
    } else if (payment.amount === 23750) {
      creditsToAdd = 50;
      description = 'PRO 크레딧 50개 구매 (5% 할인)';
    } else if (payment.amount === 45000) {
      creditsToAdd = 100;
      description = 'BUSINESS 크레딧 100개 구매 (10% 할인)';
    }
  }
  
  // 3. 크레딧 충전 (직접 DB 업데이트)
  if (creditsToAdd > 0) {
    // paid_credits 업데이트
    await adminClient
      .from('users')
      .update({
        paid_credits: adminClient.rpc('increment', { x: creditsToAdd })
      })
      .eq('id', payment.user_id);

    // credit_transactions 기록
    await adminClient
      .from('credit_transactions')
      .insert({
        user_id: payment.user_id,
        amount: creditsToAdd,
        type: 'purchase',
        description: description,
        payment_id: payment.id
      });
  }
}

/**
 * Webhook 서명 검증
 */
function verifyTossSignature(signature: string | undefined, body: any, secret: string): boolean {
  if (!signature || !secret) return false;
  
  // ⚠️ 토스페이먼츠 실제 서명 검증 로직 필요
  // 여기서는 간단한 예시만 제공
  // 프로덕션에서는 HMAC-SHA256 검증 구현 필요
  
  // TODO: 실제 서명 검증 로직 구현
  // const expectedSignature = createHmac('sha256', secret)
  //   .update(JSON.stringify(body))
  //   .digest('base64');
  
  return true; // 임시로 항상 통과
}

/**
 * 결제 상태 변경 처리
 */
async function handlePaymentStatusChange(c: Context<{ Bindings: Env }>, data: any) {
  console.log('결제 상태 변경:', data);
  
  // 실제 구현에서는 orderId로 결제 조회 후 상태 업데이트
  const adminClient = createSupabaseAdmin(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_KEY
  );
  
  await adminClient
    .from('payments')
    .update({
      status: data.status,
      updated_at: new Date().toISOString()
    })
    .eq('order_id', data.orderId);
}

/**
 * 가상계좌 발급 처리
 */
async function handleVirtualAccountIssued(c: Context<{ Bindings: Env }>, data: any) {
  console.log('가상계좌 발급:', data);
  
  // 가상계좌 정보 저장 (선택사항)
  const adminClient = createSupabaseAdmin(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_KEY
  );
  
  await adminClient
    .from('payments')
    .update({
      payment_method: 'virtual_account',
      updated_at: new Date().toISOString()
    })
    .eq('order_id', data.orderId);
}

/**
 * 결제 취소 처리
 */
async function handlePaymentCancelled(c: Context<{ Bindings: Env }>, data: any) {
  console.log('결제 취소:', data);
  
  const adminClient = createSupabaseAdmin(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_KEY
  );
  
  await adminClient
    .from('payments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    .eq('order_id', data.orderId);
}

export default payments;
