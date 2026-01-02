# 하루한포 크레딧 정책 v2.0

## 📊 **변경 요약**

### **비용 분석 기반 정책 수정**
- **실제 원가:** ₩100/회 (Gemini Flash + GPT-4o 하이브리드)
- **기존 정책:** 신규 가입 시 30크레딧 무료 (₩3,000 원가)
- **문제점:** 초기 비용 부담이 너무 큼 + 실사용자 구분 필요
- **해결책:** 단계별 보상으로 분산 + 실사용자만 전부 받을 수 있는 구조

---

## 🎯 **새로운 크레딧 정책 (v2.0)**

### **1. 신규 가입 보상 (단계별 지급)**

| 단계 | 보상 | 조건 | 원가 |
|------|------|------|------|
| 1️⃣ 회원가입 완료 | **5크레딧** | Google 로그인 | ₩500 |
| 2️⃣ 온보딩 튜토리얼 완료 | **+5크레딧** | 가이드 완료 | ₩500 |
| 3️⃣ 첫 콘텐츠 생성 완료 | **+5크레딧** | 실제 사용 | ₩500 |
| 4️⃣ 3일 연속 로그인 | **+5크레딧** | 지속 사용 | ₩500 |
| **총계** | **최대 20크레딧** | 모두 달성 시 | **₩2,000** |

**핵심 전략:**
- ✅ 즉시 지급: 5크레딧 (기존 3 → 5)
- ✅ 실사용자만 전부 받음 (단계별 보상)
- ✅ 초기 비용 절감: ₩3,000 → ₩2,000 (33% 감소)

---

### **2. 친구 초대 리워드**

**기존:**
- 초대 1명당 10크레딧 무조건 지급

**변경:**
```
초대 1명당: 5크레딧
조건: 초대받은 친구가 첫 콘텐츠 생성 완료 시에만 지급
```

**효과:**
- ✅ 어뷰징 방지 (실사용자만 카운트)
- ✅ 비용 절감: 10크레딧(₩1,000) → 5크레딧(₩500)

---

### **3. 무료 회원 사용 제한**

**기존:**
```
하루 3회 제한
→ 월 최대 90회 가능 (30일 × 3회)
→ 원가: ₩9,000/월
```

**변경:**
```
월 총 10회 제한 (날짜 무관)
→ 원가: ₩1,000/월
→ 매월 1일 00시(KST) 자동 초기화
→ 크레딧 보유 시 추가 사용 가능
```

**효과:**
- ✅ 비용 절감: ₩9,000 → ₩1,000 (89% 감소)
- ✅ 사용자 편의: 날짜 제한 없이 자유롭게 사용
- ✅ 명확한 제한: "하루 3회" 혼동 제거

---

### **4. 유료 플랜 (변경 없음)**

| 플랜 | 가격 | 크레딧 | 1회당 비용 | 원가 | 마진 |
|------|------|--------|-----------|------|------|
| 무료 | ₩0 | 월 10회 | ₩0 | ₩1,000 | -₩1,000 |
| Easy | ₩9,900 | 월 30회 | ₩330 | ₩3,000 | **₩6,900 (70%)** |
| Pro | ₩29,900 | 월 100회 | ₩299 | ₩10,000 | **₩19,900 (67%)** |

**유료 전환 유도:**
- 무료: 월 10회 (₩0)
- Easy: 월 30회 (₩9,900) ← **3배 사용량, 연 ₩118,800**

---

## 📋 **구현 체크리스트**

### ✅ **프론트엔드 (app-v3-final.js)**

- [x] 1. **사용자 데이터 구조 확장**
  ```javascript
  currentUser = {
    credits: 5, // 신규 가입 시 5크레딧
    monthly_usage: 0, // 이번 달 사용 횟수
    monthly_limit: 10, // 무료 회원 월 10회
    monthly_remaining: 10, // 남은 사용 가능 횟수
    rewards: {
      onboarding_completed: false,
      first_generation_completed: false,
      streak_3days_completed: false
    },
    last_login_date: null,
    login_streak: 0
  }
  ```

- [x] 2. **환영 메시지 수정**
  ```javascript
  - 신규 가입: "가입 보상 5크레딧 + 추가 보상 안내 (온보딩/첫 생성/연속 로그인)"
  - 로그인: "남은 크레딧 + 이번 달 사용 가능 횟수"
  ```

- [ ] 3. **보상 획득 UI**
  - 온보딩 완료 시 보상 알림
  - 첫 콘텐츠 생성 완료 시 보상 알림
  - 3일 연속 로그인 달성 시 보상 알림

- [ ] 4. **월별 사용량 체크**
  - 콘텐츠 생성 전 monthly_remaining 확인
  - 하루 3회 제한 로직 제거
  - 월 총량 제한 로직으로 교체

- [ ] 5. **히어로 섹션 문구 수정**
  - [x] "무료 회원 월 3회" → "월 10회"

---

### ✅ **백엔드 (src/index.tsx)**

- [x] 1. **/api/auth/sync 수정**
  ```typescript
  - 신규 가입 시 5크레딧 지급 (기존 3 → 5)
  - monthly_usage, monthly_limit, rewards 필드 추가
  - current_month, last_login_date, login_streak 추가
  ```

- [x] 2. **/api/rewards/claim 추가**
  ```typescript
  - 보상 타입: onboarding_completed, first_generation_completed, streak_3days_completed
  - 각 보상: 5크레딧
  - 중복 지급 방지 로직
  ```

