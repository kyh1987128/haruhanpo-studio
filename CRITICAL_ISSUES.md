# 🚨 중요 이슈 발견 (v7.5.0)

## 📊 **코드 검증 결과**

**검증일:** 2026-01-02  
**검증 대상:** src/index.tsx  
**발견 이슈:** 2개 (Critical)  

---

## ❌ **Issue #1: 구글 로그인 연동 코드 없음**

### **현재 상태:**
```typescript
// src/index.tsx에는 Google OAuth 관련 코드가 전혀 없음

// 존재하는 엔드포인트:
- POST /api/auth/sync         // ✅ Supabase 연동 완료
- POST /api/rewards/claim     // ✅ Supabase 연동 완료
- POST /api/rewards/check-streak // ✅ Supabase 연동 완료
- GET  /api/auth/me           // ⚠️ 더미 응답만 있음
```

### **문제점:**
1. **프론트엔드에서만 Google OAuth 처리**
   - `app-v3-final.js`에서 Supabase Auth를 직접 호출
   - 백엔드는 `/api/auth/sync`로 사용자 정보만 동기화
   
2. **백엔드에 OAuth 엔드포인트 없음**
   - `/api/auth/login` 없음
   - `/api/auth/callback` 없음
   - OAuth 토큰 검증 로직 없음

### **판단:**
- ✅ **정상 동작**: 프론트엔드에서 Supabase Auth 직접 사용
- ✅ **배포 가능**: Google OAuth는 Supabase가 처리
- ⚠️ **개선 필요**: `/api/auth/me` 더미 응답 수정 필요

### **해결 방법:**
```typescript
// /api/auth/me 수정 필요
app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        is_guest: true,
        user: null
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // ✅ Supabase로 토큰 검증 및 사용자 정보 조회
    const supabase = createSupabaseClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_ANON_KEY
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return c.json({ is_guest: true, user: null });
    }
    
    // users 테이블에서 상세 정보 조회
    const adminClient = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: userData } = await adminClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return c.json({
      is_guest: false,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        credits: userData.credits,
        subscription_status: userData.subscription_status,
        monthly_free_usage_count: userData.monthly_free_usage_count,
        consecutive_login_days: userData.consecutive_login_days
      }
    });
  } catch (error: any) {
    console.error('사용자 정보 조회 실패:', error);
    return c.json({ is_guest: true, user: null });
  }
});
```

---

## ❌ **Issue #2: 크레딧 차감 로직 없음 (Critical)**

### **현재 상태:**
```typescript
// /api/generate 엔드포인트 (line 323-756)

// ❌ 문제 1: 크레딧/월간 사용량 체크 없음
app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { brand, keywords, images, platforms, forceGenerate } = body;
    
    // 입력 검증만 있음 (line 346-375)
    if (!brand || !keywords || !images || !platforms) {
      return c.json({ error: '필수 입력 항목 누락' }, 400);
    }
    
    // ❌ 크레딧 체크 없음
    // ❌ 월간 사용량 체크 없음
    // ❌ user_id 파라미터 받지 않음
    
    // 바로 콘텐츠 생성 시작 (line 389-756)
    const openai = new OpenAI({ apiKey: finalApiKey });
    // ... 이미지 분석, 콘텐츠 생성 ...
    
    // ❌ 문제 2: 크레딧 차감 없음
    // ❌ 월간 사용량 증가 없음
    
    return c.json({
      success: true,
      data, // 생성된 콘텐츠
      cost: { openai: 0.05, gemini: 0.01, total: 0.06 } // 원가만 표시
    });
  } catch (error) {
    // ...
  }
});
```

### **문제점:**
1. **크레딧 체크 로직 없음**
   - `user_id` 파라미터를 받지 않음
   - Supabase에서 사용자 크레딧 확인 안 함
   - 크레딧 부족 시 거부 로직 없음

2. **월간 무료 사용량 체크 없음**
   - `checkAndUseMonthlyQuota()` 호출 안 함
   - 무료 회원 월 10회 제한 작동 안 함

3. **크레딧 차감 로직 없음**
   - 콘텐츠 생성 후 크레딧 차감 안 함
   - 사용 내역 기록 안 함

4. **원가만 표시**
   - 달러 원가만 계산 (OpenAI + Gemini)
   - 크레딧 차감량 표시 없음

### **심각도:**
- 🚨 **Critical**: 무제한 무료 사용 가능
- 🚨 **비즈니스 로직 완전 누락**
- 🚨 **즉시 수정 필요**

---

## 🔧 **해결 방법**

### **Step 1: /api/generate에 user_id 파라미터 추가**

```typescript
app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json();
    const {
      user_id, // ✅ 추가
      is_guest = false, // ✅ 추가
      brand,
      keywords,
      images,
      platforms,
      forceGenerate = false
    } = body;
    
    // ... 입력 검증 ...
```

