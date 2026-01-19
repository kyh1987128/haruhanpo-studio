-- 🚀 회원가입 추가 필드 마이그레이션
-- ⚠️ 중요: Supabase SQL Editor에서 실행하세요

-- 1️⃣ users 테이블에 새 컬럼 추가
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS birth_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS terms_agreed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS collection_agreed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS personal_info_agreed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS age_14_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS custom_info_agreed BOOLEAN DEFAULT FALSE;

-- 2️⃣ 기존 컬럼 확인 (name, phone, privacy_agreed, marketing_agreed는 이미 존재할 수 있음)
-- 존재하지 않으면 추가
DO $$ 
BEGIN
  -- name 컬럼 확인
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='name') THEN
    ALTER TABLE users ADD COLUMN name TEXT DEFAULT NULL;
  END IF;
  
  -- phone 컬럼 확인
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='phone') THEN
    ALTER TABLE users ADD COLUMN phone TEXT DEFAULT NULL;
  END IF;
  
  -- privacy_agreed 컬럼 확인
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='privacy_agreed') THEN
    ALTER TABLE users ADD COLUMN privacy_agreed BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- marketing_agreed 컬럼 확인
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='marketing_agreed') THEN
    ALTER TABLE users ADD COLUMN marketing_agreed BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- registration_completed 컬럼 확인
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='registration_completed') THEN
    ALTER TABLE users ADD COLUMN registration_completed BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- registration_completed_at 컬럼 확인
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='registration_completed_at') THEN
    ALTER TABLE users ADD COLUMN registration_completed_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  
  -- terms_agreed_at 컬럼 확인
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='terms_agreed_at') THEN
    ALTER TABLE users ADD COLUMN terms_agreed_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- 3️⃣ 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_users_birth_date ON users(birth_date);
CREATE INDEX IF NOT EXISTS idx_users_registration_completed ON users(registration_completed);

-- 4️⃣ 제약 조건 추가
ALTER TABLE users
ADD CONSTRAINT check_gender CHECK (gender IN ('male', 'female') OR gender IS NULL),
ADD CONSTRAINT check_birth_date CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE);

-- 5️⃣ 검증 쿼리 (결과 확인)
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN (
    'name', 'gender', 'birth_date', 'phone',
    'terms_agreed', 'privacy_agreed', 'collection_agreed',
    'personal_info_agreed', 'age_14_confirmed', 
    'marketing_agreed', 'custom_info_agreed',
    'registration_completed', 'registration_completed_at', 'terms_agreed_at'
  )
ORDER BY ordinal_position;

-- 6️⃣ 샘플 데이터 확인
SELECT 
  id, email, name, gender, birth_date, phone,
  terms_agreed, privacy_agreed, registration_completed
FROM users
LIMIT 5;
