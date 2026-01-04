# 🔄 하루한포 시스템 단순화 계획 (Phase B)

## 📋 목표
- 크레딧/래퍼럴 시스템 제거
- 단순 구독 모델로 전환 (Free/Pro/Enterprise)
- 백엔드 안정성 확보
- MVP 코어 기능에 집중

## 💰 원가 분석 기반 플랜 책정

**1회 생성당 원가**: ₩8.06 (Gemini 기준, 보정 포함)

**최종 플랜**:
- **Free**: 월 5회 무료 (원가 ₩40, 홍보비로 감내)
- **Pro**: 월 50회 ₩9,900 (마진 96%)
- **Enterprise**: 월 300회 ₩49,900 (마진 95%)

**핵심 개선**:
- GPT-4o → Gemini 키워드 추천 (원가 78% 절감)
- Enterprise 무제한 → 300회 한도 (리스크 제거)

📊 **상세 원가 분석**: `COST_ANALYSIS.md` 참고

---

## 1️⃣ Supabase 데이터베이스 작업

### 1.1 기존 테이블 백업 (선택사항)
```sql
-- 기존 데이터 백업 (필요 시)
CREATE TABLE credit_transactions_backup AS SELECT * FROM credit_transactions;
CREATE TABLE referrals_backup AS SELECT * FROM referrals;
```

### 1.2 users 테이블 단순화
```sql
-- 1. 기존 users 테이블 구조 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. 불필요한 컬럼 제거 (크레딧 관련)
ALTER TABLE users DROP COLUMN IF EXISTS credits CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS referral_code CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS referred_by CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS consecutive_login_days CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_date CASCADE;

-- 3. 구독 모델 컬럼 단순화
-- subscription_status 컬럼이 없으면 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';

-- 4. 구독 만료일 추가 (Pro/Enterprise용)
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 5. 월간 사용량 추적 (Free 플랜 5회 제한용)
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_usage_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_usage_reset_date DATE DEFAULT CURRENT_DATE;

-- 6. 최종 users 테이블 구조 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
```

### 1.3 불필요한 테이블 제거 또는 사용 중지
```sql
-- Option A: 테이블 완전 삭제 (백업 후)
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;

-- Option B: 테이블 유지하되 사용 중지 (추후 재도입 대비)
-- (테이블은 그대로 두고 코드에서만 제거)
```

### 1.4 트리거 및 함수 제거
```sql
-- 1. 기존 트리거 목록 확인
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 2. 크레딧 관련 트리거 삭제
DROP TRIGGER IF EXISTS award_signup_credits ON users;
DROP TRIGGER IF EXISTS update_consecutive_login ON users;

-- 3. 관련 함수 삭제
DROP FUNCTION IF EXISTS award_signup_credits() CASCADE;
DROP FUNCTION IF EXISTS update_consecutive_login() CASCADE;
DROP FUNCTION IF EXISTS handle_referral_reward() CASCADE;

-- 4. 남은 트리거 확인
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### 1.5 RLS (Row Level Security) 정책 단순화
```sql
-- 1. 기존 RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';

-- 2. users 테이블 RLS 정책 재설정
-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;

-- 새로운 단순 정책 적용
-- 2.1 본인 데이터만 조회 가능
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2.2 본인 데이터만 수정 가능 (특정 컬럼만)
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. generations 테이블 RLS 정책 (콘텐츠 생성 이력)
DROP POLICY IF EXISTS "Users can view own generations" ON generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON generations;

CREATE POLICY "Users can view own generations"
ON generations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
ON generations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. 최종 RLS 정책 확인
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 1.6 구독 모델 초기 데이터 설정
```sql
-- 기존 사용자 모두 'free' 플랜으로 초기화
UPDATE users 
SET subscription_status = 'free',
    monthly_usage_count = 0,
    monthly_usage_reset_date = CURRENT_DATE,
    subscription_expires_at = NULL;

-- 확인
SELECT id, email, subscription_status, monthly_usage_count, monthly_usage_reset_date
FROM users
LIMIT 10;
```