---

### **Step 2: 크레딧/월간 사용량 체크 추가**

```typescript
    // ✅ Supabase Admin 클라이언트 초기화
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // ✅ 비회원 체크 (IP 기반 1회 제한)
    if (is_guest) {
      // TODO: trial_usage 테이블 체크 (IP, device fingerprint)
      // 비회원은 1회만 가능
      const ipAddress = c.req.header('CF-Connecting-IP') || 
                        c.req.header('X-Forwarded-For') || 
                        'unknown';
      
      const { data: trialData } = await supabase
        .from('trial_usage')
        .select('usage_count')
        .eq('ip_address', ipAddress)
        .single();
      
      if (trialData && trialData.usage_count >= 1) {
        return c.json({
          error: '무료 체험 제한',
          message: '무료 체험은 1회만 가능합니다. 회원 가입하시면 월 10회 무료로 이용하실 수 있습니다.',
          redirect: '/signup'
        }, 403);
      }
    }
    
    // ✅ 회원 크레딧 및 월간 사용량 체크
    if (!is_guest && user_id) {
      // 사용자 정보 조회
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits, subscription_status')
        .eq('id', user_id)
        .single();
      
      if (userError || !user) {
        return c.json({
          error: '사용자 정보 조회 실패',
          message: '사용자를 찾을 수 없습니다.'
        }, 404);
      }
      
      // 유료 회원은 크레딧만 체크
      if (user.subscription_status === 'active') {
        if (user.credits < 1) {
          return c.json({
            error: '크레딧 부족',
            message: '크레딧이 부족합니다. 크레딧을 구매해주세요.',
            currentCredits: user.credits,
            redirect: '/payment'
          }, 403);
        }
      } else {
        // 무료 회원은 월간 사용량 체크
        const quotaResult = await checkAndUseMonthlyQuota(supabase, user_id);
        
        if (!quotaResult.available) {
          // 크레딧이 있으면 크레딧으로 사용 가능
          if (user.credits < 1) {
            return c.json({
              error: '월 10회 무료 사용 제한',
              message: '이번 달 무료 사용 횟수를 모두 소진했습니다. 크레딧을 구매하거나 다음 달을 기다려주세요.',
              remaining: quotaResult.remaining,
              redirect: '/payment'
            }, 403);
          }
          
          console.log(`✅ 무료 횟수 소진, 크레딧 사용: ${user_id}`);
        } else {
          console.log(`✅ 월간 무료 사용: ${user_id} 남은 횟수 ${quotaResult.remaining}`);
        }
      }
    }
```

---

### **Step 3: 콘텐츠 생성 후 크레딧 차감**

```typescript
    // ... 콘텐츠 생성 완료 ...
    
    console.log('콘텐츠 생성 완료!');
    console.log(`💰 비용 추정: OpenAI $${totalCost.openai.toFixed(3)}, Gemini $${totalCost.gemini.toFixed(3)}, 총 $${(totalCost.openai + totalCost.gemini).toFixed(3)}`);
    
    // ✅ 크레딧 차감 로직 추가
    let creditDeducted = false;
    let newCredits = 0;
    
    if (!is_guest && user_id) {
      // 월간 무료 사용이 아니면 크레딧 차감
      const { data: user } = await supabase
        .from('users')
        .select('credits, monthly_free_usage_count, subscription_status')
        .eq('id', user_id)
        .single();
      
      // 유료 회원이거나 무료 횟수 소진한 경우 크레딧 차감
      if (user.subscription_status === 'active' || user.credits > 0) {
        // 크레딧 1개 차감
        const { data: updatedUser, error: deductError } = await supabase
          .from('users')
          .update({ 
            credits: user.credits - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', user_id)
          .select()
          .single();
        
        if (!deductError) {
          newCredits = updatedUser.credits;
          creditDeducted = true;
          
          // credit_transactions 기록
          await supabase.from('credit_transactions').insert({
            user_id,
            amount: -1,
            balance_after: newCredits,
            type: 'usage',
            description: '콘텐츠 생성'
          });
          
          console.log(`✅ 크레딧 차감: ${user_id} 1크레딧 → 남은 크레딧 ${newCredits}`);
        }
      }
    } else if (is_guest) {
      // 비회원 사용 기록
      const ipAddress = c.req.header('CF-Connecting-IP') || 
                        c.req.header('X-Forwarded-For') || 
                        'unknown';
      
      await supabase.rpc('use_trial', {
        p_ip_address: ipAddress,
        p_device_fingerprint: c.req.header('User-Agent') || 'unknown',
        p_user_agent: c.req.header('User-Agent') || 'unknown'
      });
      
      console.log(`✅ 비회원 사용 기록: ${ipAddress}`);
    }
    
    return c.json({
      success: true,
      data,
      generatedPlatforms: platforms,
      imageCount: images.length,
      strategy: {
        selected: contentStrategy,
        confidence: matchingAnalysis?.confidence || 100,
        reason: matchingAnalysis?.reason || '기본 전략 사용',
        imageSummary: matchingAnalysis?.imageSummary || '',
        userInputSummary: matchingAnalysis?.userInputSummary || '',
      },
      cost: {
        openai: totalCost.openai,
        gemini: totalCost.gemini,
        total: totalCost.openai + totalCost.gemini,
        savings: geminiApiKey ? '약 52% 절감 (하이브리드 전략)' : '절감 없음',
      },
      // ✅ 크레딧 정보 추가
      credits: {
        deducted: creditDeducted,
        amount: creditDeducted ? -1 : 0,
        remaining: newCredits
      }
    });
```

