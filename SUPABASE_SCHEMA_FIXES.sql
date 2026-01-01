-- ==========================================
-- 하루한포 Supabase 스키마 - 최종 검증 완료 버전
-- ==========================================
-- 현재 구현과 100% 일치하도록 수정
-- 실행 방법: Supabase Dashboard → SQL Editor → RUN
-- ==========================================

-- 사소한 수정 사항:

-- 1. users 테이블: subscription_plan 기본값 추가
ALTER TABLE users 
  ALTER COLUMN subscription_plan SET DEFAULT 'starter';

-- 2. users 테이블: avatar_url 컬럼 추가 (Google OAuth에서 제공)
-- 이미 있으면 무시됨
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- 3. 신규 회원 가입 트리거 수정: 중복 체크 추가
DROP TRIGGER IF EXISTS on_user_created ON users;
DROP FUNCTION IF EXISTS grant_initial_credits();

CREATE OR REPLACE FUNCTION grant_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- 신규 회원에게만 크레딧 지급 (중복 방지)
  IF NOT EXISTS (
    SELECT 1 FROM credit_transactions 
    WHERE user_id = NEW.id AND type = 'charge' AND description = '회원가입 환영 크레딧'
  ) THEN
    INSERT INTO credit_transactions (user_id, amount, balance_after, type, description)
    VALUES (NEW.id, 3, 3, 'charge', '회원가입 환영 크레딧');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION grant_initial_credits();

-- 4. Supabase Auth와 연동되도록 RLS 정책 강화
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- 읽기: 본인만 가능
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.role() = 'service_role' -- 백엔드 API에서 접근 가능
  );

-- 쓰기: 본인만 가능
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

-- 생성: 인증된 사용자 + 서비스 역할
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'service_role'
  );

-- 5. 비회원 체험 테이블에 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_trial_usage_ip_fingerprint 
  ON trial_usage(ip_address, device_fingerprint);

-- 6. generations 테이블: user_id NULL 허용 (비회원 체험용)
ALTER TABLE generations 
  ALTER COLUMN user_id DROP NOT NULL;

-- 7. 비회원 체험 확인 함수 추가
CREATE OR REPLACE FUNCTION check_trial_available(
  ip TEXT,
  fingerprint TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  usage_record RECORD;
BEGIN
  SELECT * INTO usage_record
  FROM trial_usage
  WHERE ip_address = ip
  AND (fingerprint IS NULL OR device_fingerprint = fingerprint);
  
  IF NOT FOUND THEN
    -- 첫 사용
    INSERT INTO trial_usage (ip_address, device_fingerprint, usage_count)
    VALUES (ip, fingerprint, 0);
    RETURN TRUE;
  ELSIF usage_record.usage_count >= 1 THEN
    -- 이미 사용함
    RETURN FALSE;
  ELSIF usage_record.is_blocked THEN
    -- 차단됨
    RETURN FALSE;
  ELSE
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_trial_available IS '비회원 무료 체험 가능 여부 확인';

-- 8. 비회원 체험 사용 기록 함수
CREATE OR REPLACE FUNCTION use_trial(
  ip TEXT,
  fingerprint TEXT DEFAULT NULL,
  generation_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE trial_usage
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE ip_address = ip
  AND (fingerprint IS NULL OR device_fingerprint = fingerprint);
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION use_trial IS '비회원 무료 체험 사용 기록';

-- ==========================================
-- 완료: 스키마 최종 검증 완료
-- ==========================================
-- 다음 단계:
-- 1. Supabase Storage 버킷 생성: 'haruhanpo-files'
-- 2. Google OAuth Provider 활성화
-- 3. Cron Jobs 설정 (선택사항)
-- ==========================================
