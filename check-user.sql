-- 현재 사용자 확인
SELECT 
  id,
  email,
  name,
  created_at,
  free_credits,
  paid_credits
FROM users
WHERE email = 'kyh1987128@gmail.com';

-- 모든 사용자 목록
SELECT 
  id,
  email,
  name,
  created_at
FROM users
ORDER BY created_at DESC;
