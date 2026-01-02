# 🔍 현재 이슈 분석 및 해결 방안

**작성일:** 2026-01-02  
**버전:** v7.7.0  
**우선순위:** Critical

---

## 📋 **발견된 3가지 주요 이슈**

### 🔴 **이슈 1: 구글 로그인 연동 실패**

**현상:**
- 로그인 버튼 클릭 시 반응 없음 또는 OAuth 리디렉트 실패

**원인 분석:**
1. ✅ **코드는 정상**: `app-v3-final.js` Line 4080-4109에 Supabase OAuth 코드 존재
2. ✅ **SUPABASE_ANON_KEY 하드코딩**: Line 3801에 실제 키 입력됨
3. ❌ **Supabase OAuth 설정 미완료**:
   - Supabase Dashboard → Authentication → URL Configuration
   - **Site URL**: 미설정 (프로덕션 URL 필요)
   - **Redirect URLs**: 미설정
4. ❌ **Google Cloud OAuth Client ID 미생성**:
   - Supabase에서 Google Provider 활성화 필요
   - Google Cloud Console에서 OAuth 2.0 Client ID 생성 필요

**✅ 결론: 배포 전이라 테스트 불가능 → 정상**

**해결 방법:**
```bash
# 1단계: Cloudflare Pages 배포 (프로덕션 URL 확보)
npm run deploy:prod

# 2단계: Supabase Dashboard 설정
# - Settings → API → Site URL: https://webapp.pages.dev
# - Authentication → URL Configuration
#   - Site URL: https://webapp.pages.dev
#   - Redirect URLs: https://webapp.pages.dev/**

# 3단계: Google Cloud Console 설정
# - APIs & Services → Credentials
# - Create OAuth 2.0 Client ID
# - Authorized redirect URIs: https://gmjbsndricdogtqsovnb.supabase.co/auth/v1/callback

# 4단계: Supabase에 Google OAuth 연결
# - Authentication → Providers → Google
# - Client ID, Client Secret 입력
```

---

### 🔴 **이슈 2: 콘텐츠 생성 비용이 원화로 표시됨**

**현상:**
- "예상 비용" 섹션에 `$0.07 / ₩91` 형식으로 표시
- 크레딧 차감 시스템으로 변경되었는데 여전히 원화 표시

**코드 위치:**
- `app-v3-final.js` Line 1192-1231: `updateCostEstimate()` 함수

**현재 로직:**
```javascript
// Line 1183-1184
const totalCostUSD = imageCost + platformCost;
const totalCostKRW = Math.round(totalCostUSD * EXCHANGE_RATE);

// Line 1211-1217
💵 총 예상 비용: $${totalCostUSD.toFixed(2)}
💴 총 예상 비용: ₩${totalCostKRW.toLocaleString()}
```

**문제점:**
1. 크레딧 정책 v2.0으로 변경됨 (1회 생성 = 1크레딧 차감)
2. 원가 ₩100/회 → 사용자에게는 **크레딧 1개 소비**로 표시해야 함
3. 무료 회원: 월 10회 무료, 크레딧으로 추가 사용 가능
4. 유료 회원: 크레딧만 소비

**✅ 수정 필요:**
```javascript
// NEW 로직:
// - 무료 회원: "월 10회 무료 중 X회 남음, 초과 시 1크레딧 차감"
// - 유료 회원: "1크레딧 차감"
// - 비회원: "체험 1회 사용"
```

---

### 🔴 **이슈 3: 네트워크 오류 발생**

**현상 (스크린샷 분석):**
```
오류 발생
⚠️ 제목 원인:
• 네트워크 오류가 발생했습니다
• VPN을 종료한 뒤 재시도하세요
• 네트워크를 사용 가능한 상태로 변경하세요
• 콘텐츠가 차단된 경우 제외 목록에 도메인을 추가하세요
• 문제가 지속되면 시스템 관리자에게 문의하세요

버튼: [닫기] [재시도]
```

**원인 분석:**

#### **가능성 1: 백엔드 API 키 누락 (가장 유력)**
```javascript
// src/index.tsx에서 환경 변수 체크
const apiKey = c.env.OPENAI_API_KEY; // ← 이게 없으면 오류

if (!apiKey) {
  return c.json({ error: 'OpenAI API 키가 설정되지 않았습니다.' }, 500)
}
```

**증거:**
- `.dev.vars` 파일: `OPENAI_API_KEY=your-openai-api-key-here` (플레이스홀더)
- 실제 API 호출 시 500 에러 발생 → 프론트엔드에서 네트워크 오류로 해석

