━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 500 에러 해결 - Supabase SQL 실행 (필수!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Supabase SQL Editor 접속:
https://supabase.com/dashboard/project/YOUR_PROJECT/sql

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 복사해서 실행할 SQL (전체 선택 후 실행)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ========================================
-- Step 1: 불필요한 컬럼 전부 제거
-- ========================================
ALTER TABLE users DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_plan;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_start_date;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_end_date;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_included_count;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_used_count;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_free_credits;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_reset_date;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed;
ALTER TABLE users DROP COLUMN IF EXISTS first_generation_completed;
ALTER TABLE users DROP COLUMN IF EXISTS consecutive_login_days;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_date;

-- ========================================
-- Step 2: 필요한 컬럼 추가
-- ========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_monthly_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_monthly_reset_date DATE DEFAULT CURRENT_DATE;

-- tier 제약 조건
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check;
ALTER TABLE users ADD CONSTRAINT users_tier_check 
  CHECK (tier IN ('free', 'paid', 'guest'));

-- ========================================
-- Step 3: 기존 사용자 데이터 마이그레이션
-- ========================================
UPDATE users 
SET 
  tier = COALESCE(tier, 'free'),
  credits = COALESCE(credits, 10),
  free_monthly_count = 0,
  free_monthly_reset_date = COALESCE(free_monthly_reset_date, CURRENT_DATE)
WHERE id IS NOT NULL;

-- ========================================
-- Step 4: 최종 확인
-- ========================================
SELECT 
  id,
  email,
  name,
  tier,
  credits,
  free_monthly_count,
  free_monthly_reset_date,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 예상 결과:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| tier | credits | free_monthly_count | free_monthly_reset_date |
|------|---------|-------------------|------------------------|
| free | 10      | 0                 | 2026-01-04             |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 문제 발생 시:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error: column "tier" already exists
→ 이미 실행됨. 다음 단계로 진행하세요.

Error: relation "users" does not exist
→ public 스키마가 아님. 스키마 확인 필요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 다음 단계 (SQL 실행 후):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  최신 배포 URL 접속:
   https://e449d8b0.haruhanpo-studio.pages.dev

2️⃣  브라우저 캐시 강제 새로고침:
   Ctrl + Shift + R (Windows)
   Cmd + Shift + R (Mac)

3️⃣  개발자 도구 열기 (F12)

4️⃣  Console 탭 확인

5️⃣  Google 로그인

6️⃣  로그 확인:
   ✅ 성공: "✅ 사용자 동기화 완료: { tier: 'free', credits: 10 }"
   ❌ 실패: "❌ 사용자 동기화 실패"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
