# Supabase 작업 vs 현재 코드 충돌 분석

## 📊 **비교 요약**

### **주요 발견 사항**

| 항목 | 우리 설계 (v2.0) | Supabase 실제 구현 | 충돌 여부 |
|------|-----------------|-------------------|---------|
| **신규 가입 보상** | 5크레딧 | **30크레딧** | ⚠️ **충돌** |
| **첫 생성 보상** | 5크레딧 | 5크레딧 | ✅ 일치 |
| **친구 초대 보상** | 5크레딧 | **10크레딧** | ⚠️ **충돌** |
| **월 무료 사용** | 10회 | **3회** | ⚠️ **충돌** |
| **온보딩 보상** | 5크레딧 (별도) | **통합됨** | ⚠️ 충돌 |
| **3일 로그인 보상** | 5크레딧 | **미구현** | ⚠️ 충돌 |

---

## 🔴 **심각한 충돌 (즉시 수정 필요)**

### **1. 신규 가입 보상: 30 vs 5 크레딧**

**우리 설계:**
```
회원가입: 5크레딧 즉시 지급
온보딩 완료: +5크레딧
첫 생성 완료: +5크레딧
3일 연속 로그인: +5크레딧
총: 최대 20크레딧
```

**Supabase 실제:**
```sql
-- 기존 트리거 활용: 신규 가입 시 30크레딧 일괄 지급
NEW.credits := 30;
```

**문제점:**
- ❌ 비용 부담: ₩3,000 (우리 목표: ₩500)
- ❌ 단계별 보상 구조 무시
- ❌ 실사용자 구분 불가

**해결 방법:**
```sql
-- users 테이블 트리거 수정 필요
CREATE OR REPLACE FUNCTION grant_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
  NEW.credits := 5; -- 30 → 5로 변경
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### **2. 월 무료 사용: 3회 vs 10회**

**우리 설계:**
```
무료 회원: 월 10회
원가: ₩1,000/월
```

**Supabase 실제:**
```sql
-- check_and_use_monthly_quota 함수
IF v_monthly_usage >= 3 THEN -- 하드코딩됨
  RETURN QUERY SELECT FALSE, ...;
END IF;
```

**문제점:**
- ❌ 제한이 너무 엄격 (3회)
- ❌ 사용자 경험 저하
- ❌ 우리 정책(10회)과 불일치

**해결 방법:**
```sql
-- users 테이블에 monthly_limit 컬럼 사용
IF v_monthly_usage >= v_monthly_limit THEN
  RETURN QUERY SELECT FALSE, ...;
END IF;
```

---

### **3. 친구 초대 보상: 10 vs 5 크레딧**

**우리 설계:**
```
친구 초대: 5크레딧
조건: 피추천인이 첫 생성 완료 시
```

**Supabase 실제:**
```sql
-- grant_referral_reward 함수
UPDATE users SET credits = credits + 10 -- 10크레딧
WHERE id = v_referrer_id;
```

**문제점:**
- ❌ 비용 과다: ₩1,000 (우리 목표: ₩500)
- ❌ 어뷰징 위험 증가

**해결 방법:**
```sql
UPDATE users SET credits = credits + 5 -- 10 → 5로 변경
WHERE id = v_referrer_id;
```

---

## 🟡 **중간 충돌 (조정 가능)**

### **4. 온보딩 보상 미구현**

**우리 설계:**
```
온보딩 완료: +5크레딧 (별도 보상)
```

**Supabase 실제:**
```sql
-- onboarding_completed 컬럼만 존재
-- 보상 지급 함수 없음
```

**해결 방법:**
```sql
-- grant_milestone_credit 함수 확장
ELSIF milestone_type = 'onboarding' THEN
  IF NOT NEW.onboarding_completed THEN
    NEW.credits := NEW.credits + 5;
    NEW.onboarding_completed := TRUE;
  END IF;
