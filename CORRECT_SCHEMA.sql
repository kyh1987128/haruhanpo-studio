-- ========================================
-- 올바른 비즈니스 로직 DB 스키마
-- ========================================

-- 1. users 테이블 구조 확정
-- 필요한 컬럼:
-- - id (uuid): 사용자 ID
-- - email (text): 이메일
-- - name (text): 이름
-- - tier (text): 'guest' | 'free' | 'paid'
-- - credits (int): 현재 보유 크레딧
-- - monthly_free_credits (int): 무료 회원 월간 크레딧 (free tier만)
-- - monthly_reset_date (date): 무료 회원 리셋 날짜
-- - created_at (timestamptz): 생성 시간
-- - updated_at (timestamptz): 수정 시간

-- 2. 기존 불필요한 컬럼 제거
ALTER TABLE users DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_plan;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_start_date;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_end_date;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_included_count;
ALTER TABLE users DROP COLUMN IF EXISTS monthly_used_count;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed;
ALTER TABLE users DROP COLUMN IF EXISTS first_generation_completed;
ALTER TABLE users DROP COLUMN IF EXISTS consecutive_login_days;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_date;

-- 3. 필요한 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INT DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_free_credits INT DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_reset_date DATE DEFAULT CURRENT_DATE;

-- 4. tier 제약 조건 추가
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_check;
ALTER TABLE users ADD CONSTRAINT users_tier_check 
  CHECK (tier IN ('guest', 'free', 'paid'));

-- 5. 기존 사용자 데이터 마이그레이션
UPDATE users 
SET 
  tier = 'free',
  credits = COALESCE(credits, 10),
  monthly_free_credits = 10,
  monthly_reset_date = COALESCE(monthly_reset_date, CURRENT_DATE)
WHERE tier IS NULL;

-- 6. credit_transactions 테이블 확인
-- 이미 존재하면 유지, 없으면 생성
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

-- 7. RLS 정책 (간단하게)
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

-- 8. 최종 확인
SELECT 
  id,
  email,
  name,
  tier,
  credits,
  monthly_free_credits,
  monthly_reset_date,
  created_at,
  updated_at
FROM users
ORDER BY created_at DESC
LIMIT 10;
