-- ===================================
-- 안전한 크레딧 차감 함수 (트랜잭션)
-- ===================================
-- 이 함수는 멀티탭/동시 요청 시에도 크레딧이 정확하게 차감되도록 보장합니다.
-- FOR UPDATE를 사용하여 행 잠금(Row Locking)을 구현합니다.

CREATE OR REPLACE FUNCTION deduct_credits_safe(
  p_user_id UUID,
  p_required_credits INTEGER
)
RETURNS JSONB AS $$
DECLARE
  current_free INTEGER;
  current_paid INTEGER;
  new_free INTEGER;
  new_paid INTEGER;
BEGIN
  -- 🔒 행 잠금으로 동시 접근 완전 차단
  -- 다른 트랜잭션은 이 행의 잠금이 해제될 때까지 대기
  SELECT free_credits, paid_credits 
  INTO current_free, current_paid
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- 사용자가 존재하지 않는 경우
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- 크레딧 부족 체크
  IF (current_free + current_paid) < p_required_credits THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', 
                    p_required_credits, (current_free + current_paid);
  END IF;
  
  -- 무료 크레딧 우선 차감
  IF current_free >= p_required_credits THEN
    -- 무료 크레딧만으로 충분
    new_free := current_free - p_required_credits;
    new_paid := current_paid;
  ELSE
    -- 무료 크레딧을 모두 사용하고 나머지는 유료 크레딧에서 차감
    new_free := 0;
    new_paid := current_paid - (p_required_credits - current_free);
  END IF;
  
  -- 업데이트 실행
  UPDATE users
  SET free_credits = new_free,
      paid_credits = new_paid,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 결과 반환
  RETURN jsonb_build_object(
    'success', true,
    'free_credits', new_free,
    'paid_credits', new_paid,
    'total_remaining', new_free + new_paid,
    'deducted_from_free', current_free - new_free,
    'deducted_from_paid', current_paid - new_paid
  );
END;
$$ LANGUAGE plpgsql;

-- 사용 예시:
-- SELECT deduct_credits_safe('user-uuid-here', 10);

-- 권한 설정 (필요시)
-- GRANT EXECUTE ON FUNCTION deduct_credits_safe(UUID, INTEGER) TO authenticated;
