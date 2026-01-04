# 🔍 Supabase DB 스키마 체크리스트

## 문제 진단: Google 로그인 500 에러

**증상:**
- POST `/api/auth/sync` → 500 Internal Server Error
- 프로덕션 환경에서만 발생
- 백엔드 코드는 이미 하이브리드 플랜 반영 완료 (v9.0.1)

**원인 가능성:**
1. ✅ 백엔드 코드: v9.0.1에서 하이브리드 플랜 반영 완료
2. ❓ Supabase DB 스키마: 필수 컬럼 누락 가능성
3. ❓ 환경 변수: `SUPABASE_SERVICE_KEY` 등 확인 필요

---

## 📋 1단계: Supabase DB 스키마 확인

**Supabase SQL Editor에서 다음 쿼리를 실행하세요:**

### 1-1. `users` 테이블 컬럼 확인

```sql
-- users 테이블의 모든 컬럼 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**예상 결과: 다음 컬럼들이 모두 존재해야 함**
- ✅ `id` (uuid)
- ✅ `email` (text)
- ✅ `name` (text)
- ✅ `subscription_status` (text, DEFAULT 'active')
- ✅ `monthly_included_count` (integer, DEFAULT 50)
- ✅ `monthly_used_count` (integer, DEFAULT 0)
- ✅ `monthly_reset_date` (date)
- ✅ `credits` (integer, DEFAULT 0)
- ✅ `created_at` (timestamp)
- ✅ `updated_at` (timestamp)

---

### 1-2. 누락된 컬럼이 있다면 추가

**만약 위 컬럼 중 하나라도 누락되었다면, 아래 SQL을 실행하세요:**

```sql
-- 하이브리드 플랜 관련 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_included_count INT DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_used_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_reset_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INT DEFAULT 0;

-- 기존 데이터 업데이트
UPDATE users 
SET 
  subscription_status = COALESCE(subscription_status, 'active'),
  monthly_included_count = COALESCE(monthly_included_count, 50),
  monthly_used_count = COALESCE(monthly_used_count, 0),
  monthly_reset_date = COALESCE(monthly_reset_date, CURRENT_DATE),
  credits = COALESCE(credits, 0)
WHERE subscription_status IS NULL 
   OR monthly_included_count IS NULL 
   OR monthly_used_count IS NULL 
   OR monthly_reset_date IS NULL
   OR credits IS NULL;
```

---

### 1-3. `credit_transactions` 테이블 확인

```sql
-- credit_transactions 테이블 존재 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = 'credit_transactions'
) AS table_exists;
```

**결과가 `false`라면, 테이블 생성:**

```sql
-- 크레딧 거래 이력 테이블
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- RLS 정책
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 📋 2단계: 실제 데이터 확인

### 2-1. 기존 사용자 데이터 확인

```sql
-- 자신의 계정 정보 확인 (Google 로그인에 사용한 이메일)
SELECT 
  id,
  email,
  name,
  subscription_status,
  monthly_included_count,
  monthly_used_count,
  monthly_reset_date,
  credits,
  created_at,
  updated_at
FROM users
WHERE email = 'kyh1987128@gmail.com'; -- 본인 이메일로 변경
```

**예상 결과:**
- `subscription_status`: `'active'`
- `monthly_included_count`: `50`
- `monthly_used_count`: `0` ~ `50`
- `credits`: `0` 이상

---

### 2-2. 사용자가 없다면 수동 생성 (테스트용)

```sql
-- 테스트 사용자 생성 (실제 Google OAuth user_id 필요)
INSERT INTO users (id, email, name, subscription_status, monthly_included_count, monthly_used_count, credits)
VALUES (
  'ad386565-b51b-4f03-a799-6a4774adb35c', -- 실제 Google OAuth user_id
  'kyh1987128@gmail.com',
  '김선수',
  'active',
  50,
  0,
  0
)
ON CONFLICT (id) 
DO UPDATE SET
  subscription_status = 'active',
  monthly_included_count = 50,
  updated_at = NOW();
```

---

## 📋 3단계: RLS 정책 확인

### 3-1. RLS 정책 목록 확인

```sql
-- users 테이블의 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';
```

---

### 3-2. 간단한 RLS 정책 적용 (권장)