---

### **Step 4: 프론트엔드 수정 (app-v3-final.js)**

```javascript
// 콘텐츠 생성 요청 시 user_id 추가
async function generateContent() {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.id, // ✅ 추가
        is_guest: currentUser.isGuest, // ✅ 추가
        brand,
        keywords,
        images,
        platforms,
        // ... 기타 파라미터
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // 크레딧 부족/월간 제한 에러 처리
      if (response.status === 403) {
        alert(data.message);
        if (data.redirect) {
          window.location.href = data.redirect;
        }
        return;
      }
    }
    
    // ✅ 크레딧 정보 업데이트
    if (data.credits && data.credits.deducted) {
      currentUser.credits = data.credits.remaining;
      updateUI();
      
      // 크레딧 차감 알림
      showNotification(
        `콘텐츠 생성 완료! (크레딧 ${data.credits.amount} 사용, 남은 크레딧: ${data.credits.remaining})`
      );
    }
    
    // 콘텐츠 표시
    displayGeneratedContent(data.data);
  } catch (error) {
    console.error('콘텐츠 생성 실패:', error);
    alert('콘텐츠 생성 중 오류가 발생했습니다.');
  }
}
```

---

## 📊 **수정 전후 비교**

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| 구글 로그인 | ✅ 프론트엔드에서 처리 | ✅ 유지 (정상) |
| /api/auth/me | ❌ 더미 응답 | ✅ 실제 토큰 검증 |
| user_id 파라미터 | ❌ 없음 | ✅ 추가 |
| 크레딧 체크 | ❌ 없음 | ✅ 추가 |
| 월간 사용량 체크 | ❌ 없음 | ✅ checkAndUseMonthlyQuota 호출 |
| 크레딧 차감 | ❌ 없음 | ✅ 추가 |
| 비회원 제한 | ❌ 없음 | ✅ IP 기반 1회 제한 |
| 사용 내역 기록 | ❌ 없음 | ✅ credit_transactions 추가 |

---

## 🚨 **우선순위**

### **Critical (즉시 수정 필요):**
1. ❌ `/api/generate`에 크레딧 차감 로직 추가 (1-2시간)
   - user_id 파라미터 추가
   - checkAndUseMonthlyQuota 호출
   - 크레딧 차감 및 트랜잭션 기록

2. ❌ 프론트엔드에서 user_id 전달 (30분)
   - generateContent() 함수 수정

### **High (24시간 내):**
3. ⚠️ `/api/auth/me` 실제 토큰 검증 (30분)
   - Supabase Auth 연동

### **Medium (1주일 내):**
4. ⏳ 비회원 체험 제한 구현 (1시간)
   - trial_usage 테이블 연동

---

## 📝 **다음 단계**

### **즉시 수정 (1-2시간):**
```bash
# 1. /api/generate 크레딧 차감 로직 추가
# 2. 프론트엔드 user_id 전달
# 3. 빌드 및 테스트
npm run build
pm2 restart webapp

# 4. 테스트
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-user","brand":"테스트",...}'
```

### **검증 항목:**
- [ ] 크레딧 부족 시 거부 확인
- [ ] 월 10회 제한 작동 확인
- [ ] 크레딧 차감 확인
- [ ] credit_transactions 기록 확인
- [ ] 비회원 1회 제한 확인

---

## 🎯 **결론**

### **Issue #1: 구글 로그인**
- ✅ **정상**: 프론트엔드에서 Supabase Auth 사용
- ⚠️ **개선 필요**: `/api/auth/me` 더미 응답 수정

### **Issue #2: 크레딧 차감**
- 🚨 **Critical**: 완전히 누락됨
- 🚨 **무제한 무료 사용 가능**
- 🚨 **즉시 수정 필요**

### **예상 수정 시간:**
- 크레딧 차감 로직: 1-2시간
- 프론트엔드 수정: 30분
- 테스트 및 검증: 1시간
- **총 2-3시간**

---

**작성일:** 2026-01-02  
**작성자:** Claude Code Assistant  
**심각도:** 🚨 Critical  
**즉시 조치 필요**
