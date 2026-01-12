-- ==========================================
-- 하루한포 크레딧 패키지 정책 변경 (방안 B)
-- ==========================================
-- 실행 방법: Supabase Dashboard → SQL Editor → RUN
-- ==========================================

-- ==========================================
-- 1단계: credit_products 테이블 생성 (없는 경우)
-- ==========================================
CREATE TABLE IF NOT EXISTS credit_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- 패키지 이름 (스타터, 베이직, 프로 등)
  credits INTEGER NOT NULL CHECK (credits > 0),  -- 크레딧 개수
  original_price INTEGER NOT NULL CHECK (original_price > 0),  -- 정가
  discount_rate INTEGER DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate <= 100),  -- 할인율 (%)
  price INTEGER NOT NULL CHECK (price > 0),  -- 최종 가격 (할인 적용 후)
  description TEXT,                      -- 패키지 설명
  is_active BOOLEAN DEFAULT true,        -- 활성화 여부
  display_order INTEGER DEFAULT 0,       -- 표시 순서 (작을수록 우선)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 테이블 코멘트
COMMENT ON TABLE credit_products IS '크레딧 패키지 상품 정보';
COMMENT ON COLUMN credit_products.name IS '패키지 이름 (스타터, 베이직, 프로, 비즈니스, 엔터프라이즈)';
COMMENT ON COLUMN credit_products.credits IS '크레딧 개수';
COMMENT ON COLUMN credit_products.original_price IS '정가 (원화)';
COMMENT ON COLUMN credit_products.discount_rate IS '할인율 (%)';
COMMENT ON COLUMN credit_products.price IS '최종 판매가 (원화, 할인 적용 후)';
COMMENT ON COLUMN credit_products.is_active IS '판매 활성화 여부';
COMMENT ON COLUMN credit_products.display_order IS '표시 순서 (작을수록 먼저 표시)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_credit_products_active ON credit_products(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_products_order ON credit_products(display_order);

-- ==========================================
-- 2단계: 기존 데이터 백업 (있는 경우)
-- ==========================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM credit_products LIMIT 1) THEN
    -- 백업 테이블이 없으면 생성
    DROP TABLE IF EXISTS credit_products_backup_v1;
    CREATE TABLE credit_products_backup_v1 AS 
    SELECT * FROM credit_products;
    
    RAISE NOTICE '✅ 기존 데이터 백업 완료: credit_products_backup_v1';
  ELSE
    RAISE NOTICE 'ℹ️ 기존 데이터 없음 - 백업 건너뜀';
  END IF;
END $$;

-- ==========================================
-- 3단계: 기존 데이터 삭제
-- ==========================================
TRUNCATE TABLE credit_products;

-- ==========================================
-- 4단계: 새로운 크레딧 패키지 데이터 삽입 (방안 B)
-- ==========================================
INSERT INTO credit_products (
  name, 
  credits, 
  original_price, 
  discount_rate, 
  price, 
  description, 
  is_active, 
  display_order
) VALUES
  -- 스타터 (10개, ₩300, 할인 없음)
  (
    '스타터', 
    10, 
    300, 
    0, 
    300, 
    '🎯 시작하기 좋은 가격', 
    true, 
    1
  ),
  
  -- 베이직 (50개, ₩1,425, 5% 할인)
  (
    '베이직', 
    50, 
    1500, 
    5, 
    1425, 
    '🚀 가장 인기 있는 선택', 
    true, 
    2
  ),
  
  -- 프로 (100개, ₩2,700, 10% 할인)
  (
    '프로', 
    100, 
    3000, 
    10, 
    2700, 
    '⭐ 프로를 위한 선택', 
    true, 
    3
  ),
  
  -- 비즈니스 (500개, ₩12,750, 15% 할인)
  (
    '비즈니스', 
    500, 
    15000, 
    15, 
    12750, 
    '💼 비즈니스 최적화', 
    true, 
    4
  ),
  
  -- 엔터프라이즈 (1,000개, ₩24,000, 20% 할인)
  (
    '엔터프라이즈', 
    1000, 
    30000, 
    20, 
    24000, 
    '🏢 대량 사용자용', 
    true, 
    5
  );

-- ==========================================
-- 5단계: 데이터 검증
-- ==========================================
DO $$
DECLARE
  product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO product_count FROM credit_products WHERE is_active = true;
  
  IF product_count = 5 THEN
    RAISE NOTICE '✅ 크레딧 패키지 등록 완료: 총 %개', product_count;
  ELSE
    RAISE WARNING '⚠️ 예상과 다른 개수: %개 (기대값: 5개)', product_count;
  END IF;
END $$;

-- ==========================================
-- 6단계: 결과 확인 쿼리
-- ==========================================
SELECT 
  name AS 패키지명,
  credits AS 크레딧,
  original_price AS 정가,
  discount_rate || '%' AS 할인율,
  price AS 최종가격,
  ROUND((price::NUMERIC / credits::NUMERIC), 2) AS 개당가격,
  description AS 설명,
  is_active AS 활성화,
  display_order AS 순서
FROM credit_products
ORDER BY display_order;

-- ==========================================
-- 완료: 크레딧 패키지 정책 변경 (방안 B)
-- ==========================================
-- 다음 단계:
-- 1. 프론트엔드 payment.html에서 가격 표시 확인
-- 2. GET /api/products API 호출하여 데이터 확인
-- 3. 결제 프로세스 테스트
-- ==========================================

-- 추가 쿼리: 가격 비교표
SELECT 
  '패키지' AS 구분,
  '크레딧' AS 개수,
  '정가' AS 원래가격,
  '할인율' AS 할인,
  '최종가' AS 판매가,
  '개당가' AS 단가
UNION ALL
SELECT 
  name,
  credits::TEXT,
  '₩' || original_price::TEXT,
  discount_rate || '%',
  '₩' || price::TEXT,
  '₩' || ROUND((price::NUMERIC / credits::NUMERIC))::TEXT
FROM credit_products
ORDER BY display_order;