### 1.7 월간 사용량 리셋 함수 (Free 플랜용)
```sql
-- 매월 1일 자동 리셋 함수
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET monthly_usage_count = 0,
      monthly_usage_reset_date = CURRENT_DATE
  WHERE monthly_usage_reset_date < DATE_TRUNC('month', CURRENT_DATE);
END;
$$;

-- 수동 실행 테스트
SELECT reset_monthly_usage();

-- (선택) Supabase Edge Function으로 매일 자동 실행하거나
-- 백엔드 코드에서 요청마다 체크
```

---

## 2️⃣ 백엔드 코드 수정 (src/index.tsx)

### 2.1 사용자 동기화 API 단순화
```typescript
// src/index.tsx

// ========================================
// 사용자 동기화 엔드포인트 (단순화 버전)
// ========================================
app.post('/api/auth/sync', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, email, name } = body;
    
    if (!user_id || !email) {
      return c.json({ error: 'user_id와 email은 필수입니다' }, 400);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 사용자 조회 또는 생성 (UPSERT)
    const { data: user, error } = await supabase
      .from('users')
      .upsert(
        {
          id: user_id,
          email,
          name: name || null,
          subscription_status: 'free', // 신규 사용자는 무료 플랜
          monthly_usage_count: 0,
          monthly_usage_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'id',
          ignoreDuplicates: false 
        }
      )
      .select()
      .single();
    
    if (error) {
      console.error('Supabase upsert 실패:', error);
      return c.json({ error: '사용자 동기화 실패', details: error.message }, 500);
    }
    
    // 월간 사용량 리셋 체크
    const today = new Date().toISOString().split('T')[0];
    if (user.monthly_usage_reset_date < today.substring(0, 7) + '-01') {
      await supabase
        .from('users')
        .update({ 
          monthly_usage_count: 0,
          monthly_usage_reset_date: today
        })
        .eq('id', user_id);
      
      user.monthly_usage_count = 0;
      user.monthly_usage_reset_date = today;
    }
    
    return c.json({
      success: true,
      user_id: user.id,
      email: user.email,
      name: user.name,
      subscription_status: user.subscription_status,
      subscription_expires_at: user.subscription_expires_at,
      monthly_usage_count: user.monthly_usage_count,
      monthly_limit: user.subscription_status === 'free' ? 5 : (user.subscription_status === 'pro' ? 50 : 300),
      monthly_remaining: user.subscription_status === 'free' 
        ? Math.max(0, 5 - user.monthly_usage_count)
        : user.subscription_status === 'pro'
        ? Math.max(0, 50 - user.monthly_usage_count)
        : Math.max(0, 300 - user.monthly_usage_count),
      message: '로그인 성공'
    });
  } catch (error: any) {
    console.error('사용자 동기화 에러:', error);
    return c.json({ 
      error: '사용자 동기화 중 오류가 발생했습니다', 
      details: error.message 
    }, 500);
  }
});
```