```

---

### **5. 3일 연속 로그인 보상 미구현**

**우리 설계:**
```
3일 연속 로그인: +5크레딧
```

**Supabase 실제:**
```sql
-- update_consecutive_login 함수
-- consecutive_login_days만 업데이트
-- 보상 지급 로직 없음
```

**해결 방법:**
```sql
-- update_consecutive_login 함수 수정
IF v_new_consecutive_days >= 3 AND NOT v_streak_reward_granted THEN
  UPDATE users SET credits = credits + 5 WHERE id = user_id_param;
  -- 보상 기록 추가
END IF;
```

---

## 🟢 **일치하는 부분 (정상)**

### ✅ **1. 첫 콘텐츠 생성 보상**
```sql
-- grant_milestone_credit 함수
-- 5크레딧 지급 ✅ 일치
```

### ✅ **2. 컬럼 구조**
```sql
-- users 테이블
onboarding_completed BOOLEAN ✅
first_generation_completed BOOLEAN ✅
consecutive_login_days INTEGER ✅
last_login_date DATE ✅
monthly_free_usage_count INTEGER ✅
```

### ✅ **3. referrals 테이블**
```sql
-- Foreign Key 제약조건 ✅
-- 중복 방지 UNIQUE ✅
```

---

## 📋 **필수 수정 사항 (우선순위)**

### 🔴 **높음 (즉시 수정)**

#### **1. 신규 가입 보상: 30 → 5 크레딧**
```sql
-- Supabase SQL Editor에서 실행
CREATE OR REPLACE FUNCTION grant_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
  NEW.credits := 5; -- ⚠️ 핵심 변경: 30 → 5
  NEW.onboarding_completed := FALSE;
  NEW.first_generation_completed := FALSE;
  NEW.consecutive_login_days := 0;
  NEW.last_login_date := CURRENT_DATE;
  NEW.monthly_free_usage_count := 0;
  NEW.monthly_usage_reset_date := CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### **2. 월 무료 사용: 3 → 10회**
```sql
-- check_and_use_monthly_quota 함수 수정
CREATE OR REPLACE FUNCTION check_and_use_monthly_quota(user_id_param UUID)
RETURNS TABLE(can_use BOOLEAN, remaining_count INTEGER, message TEXT) AS $$
DECLARE
  v_monthly_usage INTEGER;
  v_monthly_limit INTEGER := 10; -- ⚠️ 핵심 변경: 3 → 10
  v_reset_date DATE;
  v_current_date DATE := CURRENT_DATE;
BEGIN
  SELECT monthly_free_usage_count, monthly_usage_reset_date
  INTO v_monthly_usage, v_reset_date
  FROM users
  WHERE id = user_id_param;
  
  -- 월간 리셋 체크
  IF v_reset_date IS NULL OR 
     EXTRACT(MONTH FROM v_reset_date) != EXTRACT(MONTH FROM v_current_date) OR
     EXTRACT(YEAR FROM v_reset_date) != EXTRACT(YEAR FROM v_current_date) THEN
    UPDATE users
    SET monthly_free_usage_count = 0,
        monthly_usage_reset_date = v_current_date
    WHERE id = user_id_param;
    v_monthly_usage := 0;
  END IF;
  
  -- 사용 가능 여부 체크
  IF v_monthly_usage >= v_monthly_limit THEN -- ⚠️ 수정됨
    RETURN QUERY SELECT FALSE, 0, 
      format('월 무료 사용 한도(%s회)를 초과했습니다', v_monthly_limit);
    RETURN;
  END IF;
  
  -- 사용 횟수 증가
  UPDATE users
  SET monthly_free_usage_count = monthly_free_usage_count + 1
  WHERE id = user_id_param;
  
  RETURN QUERY SELECT TRUE, (v_monthly_limit - v_monthly_usage - 1),
    format('사용 완료. 이번 달 %s회 남음', v_monthly_limit - v_monthly_usage - 1);
END;
$$ LANGUAGE plpgsql;
```

