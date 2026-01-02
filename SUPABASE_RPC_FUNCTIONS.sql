-- ===================================
-- Supabase RPC Functions for 하루한포
-- 작성일: 2026-01-02
-- 버전: v7.7.0
-- ===================================

-- 실행 방법:
-- 1. Supabase Dashboard 접속: https://supabase.com/dashboard
-- 2. 프로젝트 선택: gmjbsndricdogtqsovnb
-- 3. 좌측 메뉴: SQL Editor → New Query
-- 4. 아래 SQL 스크립트 전체 복사 → 붙여넣기 → Run

-- ===================================
-- 1. grant_milestone_credit
-- 마일스톤 달성 시 크레딧 지급
-- ===================================
CREATE OR REPLACE FUNCTION grant_milestone_credit(
  user_id_param UUID,
  milestone_type TEXT
) RETURNS JSON AS $$
DECLARE
  new_credits INTEGER;
  reward_amount INTEGER := 5;
  already_claimed BOOLEAN;
BEGIN
  -- 중복 지급 방지: users 테이블 BOOLEAN 컬럼 체크
  IF milestone_type = 'onboarding_completed' THEN
    -- 온보딩 완료 체크
    SELECT onboarding_completed INTO already_claimed
    FROM users WHERE id = user_id_param;
    
    IF already_claimed THEN
      RETURN json_build_object(
        'success', false,
        'message', '이미 지급된 보상입니다',
        'new_credits', (SELECT credits FROM users WHERE id = user_id_param)
      );
    END IF;
    
    -- 크레딧 지급 및 플래그 업데이트
    UPDATE users 
    SET onboarding_completed = true, 
        credits = credits + reward_amount,
        updated_at = NOW()
    WHERE id = user_id_param
    RETURNING credits INTO new_credits;
    
  ELSIF milestone_type = 'first_generation_completed' THEN
    -- 첫 생성 완료 체크
    SELECT first_generation_completed INTO already_claimed
    FROM users WHERE id = user_id_param;
    
    IF already_claimed THEN
      RETURN json_build_object(
        'success', false,
        'message', '이미 지급된 보상입니다',
        'new_credits', (SELECT credits FROM users WHERE id = user_id_param)
      );
    END IF;
    
    -- 크레딧 지급 및 플래그 업데이트
    UPDATE users 
    SET first_generation_completed = true, 
        credits = credits + reward_amount,
        updated_at = NOW()
    WHERE id = user_id_param
    RETURNING credits INTO new_credits;
    
  ELSIF milestone_type = 'streak_3days_completed' THEN
    -- 3일 연속 로그인 보상 (반복 지급 가능)
    UPDATE users 
    SET credits = credits + reward_amount,
        updated_at = NOW()
    WHERE id = user_id_param
    RETURNING credits INTO new_credits;
    
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', '알 수 없는 마일스톤 타입입니다'
    );
  END IF;
  
  -- credit_transactions 테이블에 기록 (있다면)
  BEGIN
    INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
    VALUES (user_id_param, reward_amount, 'reward', milestone_type);
  EXCEPTION
    WHEN undefined_table THEN
      NULL; -- credit_transactions 테이블이 없으면 무시
  END;
  
  RETURN json_build_object(
    'success', true,
    'new_credits', new_credits,
    'reward_amount', reward_amount,
    'message', milestone_type || ' 보상 지급 완료'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 2. update_consecutive_login
-- 연속 로그인 일수 업데이트
-- ===================================
CREATE OR REPLACE FUNCTION update_consecutive_login(
  user_id_param UUID
) RETURNS JSON AS $$
DECLARE
  last_login DATE;
  current_streak INTEGER;
  new_streak INTEGER;
  today DATE := CURRENT_DATE;
  streak_reward_eligible BOOLEAN := false;
BEGIN
  -- 현재 사용자 정보 가져오기
  SELECT last_login_date, consecutive_login_days 
  INTO last_login, current_streak
  FROM users 
  WHERE id = user_id_param;
  
  -- 첫 로그인
  IF last_login IS NULL THEN
    new_streak := 1;
    
  -- 오늘 이미 로그인함 (중복 카운트 방지)
  ELSIF last_login = today THEN
    new_streak := current_streak;
    RETURN json_build_object(
      'consecutive_days', new_streak,
      'streak_reward_eligible', false,
      'message', '오늘 이미 로그인했습니다'
    );
    
  -- 어제 로그인함 (연속 유지)
  ELSIF last_login = today - INTERVAL '1 day' THEN
    new_streak := current_streak + 1;
    
    -- 3일 연속 달성 시 보상 자격 부여
    IF new_streak >= 3 AND current_streak < 3 THEN
      streak_reward_eligible := true;
    END IF;
    
  -- 2일 이상 공백 (연속 끊김)
  ELSE
    new_streak := 1;
  END IF;
  
  -- 업데이트
  UPDATE users 
  SET last_login_date = today, 
      consecutive_login_days = new_streak,
      updated_at = NOW()
  WHERE id = user_id_param;
  
  RETURN json_build_object(
    'consecutive_days', new_streak,
    'streak_reward_eligible', streak_reward_eligible,
    'last_login_date', today,
    'message', new_streak || '일 연속 로그인'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 3. check_and_use_monthly_quota
-- 월간 무료 쿼터 체크 및 사용
-- ===================================
CREATE OR REPLACE FUNCTION check_and_use_monthly_quota(
  user_id_param UUID
) RETURNS JSON AS $$
DECLARE
  current_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  user_record RECORD;
  available BOOLEAN;
  remaining INTEGER;
  used_quota BOOLEAN := false;
BEGIN
  -- 사용자 정보 조회
  SELECT * INTO user_record 
  FROM users 
  WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'available', false,
      'remaining', 0,
      'message', '사용자를 찾을 수 없습니다'
    );
  END IF;
  
  -- 월 리셋 체크 (새 달이 시작되었는지)
  IF user_record.monthly_usage_reset_date IS NULL OR 
     DATE_TRUNC('month', user_record.monthly_usage_reset_date)::DATE < current_month THEN
    -- 새 달 시작: 무료 횟수 리셋
    UPDATE users 
    SET monthly_free_usage_count = 0,
        monthly_usage_reset_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = user_id_param
    RETURNING * INTO user_record;
  END IF;
  
  -- 무료 횟수 체크 (월 10회 제한)
  IF user_record.monthly_free_usage_count < 10 THEN
    -- 무료 횟수 사용 가능
    UPDATE users 
    SET monthly_free_usage_count = monthly_free_usage_count + 1,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    available := true;
    remaining := 10 - user_record.monthly_free_usage_count - 1;
    used_quota := true;
    
    RETURN json_build_object(
      'available', true,
      'remaining', remaining,
      'used_quota', true,
      'used_credit', false,
      'message', '무료 사용 완료 (남은 횟수: ' || remaining || '회)'
    );
  ELSE
    -- 무료 횟수 소진, 크레딧 체크
    IF user_record.credits > 0 THEN
      available := true;
      remaining := 0;
      
      RETURN json_build_object(
        'available', true,
        'remaining', 0,
        'used_quota', false,
        'used_credit', false, -- 실제 크레딧 차감은 별도 함수에서
        'message', '무료 횟수 소진. 크레딧 사용 가능 (보유: ' || user_record.credits || '크레딧)'
      );
    ELSE
      -- 크레딧도 없음
      available := false;
      remaining := 0;
      
      RETURN json_build_object(
        'available', false,
        'remaining', 0,
        'message', '무료 횟수 및 크레딧이 부족합니다'
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 4. deduct_credit
-- 크레딧 차감 (콘텐츠 생성 시)
-- ===================================
CREATE OR REPLACE FUNCTION deduct_credit(
  user_id_param UUID,
  generation_id_param UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- 현재 크레딧 확인
  SELECT credits INTO current_credits
  FROM users
  WHERE id = user_id_param;
  
  IF current_credits IS NULL OR current_credits < 1 THEN
    RETURN false; -- 크레딧 부족
  END IF;
  
  -- 크레딧 차감
  UPDATE users
  SET credits = credits - 1,
      updated_at = NOW()
  WHERE id = user_id_param;
  
  -- credit_transactions 테이블에 기록 (있다면)
  BEGIN
    INSERT INTO credit_transactions (user_id, amount, transaction_type, description, generation_id)
    VALUES (user_id_param, -1, 'usage', '콘텐츠 생성', generation_id_param);
  EXCEPTION
    WHEN undefined_table THEN
      NULL; -- credit_transactions 테이블이 없으면 무시
  END;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 5. grant_referral_reward
-- 친구 초대 보상 지급
-- ===================================
CREATE OR REPLACE FUNCTION grant_referral_reward(
  p_referral_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_referral RECORD;
  reward_amount INTEGER := 10;
BEGIN
  -- referrals 테이블에서 정보 조회
  SELECT * INTO v_referral
  FROM referrals
  WHERE id = p_referral_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- 이미 지급된 경우
  IF v_referral.reward_granted THEN
    RETURN false;
  END IF;
  
  -- 피추천인(referred_user_id)에게 크레딧 지급
  UPDATE users
  SET credits = credits + reward_amount,
      updated_at = NOW()
  WHERE id = v_referral.referred_user_id;
  
  -- referrals 테이블 업데이트
  UPDATE referrals
  SET reward_granted = true
  WHERE id = p_referral_id;
  
  -- credit_transactions 기록
  BEGIN
    INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
    VALUES (v_referral.referred_user_id, reward_amount, 'referral', '친구 초대 보상');
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 테스트 쿼리 (실행 후 확인)
-- ===================================

-- 1. 마일스톤 크레딧 지급 테스트
-- SELECT grant_milestone_credit('사용자UUID', 'onboarding_completed');

-- 2. 연속 로그인 업데이트 테스트
-- SELECT update_consecutive_login('사용자UUID');

-- 3. 월간 쿼터 체크 테스트
-- SELECT check_and_use_monthly_quota('사용자UUID');

-- 4. 크레딧 차감 테스트
-- SELECT deduct_credit('사용자UUID');

-- 5. 리퍼럴 보상 테스트
-- SELECT grant_referral_reward('리퍼럴UUID');

-- ===================================
-- 완료!
-- ===================================
-- 이제 백엔드(src/index.tsx)에서 이 RPC 함수들을 호출할 수 있습니다.
-- 예: await grantMilestoneCredit(supabase, user_id, 'onboarding_completed')