### 2.2 콘텐츠 생성 API - 사용량 체크 로직 단순화
```typescript
// src/index.tsx

app.post('/api/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, is_guest, platforms, /* ... 기타 파라미터 */ } = body;
    
    // 게스트 사용자 차단 (선택사항)
    if (is_guest || !user_id) {
      return c.json({ 
        error: '로그인이 필요합니다',
        code: 'LOGIN_REQUIRED' 
      }, 401);
    }
    
    const supabase = createSupabaseAdmin(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_KEY
    );
    
    // 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();
    
    if (userError || !user) {
      return c.json({ error: '사용자를 찾을 수 없습니다' }, 404);
    }
    
    // 월간 사용량 리셋 체크
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7) + '-01';
    if (user.monthly_usage_reset_date < currentMonth) {
      await supabase
        .from('users')
        .update({ 
          monthly_usage_count: 0,
          monthly_usage_reset_date: today
        })
        .eq('id', user_id);
      
      user.monthly_usage_count = 0;
    }
    
    // 사용량 제한 체크
    const limits = {
      free: 5,
      pro: 50,
      enterprise: 300
    };
    
    const userLimit = limits[user.subscription_status] || 5;
    
    if (user.monthly_usage_count >= userLimit) {
      return c.json({ 
        error: `이번 달 ${user.subscription_status.toUpperCase()} 플랜 생성 횟수를 모두 사용했습니다`,
        code: 'MONTHLY_LIMIT_EXCEEDED',
        monthly_usage_count: user.monthly_usage_count,
        monthly_limit: userLimit
      }, 403);
    }
    
    // Pro/Enterprise 플랜 만료 체크
    if (user.subscription_status === 'pro' || user.subscription_status === 'enterprise') {
      if (user.subscription_expires_at && new Date(user.subscription_expires_at) < new Date()) {
        // 만료된 경우 자동으로 Free로 다운그레이드
        await supabase
          .from('users')
          .update({ 
            subscription_status: 'free',
            subscription_expires_at: null
          })
          .eq('id', user_id);
        
        return c.json({ 
          error: '구독이 만료되었습니다. 무료 플랜으로 전환되었습니다.',
          code: 'SUBSCRIPTION_EXPIRED'
        }, 403);
      }
    }
    
    // === 콘텐츠 생성 로직 (기존 코드 유지) ===
    // ... (AI 모델 호출, 이미지 분석 등)
    
    // 생성 성공 후 사용량 증가
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        monthly_usage_count: user.monthly_usage_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);
    
    if (updateError) {
      console.error('사용량 업데이트 실패:', updateError);
    }
    
    return c.json({
      success: true,
      results: generatedResults,
      usage: {
        monthly_usage_count: user.monthly_usage_count + 1,
        monthly_limit: user.subscription_status === 'free' ? 5 : (user.subscription_status === 'pro' ? 50 : 300),
        monthly_remaining: user.subscription_status === 'free' 
          ? Math.max(0, 5 - user.monthly_usage_count - 1)
          : user.subscription_status === 'pro'
          ? Math.max(0, 50 - user.monthly_usage_count - 1)
          : Math.max(0, 300 - user.monthly_usage_count - 1)
      }
    });
    
  } catch (error: any) {
    console.error('콘텐츠 생성 에러:', error);
    return c.json({ error: '콘텐츠 생성 실패', details: error.message }, 500);
  }
});
```

### 2.3 제거할 엔드포인트
```typescript
// 다음 엔드포인트들을 제거하거나 주석 처리:

// ❌ 제거: 크레딧 충전
// app.post('/api/credits/charge', ...)

// ❌ 제거: 래퍼럴 코드 생성
// app.post('/api/referral/generate', ...)

// ❌ 제거: 래퍼럴 보상 지급
// app.post('/api/rewards/claim', ...)

// ❌ 제거: 연속 로그인 보상
// function updateConsecutiveLogin() { ... }
```

---

## 3️⃣ 프론트엔드 코드 수정 (public/static/app-v3-final.js)

### 3.1 currentUser 객체 단순화
```javascript
// 전역 사용자 상태 (단순화)
let currentUser = {
  isLoggedIn: false,
  isGuest: true,
  id: null,
  name: null,
  email: null,
  subscription_status: 'free', // 'free' | 'pro' | 'enterprise'
  subscription_expires_at: null,
  monthly_usage_count: 0,
  monthly_limit: 10,
  monthly_remaining: 10
};
```

### 3.2 syncUserToBackend 함수 수정
```javascript
async function syncUserToBackend(session, isNewUser = false) {
  try {
    console.log('🚀 syncUserToBackend 시작');
    
    const response = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        user_id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata.full_name || session.user.email
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 사용자 동기화 성공:', data);
      
      // 사용자 정보 업데이트 (단순화)
      currentUser.subscription_status = data.subscription_status || 'free';
      currentUser.subscription_expires_at = data.subscription_expires_at;
      currentUser.monthly_usage_count = data.monthly_usage_count || 0;
      currentUser.monthly_limit = data.monthly_limit || 10;
      currentUser.monthly_remaining = data.monthly_remaining || 10;
      
      localStorage.setItem('postflow_user', JSON.stringify(currentUser));
      updateAuthUI();
      
      // 환영 메시지
      if (isNewUser) {
        showWelcomeMessage('signup');
      } else {
        showWelcomeMessage('login');
      }
    } else {
      const errorData = await response.json().catch(() => ({ error: '응답 파싱 실패' }));
      console.error('❌ 사용자 동기화 실패:', errorData);
      alert('로그인 처리 중 오류가 발생했습니다.');
    }
  } catch (error) {
    console.error('❌ 사용자 동기화 에러:', error);
    alert('네트워크 오류가 발생했습니다.');
  }
}
```