- [x] 3. **/api/rewards/check-streak 추가**
  ```typescript
  - 마지막 로그인 날짜 조회
  - 연속 로그인 일수 계산
  - 3일 달성 시 보상 지급 가능 여부 반환
  ```

- [ ] 4. **/api/generate 수정**
  - 월별 사용량 체크 로직 추가
  - monthly_usage 증가
  - monthly_remaining 감소

- [ ] 5. **Cron 작업: 월간 리셋**
  - 매월 1일 00시(KST)
  - monthly_usage = 0으로 초기화
  - monthly_remaining = monthly_limit로 초기화

---

### ✅ **Supabase 스키마 수정**

```sql
-- users 테이블에 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_usage INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_month TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0;

-- 보상 추적 테이블
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('onboarding_completed', 'first_generation_completed', 'streak_3days_completed', 'referral')),
  reward_amount INTEGER NOT NULL DEFAULT 5,
  claimed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, reward_type) -- 중복 방지
);

-- 월간 사용량 리셋 함수
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER := 0;
BEGIN
  UPDATE users
  SET monthly_usage = 0,
      monthly_remaining = monthly_limit,
      current_month = to_char(NOW(), 'YYYY-MM'),
      updated_at = NOW()
  WHERE current_month != to_char(NOW(), 'YYYY-MM');
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_usage IS '매월 1일 자동 실행: 월간 사용량 리셋';
```

---

## 📊 **비용 비교 분석**

### **기존 정책 (v1.0)**

| 항목 | 크레딧 | 원가 |
|------|--------|------|
| 신규 가입 보상 | 30 | ₩3,000 |
| 무료 회원 월 사용 | 90 | ₩9,000 |
| 친구 초대 (10명) | 100 | ₩10,000 |
| **총 원가** | **220** | **₩22,000** |

---

### **새로운 정책 (v2.0)**

| 항목 | 크레딧 | 원가 | 비고 |
|------|--------|------|------|
| 신규 가입 보상 (단계별) | 20 | ₩2,000 | 실사용자만 전부 받음 |
| 무료 회원 월 사용 | 10 | ₩1,000 | 날짜 무관 자유 사용 |
| 친구 초대 (10명) | 50 | ₩5,000 | 실사용 조건 추가 |
| **총 원가** | **80** | **₩8,000** | **64% 절감** |

---

### **비용 절감 효과**

```
기존: ₩22,000/사용자
새로: ₩8,000/사용자
절감: ₩14,000/사용자 (64%)
```

**월 1,000명 신규 가입 시:**
- 기존: ₩22,000,000
- 새로: ₩8,000,000
- **절감: ₩14,000,000/월**

**연간 절감:**
- **₩168,000,000/년** (1,000명/월 기준)

---

## 🎯 **전환 전략**

### **무료 → 유료 전환 유도**

**1단계: 무료 체험 (월 10회)**
- 원가: ₩1,000
- 사용자 경험: 무료로 충분히 테스트

**2단계: 제한 인지**
- "이번 달 사용 가능: 10회 중 5회 남음"
- "월 10회 초과 시 유료 플랜 추천"

**3단계: 유료 전환 제안**
- Easy 플랜: ₩9,900/월 (30회) ← **3배 사용량**
- 1회당 ₩330 (원가 ₩100 대비 마진 70%)

---

## 📌 **주의사항**

### **1. 기존 사용자 보호**
```sql
-- 기존 사용자 크레딧은 유지
UPDATE users
SET credits = GREATEST(credits, 5) -- 5크레딧 미만이면 5로 상향
WHERE created_at < '2026-01-01';
```

### **2. 점진적 적용**
- 신규 가입자부터 새 정책 적용
- 기존 사용자에게 공지 후 전환

### **3. 월간 리셋 알림**
- 매월 1일 이메일 알림
- "이번 달 10회 사용 가능 크레딧이 리셋되었습니다"

---

## 🚀 **배포 계획**

### **Phase 1: 백엔드 준비 (1일)**
- [x] API 엔드포인트 추가 (/api/rewards/*)
- [ ] Supabase 스키마 수정
- [ ] Cron 작업 설정 (월간 리셋)

### **Phase 2: 프론트엔드 수정 (1일)**
- [x] 사용자 데이터 구조 확장
- [x] 환영 메시지 수정
- [ ] 보상 획득 UI 추가
- [ ] 월별 사용량 체크 로직

### **Phase 3: 테스트 (1일)**
- [ ] 신규 가입 플로우 테스트
- [ ] 보상 지급 테스트
- [ ] 월간 리셋 테스트
- [ ] 친구 초대 테스트

### **Phase 4: 배포 (1일)**
- [ ] 프로덕션 배포
- [ ] 기존 사용자 공지
- [ ] 모니터링 및 버그 수정

---

## ✅ **최종 체크리스트**

- [x] 크레딧 정책 문서 작성
- [x] 백엔드 API 엔드포인트 추가
- [x] 프론트엔드 데이터 구조 확장
- [x] 환영 메시지 수정
- [x] 히어로 섹션 문구 수정
- [ ] Supabase 스키마 수정
- [ ] 보상 획득 UI 추가
- [ ] 월별 사용량 체크 로직
- [ ] Cron 작업 설정
- [ ] 전체 테스트
- [ ] 프로덕션 배포

---

**작성일:** 2026-01-01  
**버전:** v2.0  
**작성자:** Claude Code Assistant  
**예상 비용 절감:** ₩14,000,000/월 (1,000명 기준)