#### **가능성 2: CORS 에러**
```typescript
// src/index.tsx Line 13
app.use('/api/*', cors())
```
- CORS 설정은 있으나, 로컬 개발 환경에서는 정상 작동
- 프로덕션 배포 후 Origin 불일치 가능성

#### **가능성 3: Supabase RPC 함수 미구현**
```javascript
// 프론트엔드에서 호출하는 RPC:
- grant_milestone_credit()
- update_consecutive_login()
- check_and_use_monthly_quota()

// 백엔드 src/index.tsx에서는 호출 코드만 있고 실제 구현 안 됨
// → Supabase에서 함수를 직접 생성해야 함
```

**✅ 해결 우선순위:**
1. **환경 변수 설정** (Critical): API 키 입력
2. **Supabase RPC 함수 생성** (High): SQL 스크립트 실행
3. **CORS 설정 확인** (Medium): 프로덕션 배포 후

---

## 🔧 **Supabase 스키마 vs 코드 충돌 여부**

### ✅ **충돌 없음 (v7.4.0에서 이미 해결)**

**검증 완료 항목:**

#### 1. **컬럼명 일치**
| 프론트엔드 (app-v3-final.js) | 백엔드 (src/index.tsx) | Supabase 스키마 |
|-------------------------------|------------------------|----------------|
| `monthly_free_usage_count` | `monthly_free_usage_count` | ✅ `monthly_free_usage_count` |
| `consecutive_login_days` | `consecutive_login_days` | ✅ `consecutive_login_days` |
| `monthly_usage_reset_date` | `monthly_usage_reset_date` | ✅ `monthly_usage_reset_date` |
| `onboarding_completed` | `onboarding_completed` | ✅ `onboarding_completed` |
| `first_generation_completed` | `first_generation_completed` | ✅ `first_generation_completed` |

#### 2. **RPC 함수 매핑**
| 백엔드 호출 | Supabase 함수 | 상태 |
|-------------|--------------|------|
| `grantMilestoneCredit()` | `grant_milestone_credit(user_id, milestone_type)` | ⚠️ **함수 생성 필요** |
| `updateConsecutiveLogin()` | `update_consecutive_login(user_id)` | ⚠️ **함수 생성 필요** |
| `checkAndUseMonthlyQuota()` | `check_and_use_monthly_quota(user_id)` | ⚠️ **함수 생성 필요** |

**SQL 스크립트 위치:**
- `SUPABASE_SYNC_ANALYSIS.md` 또는 이전 대화 기록에 있음
- 실행 필요: Supabase Dashboard → SQL Editor

---

## 🎯 **즉시 수정 필요 항목 (우선순위)**

### 🔴 **Priority 1: 크레딧 차감 UI 수정 (30분)**

**목표:** "예상 비용 ₩100" → "1크레딧 차감"

**수정 파일:** `public/static/app-v3-final.js`
- Line 1192-1231: `updateCostEstimate()` 함수 전체 수정

**새로운 로직:**
```javascript
function updateCostEstimate() {
  // 사용자 상태에 따라 표시
  if (currentUser.isGuest) {
    // 비회원: 체험 1회 사용
    display("🎁 무료 체험 1회 사용 가능");
  } else if (currentUser.tier === 'free') {
    // 무료 회원: 월 10회 무료, 이후 크레딧
    if (currentUser.monthly_remaining > 0) {
      display(`🎉 무료 사용 가능 (월 ${currentUser.monthly_remaining}회 남음)`);
    } else {
      display(`💳 1크레딧 차감 (현재 ${currentUser.credits}크레딧 보유)`);
    }
  } else {
    // 유료 회원: 크레딧만
    display(`💳 1크레딧 차감 (현재 ${currentUser.credits}크레딧 보유)`);
  }
}
```

---

### 🟠 **Priority 2: 환경 변수 설정 (10분)**

**방법 1: 로컬 개발 (.dev.vars 파일)**
```bash
cd /home/user/webapp
cat > .dev.vars << 'EOF'
SUPABASE_URL=https://gmjbsndricdogtqsovnb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=실제-service-키
OPENAI_API_KEY=실제-openai-키
GEMINI_API_KEY=실제-gemini-키
EOF

npm run build
pm2 restart webapp
```

**방법 2: 프로덕션 배포 (Cloudflare Secrets)**
```bash
wrangler pages secret put SUPABASE_ANON_KEY
wrangler pages secret put SUPABASE_SERVICE_KEY
wrangler pages secret put OPENAI_API_KEY
wrangler pages secret put GEMINI_API_KEY
```

---

### 🟡 **Priority 3: Supabase RPC 함수 생성 (20분)**

**실행 위치:** Supabase Dashboard → SQL Editor