### 3.3 UI 업데이트 함수 수정
```javascript
function updateAuthUI() {
  const userInfoArea = document.getElementById('userInfoArea');
  const guestArea = document.getElementById('guestArea');
  
  if (currentUser.isLoggedIn && !currentUser.isGuest) {
    // 로그인 상태
    guestArea.style.display = 'none';
    userInfoArea.style.display = 'flex';
    
    // 구독 상태 표시
    let tierLabel = '';
    let tierColor = '';
    
    switch (currentUser.subscription_status) {
      case 'free':
        tierLabel = `무료 (${currentUser.monthly_remaining}/5회 남음)`;
        tierColor = 'text-gray-600';
        break;
      case 'pro':
        tierLabel = `Pro (${currentUser.monthly_remaining}/50회 남음)`;
        tierColor = 'text-blue-600';
        break;
      case 'enterprise':
        tierLabel = `Enterprise (${currentUser.monthly_remaining}/300회 남음)`;
        tierColor = 'text-purple-600';
        break;
    }
    
    document.getElementById('userName').textContent = currentUser.name || '사용자';
    document.getElementById('userTier').textContent = tierLabel;
    document.getElementById('userTier').className = `text-sm ${tierColor}`;
    
    // 크레딧 표시 제거
    const creditDisplay = document.getElementById('userCredits');
    if (creditDisplay) {
      creditDisplay.style.display = 'none';
    }
  } else {
    // 비로그인 상태
    userInfoArea.style.display = 'none';
    guestArea.style.display = 'flex';
  }
}
```

### 3.4 환영 메시지 단순화
```javascript
function showWelcomeMessage(type) {
  const messages = {
    signup: {
      title: '🎉 회원가입 완료!',
      message: `환영합니다, ${currentUser.name}님!<br><br>무료 플랜: <strong>월 5회</strong> 생성 가능<br><br>더 많은 생성이 필요하신가요?<br>Pro 플랜 (월 50회 ₩9,900)을 확인해보세요!`
    },
    login: {
      title: '👋 환영합니다!',
      message: `${currentUser.name}님, 다시 만나서 반가워요!<br><br>남은 생성 횟수: <strong>${currentUser.monthly_remaining}회</strong>`
    }
  };
  
  const msg = messages[type];
  if (msg) {
    showModal(msg.title, msg.message);
  }
}
```

### 3.5 제거할 UI 요소
```javascript
// ❌ 제거: 크레딧 충전 버튼 이벤트 리스너
// document.getElementById('chargeCreditsBtn')?.removeEventListener(...)

// ❌ 제거: 래퍼럴 코드 생성 버튼
// document.getElementById('generateReferralBtn')?.removeEventListener(...)

// ❌ 제거: 연속 로그인 보상 UI
// (해당 DOM 요소 및 이벤트 리스너 제거)
```

---

## 4️⃣ HTML 템플릿 수정 (src/html-template.ts)

### 4.1 사용자 정보 표시 영역 수정
```typescript
// src/html-template.ts

// 기존 코드에서 크레딧 표시 부분 제거
// AS-IS:
// <span id="userCredits" class="text-sm text-gray-600">0 크레딧</span>

// TO-BE: 크레딧 표시 제거, 구독 상태만 표시
<div id="userInfoArea" style="display: none;" class="flex items-center space-x-4">
  <div class="text-right">
    <div id="userName" class="text-sm font-semibold text-gray-800">사용자</div>
    <div id="userTier" class="text-sm text-gray-600">무료 (10/10회 남음)</div>
  </div>
  <button id="logoutBtn" class="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition">
    <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
  </button>
</div>
```

### 4.2 푸터 정보 수정
```typescript
// 래퍼럴 보상 정책 문구 제거
// AS-IS: "추천인과 피추천인 모두 크레딧 보상..."
// TO-BE: 단순화된 플랜 안내

<div class="text-sm text-gray-600 mb-2">
  <strong>📋 플랜 안내</strong><br>
  • Free: 월 5회 무료 생성<br>
  • Pro: 월 50회 (₩9,900/월)<br>
  • Enterprise: 월 300회 (₩49,900/월)<br><br>
  💰 <strong>원가 기반 책정</strong>: 1회당 실제 AI 비용 약 ₩8<br>
  📊 상세 원가 분석: COST_ANALYSIS.md 참고
</div>
```

