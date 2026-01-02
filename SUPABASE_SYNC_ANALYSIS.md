# 수파베이스 작업 vs 코드 충돌 분석

## 📊 **비교 요약**

### ✅ **완벽히 일치하는 부분**

| 항목 | 수파베이스 구현 | 코드 구현 | 상태 |
|------|----------------|-----------|------|
| 신규 가입 크레딧 | 5크레딧 | 5크레딧 | ✅ 일치 |
| 월별 사용량 추적 | `monthly_usage` | `monthly_usage` | ✅ 일치 |
| 월별 제한 | `monthly_limit: 10` | `monthly_limit: 10` | ✅ 일치 |
| 연속 로그인 추적 | `login_streak` | `login_streak` | ✅ 일치 |
| 보상 타입 | `user_rewards` 테이블 | API 엔드포인트 | ✅ 일치 |

---

## 🔴 **발견된 충돌 및 불일치**

### 1. **users 테이블 컬럼 불일치**

#### 수파베이스에 추가된 컬럼 (실제 DB):
```sql
- onboarding_completed (BOOLEAN)
- first_generation_completed (BOOLEAN)
- consecutive_login_days (INTEGER) -- 주의: 수파베이스에서는 이 이름 사용
- last_login_date (DATE)
- monthly_free_usage_count (INTEGER)
- monthly_usage_reset_date (DATE)
```

#### 코드 스키마 (supabase-credit-policy-v2.sql):
```sql
- monthly_usage (INTEGER)
- monthly_limit (INTEGER)
- current_month (TEXT)
- last_login_date (DATE)
- login_streak (INTEGER) -- 주의: 코드에서는 이 이름 사용
```

**⚠️ 충돌:**
- `consecutive_login_days` vs `login_streak` → **이름 불일치**
- `monthly_free_usage_count` vs `monthly_usage` → **이름 불일치**
- `monthly_usage_reset_date` vs `current_month` → **목적은 같으나 형식 다름**

---

### 2. **보상 추적 방식 불일치**

#### 수파베이스 실제 구현:
```sql
-- users 테이블에 직접 추가
- onboarding_completed (BOOLEAN)
- first_generation_completed (BOOLEAN)
```

#### 코드 스키마:
```sql
-- 별도 테이블로 관리
CREATE TABLE user_rewards (
  user_id UUID,
  reward_type TEXT,
  UNIQUE(user_id, reward_type)
);
```

**⚠️ 충돌:**
- 수파베이스: `users` 테이블에 BOOLEAN 컬럼
- 코드: `user_rewards` 별도 테이블
- **해결 필요: 둘 중 하나로 통일 필요**

---

### 3. **함수명 불일치**

#### 수파베이스 실제 함수:
```sql
- check_and_use_monthly_quota(user_id_param UUID)
- grant_milestone_credit(user_id_param, milestone_type)
- update_consecutive_login(user_id_param)
- grant_referral_reward(p_referral_id UUID)
```

#### 코드 스키마 함수:
```sql
- reset_monthly_usage()
- claim_reward(p_user_id, p_reward_type)
- check_and_update_login_streak(p_user_id)
- increment_monthly_usage(p_user_id)
```

**⚠️ 충돌:**
- 함수 이름이 완전히 다름
- 파라미터 이름 불일치
- **백엔드에서 어떤 함수를 호출해야 할지 혼란**

---

### 4. **referrals 테이블 구조 불일치**

#### 수파베이스 실제:
```sql
CREATE TABLE referrals (
  referrer_id UUID,
  referred_user_id UUID,
  reward_granted BOOLEAN,
  UNIQUE (referrer_id, referred_user_id)
);
```

#### 코드 예상 (CREDIT_POLICY_V2.md):
```
친구 초대: 5크레딧
조건: 초대받은 친구가 첫 콘텐츠 생성 완료 시에만 지급
```

**⚠️ 충돌:**
- 수파베이스: `reward_granted` 단순 BOOLEAN
- 정책: "첫 콘텐츠 생성 완료 시" 조건 필요
- **로직 추가 필요**

---

## 🔧 **해결 방안**

### **Option A: 수파베이스 스키마에 맞추기 (권장)**
- 장점: DB 수정 불필요, 빠른 구현
- 단점: 코드 수정 필요

### **Option B: 코드 스키마로 수파베이스 수정**
- 장점: 더 나은 설계 (별도 테이블)
- 단점: DB 재작업 필요, 시간 소요

---

## 📋 **Option A 구현 계획 (권장)**

### **1단계: 백엔드 코드 수정 (src/index.tsx)**

#### 수정 전:
```typescript
// /api/auth/sync
return c.json({
  monthly_usage: 0,
  monthly_limit: 10,
  current_month: currentMonth,
  login_streak: 1
});
```

#### 수정 후:
```typescript
// /api/auth/sync
return c.json({
  monthly_free_usage_count: 0, // ✅ 수파베이스 컬럼명
  monthly_limit: 10,
  monthly_usage_reset_date: now, // ✅ DATE 타입
  consecutive_login_days: 1 // ✅ 수파베이스 컬럼명
});
```

---

### **2단계: 함수 호출 수정**

