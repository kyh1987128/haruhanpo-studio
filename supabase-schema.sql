-- ==========================================
-- 하루한포 Supabase 데이터베이스 스키마
-- ==========================================
-- 실행 방법: Supabase Dashboard → SQL Editor → 전체 복사 붙여넣기 → RUN
-- ==========================================

-- UUID 확장 활성화 (필수)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. users 테이블 (회원 정보)
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 3 CHECK (credits >= 0),
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'expired', 'cancelled')),
  subscription_plan TEXT CHECK (subscription_plan IN ('starter', 'easy', 'pro')),
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  last_credit_reset TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- users 테이블 코멘트
COMMENT ON TABLE users IS '회원 정보 및 구독 상태 관리';
COMMENT ON COLUMN users.credits IS '현재 크레딧 잔액 (0 이상)';
COMMENT ON COLUMN users.subscription_status IS 'free(무료), active(활성), expired(만료), cancelled(취소)';
COMMENT ON COLUMN users.subscription_plan IS 'starter(무료), easy(₩9,900), pro(₩29,900)';
COMMENT ON COLUMN users.last_credit_reset IS '마지막 크레딧 리셋 시간 (월 1일 자동 리셋용)';

-- ==========================================
-- 2. generations 테이블 (콘텐츠 생성 기록)
-- ==========================================
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('image_only', 'document_only', 'integrated')),
  image_count INTEGER DEFAULT 0,
  document_count INTEGER DEFAULT 0,
  platforms TEXT[] NOT NULL,
  cost_krw INTEGER NOT NULL CHECK (cost_krw > 0),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  generation_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- generations 테이블 코멘트
COMMENT ON TABLE generations IS '콘텐츠 생성 기록 및 통계';
COMMENT ON COLUMN generations.file_type IS 'image_only(₩92), document_only(₩40), integrated(₩105)';
COMMENT ON COLUMN generations.platforms IS '생성된 플랫폼 배열 예: {blog,instagram,threads,youtube}';
COMMENT ON COLUMN generations.cost_krw IS 'API 호출 비용 (원화)';

-- ==========================================
-- 3. credit_transactions 테이블 (크레딧 사용/충전 내역)
-- ==========================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('charge', 'use', 'refund', 'expire', 'reset')),
  description TEXT NOT NULL,
  payment_id UUID,
  generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- credit_transactions 테이블 코멘트
COMMENT ON TABLE credit_transactions IS '크레딧 변동 내역 추적';
COMMENT ON COLUMN credit_transactions.amount IS '양수(충전)/음수(사용)';
COMMENT ON COLUMN credit_transactions.balance_after IS '트랜잭션 후 잔액';
COMMENT ON COLUMN credit_transactions.type IS 'charge(충전), use(사용), refund(환불), expire(만료), reset(리셋)';

-- ==========================================
-- 4. payments 테이블 (토스페이먼츠 연동)
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT UNIQUE NOT NULL,
  toss_payment_key TEXT UNIQUE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('subscription', 'credit_pack')),
  payment_method TEXT,
  approved_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  refunded_at TIMESTAMP,
  refund_reason TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- payments 테이블 코멘트
COMMENT ON TABLE payments IS '결제 내역 및 토스페이먼츠 연동 정보';
COMMENT ON COLUMN payments.payment_type IS 'subscription(월구독), credit_pack(크레딧팩)';
COMMENT ON COLUMN payments.amount IS '결제 금액 (원화)';

-- ==========================================
-- 5. uploaded_files 테이블 (파일 관리)
-- ==========================================
CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES generations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf', 'docx', 'txt')),
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  extracted_text TEXT,
  text_length INTEGER,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

-- uploaded_files 테이블 코멘트
COMMENT ON TABLE uploaded_files IS '업로드된 파일 정보 및 텍스트 추출 결과';
COMMENT ON COLUMN uploaded_files.file_type IS 'image, pdf, docx, txt';
COMMENT ON COLUMN uploaded_files.extracted_text IS '문서 파일에서 추출한 텍스트';
COMMENT ON COLUMN uploaded_files.expires_at IS '30일 후 자동 삭제 예정';

-- ==========================================
-- 6. trial_usage 테이블 (비회원 체험 추적, 어뷰징 방지)
-- ==========================================
CREATE TABLE IF NOT EXISTS trial_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address TEXT NOT NULL,
  device_fingerprint TEXT,
  user_agent TEXT,
  usage_count INTEGER DEFAULT 1 CHECK (usage_count >= 0),
  last_used_at TIMESTAMP DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_trial_user UNIQUE (ip_address, device_fingerprint)
);

-- trial_usage 테이블 코멘트
COMMENT ON TABLE trial_usage IS '비회원 무료 체험 추적 및 어뷰징 방지';
COMMENT ON COLUMN trial_usage.usage_count IS '사용 횟수 (1회 제한)';
COMMENT ON COLUMN trial_usage.is_blocked IS '차단 여부';

-- ==========================================
-- 7. referrals 테이블 (추천 시스템 - 향후 확장용)
-- ==========================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  reward_given BOOLEAN DEFAULT FALSE,
  reward_type TEXT CHECK (reward_type IN ('credits', 'discount')),
  reward_amount INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  rewarded_at TIMESTAMP
);

-- referrals 테이블 코멘트
COMMENT ON TABLE referrals IS '추천인 시스템 (향후 확장용)';