### 4.3 모달 및 안내 문구 수정
```typescript
// 개인정보 처리방침/서비스 이용약관 모달에서
// 크레딧/래퍼럴 관련 내용 제거
```

---

## 5️⃣ 배포 및 테스트

### 5.1 코드 변경 사항 정리
```bash
# 변경된 파일 목록
- src/index.tsx (백엔드 API 단순화)
- public/static/app-v3-final.js (프론트엔드 로직 단순화)
- src/html-template.ts (UI 요소 수정)
```

### 5.2 빌드 및 배포
```bash
# 1. 빌드
cd /home/user/webapp
npm run build

# 2. Git 커밋
git add -A
git commit -m "refactor: 크레딧/래퍼럴 시스템 제거 및 구독 모델 단순화 (v9.0.0)

- 크레딧 시스템 제거
- 래퍼럴(친구초대) 시스템 제거
- 단순 구독 모델 도입 (Free/Pro/Enterprise)
- 사용자 동기화 API 단순화
- 콘텐츠 생성 사용량 체크 로직 단순화
- UI 크레딧 표시 제거, 구독 상태 표시로 변경

Breaking Changes:
- credit_transactions 테이블 사용 중지
- referrals 테이블 사용 중지
- 관련 트리거 및 함수 제거
- RLS 정책 단순화

Refs: #simplification #v9.0.0"

# 3. 프로덕션 배포
npx wrangler pages deploy dist --project-name haruhanpo-studio --commit-message "v9.0.0 - 시스템 단순화"
```

### 5.3 테스트 체크리스트
```
✅ 1. 회원가입
   - Google 로그인 성공
   - 사용자 정보 정상 표시
   - 초기 플랜: Free
   - 월간 사용량: 0/10

✅ 2. 로그인
   - 기존 사용자 로그인 성공
   - 사용자 정보 정상 표시
   - 구독 상태 정확히 표시

✅ 3. 콘텐츠 생성
   - Free 플랜: 5회까지 생성 가능
   - 5회 초과 시 제한 메시지 표시
   - Pro: 50회까지 생성 가능
   - Enterprise: 300회까지 생성 가능

✅ 4. 월간 사용량 리셋
   - 매월 1일 자동 리셋 확인
   - 또는 다음 생성 시 리셋

✅ 5. UI 확인
   - 크레딧 표시 제거
   - 구독 상태 정확히 표시
   - 남은 생성 횟수 표시 (Free만)

✅ 6. 에러 처리
   - 500 에러 해결 확인
   - 로그인 실패 시 에러 메시지
   - 생성 제한 시 안내 메시지
```

---

## 6️⃣ 주의사항 및 향후 계획

### 주의사항
1. **기존 사용자 데이터**: 
   - 모든 사용자가 Free 플랜으로 초기화됩니다
   - 기존 크레딧 정보는 백업 테이블에만 남습니다

2. **결제 연동**:
   - Pro/Enterprise 구독 결제 시스템은 별도 구현 필요
   - Stripe, 토스페이먼츠 등 결제 게이트웨이 연동 필요

3. **구독 만료 처리**:
   - 백엔드 코드에서 자동 다운그레이드 로직 포함
   - 또는 배치 작업으로 매일 체크

### 향후 재도입 계획
1. **Phase 1 (즉시)**: 시스템 단순화
2. **Phase 2 (1-2주 후)**: 안정화 및 사용자 피드백 수집
3. **Phase 3 (1개월 후)**: 크레딧 시스템 재도입 고려
   - 1크레딧 = 100원
   - 패키지 설계
4. **Phase 4 (2-3개월 후)**: 래퍼럴 시스템 재도입 고려
   - 단순 카운트 방식
   - 마일스톤 보상

---

## 7️⃣ 복사/붙여넣기용 전체 SQL 스크립트

