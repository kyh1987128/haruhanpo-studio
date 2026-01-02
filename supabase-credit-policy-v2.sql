-- ==========================================
-- 하루한포 크레딧 정책 v2.0 - Supabase 스키마 업데이트
-- ==========================================
-- 실행 방법: Supabase Dashboard → SQL Editor → RUN
-- ==========================================

-- 1. users 테이블에 새로운 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_usage INTEGER DEFAULT 0 CHECK (monthly_usage >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 10 CHECK (monthly_limit > 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_month TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0 CHECK (login_streak >= 0);

-- 컬럼 설명 추가
COMMENT ON COLUMN users.monthly_usage IS '이번 달 사용 횟수';
COMMENT ON COLUMN users.monthly_limit IS '무료 회원 월 제한 (기본: 10회)';
COMMENT ON COLUMN users.current_month IS '현재 월 (YYYY-MM 형식)';
COMMENT ON COLUMN users.last_login_date IS '마지막 로그인 날짜';
COMMENT ON COLUMN users.login_streak IS '연속 로그인 일수';

-- 2. 기존 사용자 크레딧 조정 (5크레딧 미만이면 5로 상향)
UPDATE users
SET credits = GREATEST(credits, 5),
    current_month = to_char(NOW(), 'YYYY-MM')
WHERE credits < 5;

-- 3. 사용자 보상 추적 테이블 생성
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN (
    'signup', -- 회원가입 (5크레딧)
    'onboarding_completed', -- 온보딩 완료 (5크레딧)
    'first_generation_completed', -- 첫 콘텐츠 생성 (5크레딧)
    'streak_3days_completed', -- 3일 연속 로그인 (5크레딧)
    'referral' -- 친구 초대 (5크레딧)
  )),
  reward_amount INTEGER NOT NULL DEFAULT 5 CHECK (reward_amount > 0),
  metadata JSONB, -- 추가 정보 (예: 초대한 친구 ID 등)
  claimed_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_reward UNIQUE(user_id, reward_type) -- 중복 방지
);

-- user_rewards 테이블 코멘트
COMMENT ON TABLE user_rewards IS '사용자 보상 추적 및 중복 방지';
COMMENT ON COLUMN user_rewards.reward_type IS '보상 타입 (회원가입/온보딩/첫생성/연속로그인/초대)';
COMMENT ON COLUMN user_rewards.metadata IS '추가 정보 (JSON 형식)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_reward_type ON user_rewards(reward_type);
CREATE INDEX IF NOT EXISTS idx_user_rewards_claimed_at ON user_rewards(claimed_at DESC);

-- 4. 월간 사용량 리셋 함수
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS TABLE(reset_count INTEGER, message TEXT) AS $$
DECLARE
  v_reset_count INTEGER := 0;
  v_current_month TEXT := to_char(NOW(), 'YYYY-MM');
BEGIN
  -- 이번 달이 아닌 모든 사용자의 월간 사용량 리셋
  UPDATE users
  SET monthly_usage = 0,
      current_month = v_current_month,
      updated_at = NOW()
  WHERE current_month IS NULL OR current_month != v_current_month;
  
  GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_reset_count, 
    format('✅ %s명의 월간 사용량이 리셋되었습니다 (%s)', v_reset_count, v_current_month);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_usage IS '매월 1일 00시 자동 실행: 월간 사용량 리셋 (Cron 작업용)';

-- 5. 보상 지급 함수
CREATE OR REPLACE FUNCTION claim_reward(
  p_user_id UUID,
  p_reward_type TEXT,
  p_reward_amount INTEGER DEFAULT 5,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_credits INTEGER) AS $$
DECLARE
  v_new_credits INTEGER;
BEGIN
  -- 중복 지급 방지: 이미 지급받았는지 확인
  IF EXISTS (
    SELECT 1 FROM user_rewards 
    WHERE user_id = p_user_id AND reward_type = p_reward_type
  ) THEN
    RETURN QUERY SELECT FALSE, '이미 지급받은 보상입니다', 0;
    RETURN;
  END IF;
  
  -- 보상 기록 추가
  INSERT INTO user_rewards (user_id, reward_type, reward_amount, metadata)
  VALUES (p_user_id, p_reward_type, p_reward_amount, p_metadata);
  
  -- 크레딧 충전
  UPDATE users
  SET credits = credits + p_reward_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits INTO v_new_credits;
  
  -- 트랜잭션 기록
  INSERT INTO credit_transactions (user_id, amount, balance_after, type, description)
  VALUES (p_user_id, p_reward_amount, v_new_credits, 'charge', 
    CASE p_reward_type
      WHEN 'signup' THEN '회원가입 보상'
      WHEN 'onboarding_completed' THEN '온보딩 완료 보상'
      WHEN 'first_generation_completed' THEN '첫 콘텐츠 생성 보상'
      WHEN 'streak_3days_completed' THEN '3일 연속 로그인 보상'
      WHEN 'referral' THEN '친구 초대 보상'
      ELSE '보상'
    END
  );
  
  RETURN QUERY SELECT TRUE, 
    format('🎉 %s크레딧 보상을 받았습니다!', p_reward_amount), 
    v_new_credits;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION claim_reward IS '보상 지급 함수 (중복 방지 포함)';