-- ==========================================
-- 인덱스 생성 (성능 최적화)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_file_type ON generations(file_type);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_generation_id ON uploaded_files(generation_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_expires_at ON uploaded_files(expires_at);

CREATE INDEX IF NOT EXISTS idx_trial_usage_ip ON trial_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_trial_usage_fingerprint ON trial_usage(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_trial_usage_last_used ON trial_usage(last_used_at);

-- ==========================================
-- Row Level Security (RLS) 정책
-- ==========================================

-- users 테이블 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- generations 테이블 RLS
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own generations" ON generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" ON generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- credit_transactions 테이블 RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- payments 테이블 RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- uploaded_files 테이블 RLS
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own files" ON uploaded_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON uploaded_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- PostgreSQL 함수: 크레딧 차감 (원자적 트랜잭션)
-- ==========================================
CREATE OR REPLACE FUNCTION deduct_credit(user_uuid UUID, generation_uuid UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
  new_balance INTEGER;
BEGIN
  -- FOR UPDATE로 행 잠금 (동시성 제어)
  SELECT credits INTO current_credits 
  FROM users 
  WHERE id = user_uuid 
  FOR UPDATE;
  
  IF current_credits >= 1 THEN
    -- 크레딧 차감
    UPDATE users 
    SET credits = credits - 1, updated_at = NOW() 
    WHERE id = user_uuid
    RETURNING credits INTO new_balance;
    
    -- 트랜잭션 기록
    INSERT INTO credit_transactions (user_id, amount, balance_after, type, description, generation_id)
    VALUES (user_uuid, -1, new_balance, 'use', '콘텐츠 생성', generation_uuid);
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_credit IS '크레딧 1개 차감 (원자적 트랜잭션, 동시성 제어)';

-- ==========================================
-- PostgreSQL 함수: 크레딧 충전
-- ==========================================
CREATE OR REPLACE FUNCTION add_credits(
  user_uuid UUID, 
  credit_amount INTEGER, 
  reason TEXT,
  payment_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- 크레딧 충전
  UPDATE users 
  SET credits = credits + credit_amount, updated_at = NOW() 
  WHERE id = user_uuid
  RETURNING credits INTO new_balance;
  
  -- 트랜잭션 기록
  INSERT INTO credit_transactions (user_id, amount, balance_after, type, description, payment_id)
  VALUES (user_uuid, credit_amount, new_balance, 'charge', reason, payment_uuid);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_credits IS '크레딧 충전';

-- ==========================================
-- PostgreSQL 함수: 월간 크레딧 리셋 (유료 회원)
-- ==========================================
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER := 0;
  user_record RECORD;
  credit_amount INTEGER;
BEGIN
  FOR user_record IN 
    SELECT id, subscription_status, subscription_plan, last_credit_reset
    FROM users
    WHERE subscription_status = 'active'
    AND (last_credit_reset IS NULL OR last_credit_reset < date_trunc('month', NOW()))
  LOOP
    -- 플랜별 크레딧 설정
    credit_amount := CASE 
      WHEN user_record.subscription_plan = 'easy' THEN 30
      WHEN user_record.subscription_plan = 'pro' THEN 100
      ELSE 0
    END;
    
    IF credit_amount > 0 THEN
      -- 크레딧 리셋
      UPDATE users 
      SET credits = credit_amount, 
          last_credit_reset = NOW(),
          updated_at = NOW()
      WHERE id = user_record.id;
      
      -- 트랜잭션 기록
      INSERT INTO credit_transactions (user_id, amount, balance_after, type, description)
      VALUES (user_record.id, credit_amount, credit_amount, 'reset', '월간 크레딧 리셋');
      
      reset_count := reset_count + 1;
    END IF;
  END LOOP;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_credits IS '월 1일 자동 크레딧 리셋 (Cron 작업용)';

-- ==========================================
-- PostgreSQL 함수: 구독 만료 처리
-- ==========================================
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE users
  SET subscription_status = 'expired', updated_at = NOW()
  WHERE subscription_status = 'active'
  AND subscription_end_date < NOW()
  RETURNING COUNT(*) INTO expired_count;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_subscriptions IS '구독 만료 처리 (Cron 작업용)';

-- ==========================================
-- PostgreSQL 함수: 만료된 파일 삭제
-- ==========================================
CREATE OR REPLACE FUNCTION delete_expired_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM uploaded_files
  WHERE expires_at < NOW()
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_expired_files IS '30일 지난 파일 삭제 (Cron 작업용)';

-- ==========================================
-- 트리거: users 테이블 updated_at 자동 갱신
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 트리거: 신규 회원 가입 시 초기 크레딧 지급
-- ==========================================
CREATE OR REPLACE FUNCTION grant_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- 신규 회원에게 3크레딧 지급 (이미 기본값으로 설정되어 있음)
  INSERT INTO credit_transactions (user_id, amount, balance_after, type, description)
  VALUES (NEW.id, 3, 3, 'charge', '회원가입 환영 크레딧');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION grant_initial_credits();

-- ==========================================
-- 스키마 생성 완료
-- ==========================================
-- 다음 단계: Supabase Dashboard에서 실행 후
-- 1. Authentication → Providers → Google 활성화
-- 2. Storage → New bucket → 'haruhanpo-files' 생성 (Public)
-- 3. Database → Cron Jobs 설정 (선택사항):
--    - reset_monthly_credits() → 매월 1일 00:00
--    - expire_subscriptions() → 매일 00:00
--    - delete_expired_files() → 매일 03:00
-- ==========================================