```sql
-- ========================================
-- 하루한포 시스템 단순화 SQL 스크립트
-- ========================================

-- 1. 백업 (선택사항)
CREATE TABLE IF NOT EXISTS credit_transactions_backup AS SELECT * FROM credit_transactions;
CREATE TABLE IF NOT EXISTS referrals_backup AS SELECT * FROM referrals;

-- 2. users 테이블 단순화
ALTER TABLE users DROP COLUMN IF EXISTS credits CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS referral_code CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS referred_by CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS consecutive_login_days CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_date CASCADE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_usage_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_usage_reset_date DATE DEFAULT CURRENT_DATE;

-- 3. 불필요한 테이블 제거
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;

-- 4. 트리거 및 함수 제거
DROP TRIGGER IF EXISTS award_signup_credits ON users;
DROP TRIGGER IF EXISTS update_consecutive_login ON users;
DROP FUNCTION IF EXISTS award_signup_credits() CASCADE;
DROP FUNCTION IF EXISTS update_consecutive_login() CASCADE;
DROP FUNCTION IF EXISTS handle_referral_reward() CASCADE;

-- 5. RLS 정책 재설정
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;

CREATE POLICY "Users can view own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. generations 테이블 RLS (콘텐츠 생성 이력)
DROP POLICY IF EXISTS "Users can view own generations" ON generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON generations;

CREATE POLICY "Users can view own generations"
ON generations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
ON generations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. 기존 사용자 초기화
UPDATE users 
SET subscription_status = 'free',
    monthly_usage_count = 0,
    monthly_usage_reset_date = CURRENT_DATE,
    subscription_expires_at = NULL;

-- 8. 월간 사용량 리셋 함수
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET monthly_usage_count = 0,
      monthly_usage_reset_date = CURRENT_DATE
  WHERE monthly_usage_reset_date < DATE_TRUNC('month', CURRENT_DATE);
END;
$$;

-- 9. 확인 쿼리
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT id, email, subscription_status, monthly_usage_count, monthly_usage_reset_date
FROM users
LIMIT 10;
```

---

## 8️⃣ AI에게 전달할 명령 (복사/붙여넣기용)

```
# 하루한포 시스템 단순화 작업 요청

## 배경
- 크레딧/래퍼럴 시스템의 복잡도로 인한 500 에러 발생
- 백엔드 안정성 확보를 위해 시스템 단순화 필요
- 단순 구독 모델로 전환 (Free/Pro/Enterprise)

## Supabase 작업 요청

### 1. 다음 SQL 스크립트를 Supabase SQL Editor에서 실행해주세요:

[위 7️⃣ 섹션의 전체 SQL 스크립트 복사]

### 2. 실행 후 확인 사항:
- users 테이블 구조 변경 확인
- credit_transactions, referrals 테이블 제거 확인
- RLS 정책 단순화 확인
- 트리거 및 함수 제거 확인

### 3. 에러 발생 시:
- 에러 메시지 전체를 복사해서 공유해주세요
- 특히 foreign key constraint 관련 에러는 CASCADE 옵션 확인

## 백엔드 코드 작업

위 2️⃣ 섹션의 코드를 src/index.tsx에 적용해주세요:
- /api/auth/sync 엔드포인트 단순화
- /api/generate 엔드포인트 사용량 체크 로직 단순화
- 불필요한 엔드포인트 제거

## 프론트엔드 코드 작업

위 3️⃣ 섹션의 코드를 public/static/app-v3-final.js에 적용해주세요:
- currentUser 객체 단순화
- syncUserToBackend 함수 수정
- updateAuthUI 함수 수정
- 불필요한 UI 요소 제거

## HTML 템플릿 작업

위 4️⃣ 섹션의 코드를 src/html-template.ts에 적용해주세요:
- 사용자 정보 표시 영역 수정 (크레딧 제거)
- 푸터 정보 수정
- 모달 문구 수정

## 배포 및 테스트

위 5️⃣ 섹션의 순서대로:
1. 빌드
2. Git 커밋
3. 프로덕션 배포
4. 테스트 체크리스트 확인

## 기대 결과
- 500 에러 해결
- 안정적인 로그인/회원가입
- 단순한 구독 모델 작동
- Free 플랜: 월 10회 제한 정상 작동
```

---

## 완료! 🎉

위 내용을 복사해서 다른 AI에게 전달하시면 됩니다.
Supabase SQL Editor에서 SQL 스크립트를 실행하고, 코드 변경 후 배포하면 시스템 단순화가 완료됩니다!