-- 6. 연속 로그인 체크 및 업데이트 함수
CREATE OR REPLACE FUNCTION check_and_update_login_streak(
  p_user_id UUID,
  p_login_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(login_streak INTEGER, streak_reward_eligible BOOLEAN) AS $$
DECLARE
  v_last_login_date DATE;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
  v_reward_eligible BOOLEAN := FALSE;
BEGIN
  -- 현재 로그인 정보 조회
  SELECT last_login_date, login_streak
  INTO v_last_login_date, v_current_streak
  FROM users
  WHERE id = p_user_id;
  
  -- 첫 로그인인 경우
  IF v_last_login_date IS NULL THEN
    v_new_streak := 1;
  -- 연속 로그인인 경우 (어제 로그인)
  ELSIF v_last_login_date = p_login_date - INTERVAL '1 day' THEN
    v_new_streak := v_current_streak + 1;
  -- 오늘 이미 로그인한 경우
  ELSIF v_last_login_date = p_login_date THEN
    v_new_streak := v_current_streak;
  -- 연속 끊긴 경우
  ELSE
    v_new_streak := 1;
  END IF;
  
  -- 3일 연속 달성 여부 확인
  IF v_new_streak >= 3 THEN
    -- 아직 보상을 받지 않았는지 확인
    IF NOT EXISTS (
      SELECT 1 FROM user_rewards 
      WHERE user_id = p_user_id AND reward_type = 'streak_3days_completed'
    ) THEN
      v_reward_eligible := TRUE;
    END IF;
  END IF;
  
  -- 로그인 정보 업데이트 (오늘 이미 로그인한 경우가 아니면)
  IF v_last_login_date != p_login_date THEN
    UPDATE users
    SET last_login_date = p_login_date,
        login_streak = v_new_streak,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  RETURN QUERY SELECT v_new_streak, v_reward_eligible;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_and_update_login_streak IS '연속 로그인 체크 및 보상 가능 여부 확인';

-- 7. 월간 사용량 증가 함수
CREATE OR REPLACE FUNCTION increment_monthly_usage(
  p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, monthly_usage INTEGER, monthly_remaining INTEGER) AS $$
DECLARE
  v_current_month TEXT := to_char(NOW(), 'YYYY-MM');
  v_monthly_usage INTEGER;
  v_monthly_limit INTEGER;
BEGIN
  -- 현재 월과 다르면 먼저 리셋
  UPDATE users
  SET monthly_usage = 0,
      current_month = v_current_month
  WHERE id = p_user_id AND (current_month IS NULL OR current_month != v_current_month);
  
  -- 월간 사용량 증가
  UPDATE users
  SET monthly_usage = monthly_usage + 1,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING monthly_usage, monthly_limit INTO v_monthly_usage, v_monthly_limit;
  
  RETURN QUERY SELECT TRUE, v_monthly_usage, (v_monthly_limit - v_monthly_usage);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_monthly_usage IS '월간 사용량 증가 (자동 리셋 포함)';

-- 8. 신규 회원 가입 트리거 수정 (5크레딧 + 보상 기록)
DROP TRIGGER IF EXISTS on_user_created ON users;
DROP FUNCTION IF EXISTS grant_initial_credits();

CREATE OR REPLACE FUNCTION grant_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- 신규 회원에게 5크레딧 지급
  NEW.credits := 5;
  NEW.current_month := to_char(NOW(), 'YYYY-MM');
  NEW.last_login_date := CURRENT_DATE;
  NEW.login_streak := 1;
  
  -- 회원가입 보상 기록 추가 (트리거 이후 실행됨)
  -- INSERT는 AFTER 트리거에서 처리
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION grant_initial_credits();

-- 회원가입 보상 기록 추가 (AFTER 트리거)
CREATE OR REPLACE FUNCTION record_signup_reward()
RETURNS TRIGGER AS $$
BEGIN
  -- 회원가입 보상 기록
  INSERT INTO user_rewards (user_id, reward_type, reward_amount, metadata)
  VALUES (NEW.id, 'signup', 5, jsonb_build_object('signup_date', NOW()));
  
  -- 트랜잭션 기록
  INSERT INTO credit_transactions (user_id, amount, balance_after, type, description)
  VALUES (NEW.id, 5, 5, 'charge', '회원가입 보상');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created_reward AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION record_signup_reward();

-- ==========================================
-- 완료: 크레딧 정책 v2.0 스키마 업데이트
-- ==========================================
-- 다음 단계:
-- 1. Supabase Cron Jobs 설정
--    - reset_monthly_usage() → 매월 1일 00:00 KST
--
-- 2. 테스트 쿼리 실행
--    SELECT * FROM reset_monthly_usage(); -- 수동 리셋 테스트
--    SELECT * FROM claim_reward('user-uuid', 'onboarding_completed'); -- 보상 지급 테스트
--    SELECT * FROM check_and_update_login_streak('user-uuid'); -- 연속 로그인 테스트
-- ==========================================