```sql
-- 기존 정책 제거
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;

-- 새 정책 생성: 자신의 데이터 읽기/쓰기 허용
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 백엔드(Service Role)에서 INSERT/UPDATE 가능하도록
-- Service Role은 RLS를 우회하므로 별도 정책 불필요
```

---

## 📋 4단계: 환경 변수 확인 (Cloudflare Pages)

### 4-1. Cloudflare Dashboard에서 확인

1. **Cloudflare Dashboard** → **Pages** → **haruhanpo-studio**
2. **Settings** → **Environment variables**
3. 다음 변수들이 모두 설정되어 있는지 확인:
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_ANON_KEY`
   - ✅ `SUPABASE_SERVICE_KEY` ⭐ **가장 중요!**
   - ✅ `OPENAI_API_KEY`
   - ✅ `GEMINI_API_KEY`

---

### 4-2. `SUPABASE_SERVICE_KEY` 다시 설정 (권장)

**Supabase Dashboard → Settings → API → Service Role Key를 복사**

```bash
# 로컬에서 실행 (SUPABASE_SERVICE_KEY는 실제 값으로 변경)
npx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name haruhanpo-studio
# 값 입력: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📋 5단계: 재배포 및 테스트

### 5-1. 강제 재배포

```bash
cd /home/user/webapp

# 빌드
npm run build

# 재배포
npx wrangler pages deploy dist --project-name haruhanpo-studio --commit-message "fix: 하이브리드 플랜 DB 스키마 재배포"
```

---

### 5-2. Google 로그인 테스트

1. **프로덕션 URL 접속**: https://haruhanpo-studio.pages.dev
2. **로그아웃** (이미 로그인되어 있다면)
3. **개발자 도구 열기** (F12)
4. **Console 탭** 활성화
5. **Google 로그인** 클릭
6. 로그인 후 **Console 로그** 확인:
   ```
   🚀 [syncUserToBackend] 시작 - user_id: xxx, email: xxx
   📡 [syncUserToBackend] /api/auth/sync 응답 - status: 200 ✅
   ✅ [syncUserToBackend] 성공
   ```

---

## 🔧 예상 문제 및 해결책

### 문제 1: "column 'subscription_status' does not exist"

**해결책:**
```sql
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active';
```

---

### 문제 2: "column 'monthly_included_count' does not exist"

**해결책:**
```sql
ALTER TABLE users ADD COLUMN monthly_included_count INT DEFAULT 50;
ALTER TABLE users ADD COLUMN monthly_used_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN monthly_reset_date DATE DEFAULT CURRENT_DATE;
```

---

### 문제 3: "PGRST116" (Row not found)

**원인:** RLS 정책으로 인해 Service Role도 데이터 접근 불가

**해결책:**
```sql
-- Service Role은 RLS 우회하므로 별도 조치 불필요
-- 하지만 혹시 문제가 있다면:
ALTER TABLE users DISABLE ROW LEVEL SECURITY; -- 테스트용
-- 테스트 후 다시 활성화:
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

---

### 문제 4: "Invalid API key"

**해결책:**
```bash
# SUPABASE_SERVICE_KEY 다시 설정
npx wrangler pages secret put SUPABASE_SERVICE_KEY --project-name haruhanpo-studio
```

---

## 📊 체크리스트 요약

### Supabase DB
- [ ] `users` 테이블에 하이브리드 플랜 컬럼 존재 확인
- [ ] `credit_transactions` 테이블 존재 확인
- [ ] RLS 정책 적절히 설정
- [ ] 기존 사용자 데이터 마이그레이션 완료

### Cloudflare Pages
- [ ] 환경 변수 (`SUPABASE_SERVICE_KEY` 등) 설정 확인
- [ ] v9.0.1 배포 완료
- [ ] 캐시 클리어 후 테스트

### 테스트
- [ ] Google 로그인 → 200 응답
- [ ] Console 로그에 에러 없음
- [ ] 사용자 정보 정상 표시 (Pro 50/50 + 0 크레딧)

---

## 🚀 다음 단계

**1️⃣ 위 SQL 스크립트를 Supabase에서 실행**
**2️⃣ 환경 변수 재확인 (특히 SUPABASE_SERVICE_KEY)**
**3️⃣ 강제 재배포**
**4️⃣ Google 로그인 테스트**

테스트 결과를 알려주시면, 추가로 도와드리겠습니다! 🔥
