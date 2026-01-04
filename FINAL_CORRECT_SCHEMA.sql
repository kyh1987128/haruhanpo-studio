-- ========================================
-- 올바른 정책 DB 스키마 (최종 확정)
-- ========================================

-- 정책:
-- 1. 비회원: 1크레딧 (1회만)
-- 2. 무료 회원: 매월 10크레딧 자동 리셋
-- 3. 유료 회원: ₩9,900 결제 → 50크레딧 일회성 구매
-- 4. 추가 충전: 1크레딧 = ₩200

-- ========================================
-- 1. 불필요한 컬럼 전부 제거
-- ========================================
ALTER TABLE users DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_plan;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_start_date;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_end_date;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_included_count;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_used_count;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_free_credits;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed;
ALTER TABLE users DROP COLUMN IF EXISTS first_generation_completed;
ALTER TABLE users DROP COLUMN IF EXISTS consecutive_login_days;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_date;

-- ========================================
-- 2. 필요한 컬럼만 추가
-- ========================================
-- tier: 'free' (무료 회원) | 'paid' (유료 회원) | 'guest' (비회원)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';

-- credits: 크레딧 잔액 (무료/유료 통합)
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INT DEFAULT 10;

-- free_monthly_count: 무료 회원 이번 달 사용 횟수
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_monthly_count INT DEFAULT 0;

-- free_monthly_reset_date: 무료 회원 리셋 날짜
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_monthly_reset_date DATE DEFAULT CURRENT_DATE;

-- ========================================
-- 3. 제약 조건
-- ========================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check;
ALTER TABLE users ADD CONSTRAINT users_tier_check 
  CHECK (tier IN ('free', 'paid', 'guest'));

-- ========================================
-- 4. 기존 사용자 데이터 마이그레이션
-- ========================================
UPDATE users 
SET 
  tier = COALESCE(tier, 'free'),
  credits = COALESCE(credits, 10),
  free_monthly_count = 0,
  free_monthly_reset_date = COALESCE(free_monthly_reset_date, CURRENT_DATE)
WHERE id IS NOT NULL;

-- ========================================
-- 5. credit_transactions 테이블
-- ========================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'monthly_reset', 'trial')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- ========================================
-- 6. RLS 정책
-- ========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ========================================
-- 7. 최종 확인
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

-- ========================================
-- 8. 예상 데이터
-- ========================================
-- 무료 회원 (가입만 한 경우):
--   tier = 'free'
--   credits = 10
--   free_monthly_count = 3 (이번 달 3회 사용)
--   free_monthly_reset_date = '2026-01-01'

-- 유료 회원 (₩9,900 결제):
--   tier = 'paid'
--   credits = 50
--   free_monthly_count = NULL (사용 안 함)
--   free_monthly_reset_date = NULL (사용 안 함)

-- 비회원:
--   tier = 'guest'
--   credits = 1
--   (DB에 저장하지 않음, 세션만)