#### **3. 친구 초대 보상: 10 → 5 크레딧**
```sql
-- grant_referral_reward 함수 수정
CREATE OR REPLACE FUNCTION grant_referral_reward(p_referral_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
  v_referred_user_id UUID;
  v_first_generation_completed BOOLEAN;
  v_reward_granted BOOLEAN;
BEGIN
  SELECT referrer_id, referred_user_id, reward_granted
  INTO v_referrer_id, v_referred_user_id, v_reward_granted
  FROM referrals
  WHERE id = p_referral_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF v_reward_granted THEN
    RETURN FALSE;
  END IF;
  
  SELECT first_generation_completed
  INTO v_first_generation_completed
  FROM users
  WHERE id = v_referred_user_id;
  
  IF NOT v_first_generation_completed THEN
    RETURN FALSE;
  END IF;
  
  UPDATE users
  SET credits = credits + 5 -- ⚠️ 핵심 변경: 10 → 5
  WHERE id = v_referrer_id;
  
  UPDATE referrals
  SET reward_granted = TRUE
  WHERE id = p_referral_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

### 🟡 **중간 (1주일 내)**

#### **4. 온보딩 보상 추가**
```sql
-- grant_milestone_credit 함수 확장
CREATE OR REPLACE FUNCTION grant_milestone_credit(
  user_id_param UUID, 
  milestone_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_already_completed BOOLEAN;
BEGIN
  IF milestone_type = 'first_generation' THEN
    SELECT first_generation_completed INTO v_already_completed
    FROM users WHERE id = user_id_param;
    
    IF v_already_completed THEN
      RETURN FALSE;
    END IF;
    
    UPDATE users
    SET credits = credits + 5,
        first_generation_completed = TRUE
    WHERE id = user_id_param;
    
    RETURN TRUE;
    
  ELSIF milestone_type = 'onboarding' THEN -- ⚠️ 새로 추가
    SELECT onboarding_completed INTO v_already_completed
    FROM users WHERE id = user_id_param;
    
    IF v_already_completed THEN
      RETURN FALSE;
    END IF;
    
    UPDATE users
    SET credits = credits + 5,
        onboarding_completed = TRUE
    WHERE id = user_id_param;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

#### **5. 3일 연속 로그인 보상 추가**
```sql
-- update_consecutive_login 함수에 보상 로직 추가
CREATE OR REPLACE FUNCTION update_consecutive_login(user_id_param UUID)
RETURNS TABLE(new_consecutive_days INTEGER, reward_granted BOOLEAN) AS $$
DECLARE
  v_last_login_date DATE;
  v_current_consecutive_days INTEGER;
  v_new_consecutive_days INTEGER;
  v_reward_granted BOOLEAN := FALSE;
  v_current_date DATE := CURRENT_DATE;
BEGIN
  SELECT last_login_date, consecutive_login_days
  INTO v_last_login_date, v_current_consecutive_days
  FROM users
  WHERE id = user_id_param;
  
  IF v_last_login_date IS NULL THEN
    v_new_consecutive_days := 1;
  ELSIF v_last_login_date = v_current_date THEN
    v_new_consecutive_days := v_current_consecutive_days;
  ELSIF v_last_login_date = v_current_date - INTERVAL '1 day' THEN
    v_new_consecutive_days := v_current_consecutive_days + 1;
  ELSE
    v_new_consecutive_days := 1;
  END IF;
  
  -- ⚠️ 새로 추가: 3일 연속 로그인 보상
  IF v_new_consecutive_days = 3 THEN
    -- streak_3days_completed 컬럼 추가 필요 (또는 user_rewards 테이블 사용)
    UPDATE users
    SET credits = credits + 5
    WHERE id = user_id_param;
    v_reward_granted := TRUE;
  END IF;
  
  UPDATE users
  SET last_login_date = v_current_date,
      consecutive_login_days = v_new_consecutive_days
  WHERE id = user_id_param;
  
  RETURN QUERY SELECT v_new_consecutive_days, v_reward_granted;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 **비용 영향 분석**

### **현재 Supabase 설정 (수정 전)**

| 항목 | 크레딧 | 원가 |
|------|--------|------|
| 신규 가입 | 30 | ₩3,000 |
| 첫 생성 | 5 | ₩500 |
| 친구 초대 (10명) | 100 | ₩10,000 |
| 월 무료 사용 | 3 | ₩300 |
| **총계** | **135** | **₩13,800** |

### **수정 후 (v2.0 적용)**

| 항목 | 크레딧 | 원가 |
|------|--------|------|
| 신규 가입 | 5 | ₩500 |
| 온보딩 | 5 | ₩500 |
| 첫 생성 | 5 | ₩500 |
| 3일 로그인 | 5 | ₩500 |
| 친구 초대 (10명) | 50 | ₩5,000 |
| 월 무료 사용 | 10 | ₩1,000 |
| **총계** | **80** | **₩8,000** |

### **절감 효과**
```
기존: ₩13,800/사용자
수정: ₩8,000/사용자
절감: ₩5,800/사용자 (42%)
```

---

## ✅ **실행 체크리스트**

### **1단계: 핵심 수정 (즉시)**
- [ ] `grant_initial_credits()`: 30 → 5 크레딧
- [ ] `check_and_use_monthly_quota()`: 3 → 10회
- [ ] `grant_referral_reward()`: 10 → 5 크레딧

### **2단계: 추가 기능 (1주일 내)**
- [ ] `grant_milestone_credit()`: 온보딩 보상 추가
- [ ] `update_consecutive_login()`: 3일 로그인 보상 추가

### **3단계: 프론트엔드 연동**
- [ ] `/api/auth/sync`: 월 10회 반영
- [ ] 환영 메시지: "월 3회" → "월 10회"
- [ ] 보상 UI: 온보딩/3일 로그인 알림

---

## 🚀 **즉시 실행 가능한 SQL**

```sql
-- ==========================================
-- 하루한포 크레딧 정책 v2.0 - 긴급 수정
-- ==========================================
-- Supabase Dashboard → SQL Editor → RUN
-- ==========================================

-- 1. 신규 가입 보상: 30 → 5 크레딧
CREATE OR REPLACE FUNCTION grant_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
  NEW.credits := 5; -- 변경됨
  NEW.onboarding_completed := FALSE;
  NEW.first_generation_completed := FALSE;
  NEW.consecutive_login_days := 0;
  NEW.last_login_date := CURRENT_DATE;
  NEW.monthly_free_usage_count := 0;
  NEW.monthly_usage_reset_date := CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. 기존 사용자 크레딧 조정 (선택사항)
-- 신규 가입자부터만 적용하려면 이 부분 생략
UPDATE users
SET credits = GREATEST(credits, 5)
WHERE credits < 5 AND created_at >= NOW() - INTERVAL '1 day';

-- 완료!
SELECT '✅ 크레딧 정책 v2.0 핵심 수정 완료' AS status;
```

---

## 🎯 **최종 권장사항**

### **즉시 실행 (오늘)**
1. ✅ 위 SQL 스크립트 실행
2. ✅ 프론트엔드 "월 3회" → "월 10회" 수정 확인

### **이번 주 내**
1. 온보딩 보상 함수 추가
2. 3일 로그인 보상 함수 추가
3. 전체 테스트

### **향후 고려사항**
- trial_usage 테이블: 비회원 체험 기능 사용 여부 확인 후 결정
- subscription_end_date: 실제 구독 시스템 구현 시 사용

---

**작성일:** 2026-01-01  
**버전:** Conflict Analysis v1.0  
**긴급도:** 🔴 **높음** (즉시 수정 권장)