#### 수파베이스 함수 호출:
```typescript
// 월간 사용량 체크
const { data, error } = await supabase.rpc('check_and_use_monthly_quota', {
  user_id_param: user_id
});

// 보상 지급
await supabase.rpc('grant_milestone_credit', {
  user_id_param: user_id,
  milestone_type: 'first_generation_completed'
});

// 연속 로그인 업데이트
await supabase.rpc('update_consecutive_login', {
  user_id_param: user_id
});

// 친구 초대 보상
await supabase.rpc('grant_referral_reward', {
  p_referral_id: referral_id
});
```

---

### **3단계: 프론트엔드 변수명 수정 (app-v3-final.js)**

#### 수정 전:
```javascript
currentUser = {
  monthly_usage: 0,
  login_streak: 0
}
```

#### 수정 후:
```javascript
currentUser = {
  monthly_free_usage_count: 0, // ✅ 수파베이스 컬럼명
  consecutive_login_days: 0 // ✅ 수파베이스 컬럼명
}
```

---

### **4단계: 보상 추적 방식 변경**

#### users 테이블 BOOLEAN 컬럼 활용:
```typescript
// 온보딩 완료 체크
const { data: user } = await supabase
  .from('users')
  .select('onboarding_completed')
  .eq('id', user_id)
  .single();

if (!user.onboarding_completed) {
  // 보상 지급
  await supabase.rpc('grant_milestone_credit', {
    user_id_param: user_id,
    milestone_type: 'onboarding_completed'
  });
}
```

---

## 🚨 **긴급 수정 필요 항목**

### **1. 컬럼명 불일치 (High Priority)**
- [x] `login_streak` → `consecutive_login_days`
- [x] `monthly_usage` → `monthly_free_usage_count`
- [x] `current_month` → `monthly_usage_reset_date`

### **2. 함수 호출 수정 (High Priority)**
- [ ] `claim_reward()` → `grant_milestone_credit()`
- [ ] `check_and_update_login_streak()` → `update_consecutive_login()`
- [ ] `increment_monthly_usage()` → `check_and_use_monthly_quota()`

### **3. 보상 추적 방식 (Medium Priority)**
- [ ] `user_rewards` 테이블 제거
- [ ] `users` 테이블 BOOLEAN 컬럼 활용

### **4. 친구 초대 로직 (Low Priority)**
- [ ] `referrals` 테이블 활용
- [ ] 첫 콘텐츠 생성 완료 시 보상 지급 로직

---

## 📊 **최종 비교표**

| 항목 | 수파베이스 | 코드 | 상태 | 조치 |
|------|-----------|------|------|------|
| 신규 가입 크레딧 | 5 | 5 | ✅ | - |
| 월별 사용량 컬럼 | `monthly_free_usage_count` | `monthly_usage` | ❌ | 코드 수정 |
| 연속 로그인 컬럼 | `consecutive_login_days` | `login_streak` | ❌ | 코드 수정 |
| 리셋 날짜 컬럼 | `monthly_usage_reset_date` | `current_month` | ❌ | 코드 수정 |
| 보상 추적 | `users` BOOLEAN | `user_rewards` 테이블 | ❌ | 코드 수정 |
| 월간 체크 함수 | `check_and_use_monthly_quota` | `increment_monthly_usage` | ❌ | 함수명 변경 |
| 보상 지급 함수 | `grant_milestone_credit` | `claim_reward` | ❌ | 함수명 변경 |
| 로그인 함수 | `update_consecutive_login` | `check_and_update_login_streak` | ❌ | 함수명 변경 |

---

## ✅ **권장 조치 순서**

1. **즉시 수정 (1시간):**
   - [ ] 백엔드 컬럼명 변경 (`src/index.tsx`)
   - [ ] 프론트엔드 변수명 변경 (`app-v3-final.js`)

2. **함수 호출 수정 (2시간):**
   - [ ] Supabase 클라이언트 초기화
   - [ ] RPC 함수 호출 구현

3. **테스트 (1시간):**
   - [ ] 신규 가입 플로우
   - [ ] 보상 지급 테스트
   - [ ] 월간 사용량 체크

4. **배포 (30분):**
   - [ ] 빌드 및 재배포

---

## 🎯 **결론**

### **충돌 요약:**
- 컬럼명 불일치: 3개
- 함수명 불일치: 3개
- 보상 추적 방식 불일치: 1개
- 총 7개 불일치 발견

### **해결 방안:**
- **Option A 권장:** 수파베이스 스키마에 맞춰 코드 수정
- **예상 작업 시간:** 4-5시간
- **리스크:** 낮음 (DB 수정 불필요)

### **다음 단계:**
1. 백엔드 컬럼명 수정
2. 프론트엔드 변수명 수정
3. 함수 호출 구현
4. 전체 테스트
5. 프로덕션 배포

---

**작성일:** 2026-01-02  
**분석 대상:** Supabase DB vs Code (src/index.tsx, CREDIT_POLICY_V2.md, supabase-credit-policy-v2.sql)  
**발견된 불일치:** 7개  
**권장 조치:** Option A (코드를 수파베이스에 맞추기)