**필요한 함수:**
1. `grant_milestone_credit(user_id_param UUID, milestone_type TEXT)`
2. `update_consecutive_login(user_id_param UUID)`
3. `check_and_use_monthly_quota(user_id_param UUID)`

**SQL 스크립트:**
```sql
-- 1. 마일스톤 크레딧 지급
CREATE OR REPLACE FUNCTION grant_milestone_credit(
  user_id_param UUID,
  milestone_type TEXT
) RETURNS JSON AS $$
DECLARE
  current_credits INTEGER;
  new_credits INTEGER;
  reward_amount INTEGER := 5;
BEGIN
  -- 중복 지급 방지 (users 테이블 BOOLEAN 컬럼 체크)
  IF milestone_type = 'onboarding_completed' THEN
    UPDATE users SET onboarding_completed = true, credits = credits + reward_amount
    WHERE id = user_id_param AND onboarding_completed = false
    RETURNING credits INTO new_credits;
  ELSIF milestone_type = 'first_generation_completed' THEN
    UPDATE users SET first_generation_completed = true, credits = credits + reward_amount
    WHERE id = user_id_param AND first_generation_completed = false
    RETURNING credits INTO new_credits;
  END IF;
  
  RETURN json_build_object('success', true, 'new_credits', new_credits);
END;
$$ LANGUAGE plpgsql;

-- 2. 연속 로그인 업데이트
CREATE OR REPLACE FUNCTION update_consecutive_login(
  user_id_param UUID
) RETURNS JSON AS $$
DECLARE
  last_login DATE;
  current_streak INTEGER;
  new_streak INTEGER;
  today DATE := CURRENT_DATE;
  streak_reward_eligible BOOLEAN := false;
BEGIN
  SELECT last_login_date, consecutive_login_days INTO last_login, current_streak
  FROM users WHERE id = user_id_param;
  
  IF last_login IS NULL OR last_login < today - INTERVAL '1 day' THEN
    -- 연속 끊김
    new_streak := 1;
  ELSIF last_login = today - INTERVAL '1 day' THEN
    -- 연속 유지
    new_streak := current_streak + 1;
    IF new_streak >= 3 THEN
      streak_reward_eligible := true;
    END IF;
  ELSE
    -- 오늘 이미 로그인함
    new_streak := current_streak;
  END IF;
  
  UPDATE users SET last_login_date = today, consecutive_login_days = new_streak
  WHERE id = user_id_param;
  
  RETURN json_build_object(
    'consecutive_days', new_streak,
    'streak_reward_eligible', streak_reward_eligible
  );
END;
$$ LANGUAGE plpgsql;

-- 3. 월간 무료 쿼터 체크
CREATE OR REPLACE FUNCTION check_and_use_monthly_quota(
  user_id_param UUID
) RETURNS JSON AS $$
DECLARE
  current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
  user_record RECORD;
  available BOOLEAN;
  remaining INTEGER;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = user_id_param;
  
  -- 월 리셋 체크
  IF user_record.monthly_usage_reset_date IS NULL OR 
     DATE_TRUNC('month', user_record.monthly_usage_reset_date) < current_month THEN
    -- 새 달 시작: 리셋
    UPDATE users SET 
      monthly_free_usage_count = 0,
      monthly_usage_reset_date = CURRENT_DATE
    WHERE id = user_id_param
    RETURNING * INTO user_record;
  END IF;
  
  -- 사용 가능 여부 체크
  IF user_record.monthly_free_usage_count < 10 THEN
    -- 무료 횟수 사용
    UPDATE users SET monthly_free_usage_count = monthly_free_usage_count + 1
    WHERE id = user_id_param;
    
    available := true;
    remaining := 10 - user_record.monthly_free_usage_count - 1;
  ELSE
    -- 무료 횟수 소진, 크레딧 필요
    available := user_record.credits > 0;
    remaining := 0;
  END IF;
  
  RETURN json_build_object(
    'available', available,
    'remaining', remaining
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 📝 **다음 단계 요약**

### **지금 즉시 (API 키 없이도 가능)**
1. ✅ 크레딧 차감 UI 수정 (`updateCostEstimate()` 함수)
2. ✅ Supabase RPC 함수 생성 (SQL 스크립트 실행)

### **API 키 입력 후**
3. 환경 변수 설정 (`.dev.vars`)
4. 로컬 테스트
   - 비회원 체험 1회
   - 무료 회원 월 10회
   - 크레딧 차감 로직
5. 프로덕션 배포
   - Cloudflare Pages Secrets 설정
   - Supabase OAuth 설정
   - Google OAuth 설정

---

**작성자:** Claude Code Assistant  
**최종 수정:** 2026-01-02 04:00  
**상태:** 분석 완료, 수정 준비됨
