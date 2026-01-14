-- ====================================
-- 마케팅허브 DB 스키마 통합 확장
-- ====================================
-- 목적: 이미지 정보 + 플랫폼별 날짜를 한 번에 추가
-- 작성일: 2026-01-14

-- 1단계: 새 컬럼 추가 (NULL 허용으로 안전하게)
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS platform_scheduled_dates JSONB DEFAULT NULL;

-- 2단계: 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generations_images 
ON generations USING GIN (images);

CREATE INDEX IF NOT EXISTS idx_generations_platform_scheduled_dates
ON generations USING GIN (platform_scheduled_dates);

-- 3단계: 기존 데이터 마이그레이션 (scheduled_date → platform_scheduled_dates)
-- 이미 scheduled_date가 있는 데이터를 platform_scheduled_dates로 복사
UPDATE generations
SET platform_scheduled_dates = (
  SELECT jsonb_object_agg(platform, scheduled_date)
  FROM unnest(platforms) AS platform
)
WHERE scheduled_date IS NOT NULL
  AND platforms IS NOT NULL
  AND array_length(platforms, 1) > 0
  AND platform_scheduled_dates IS NULL;

-- 4단계: 검증 쿼리
SELECT 
  COUNT(*) as total_generations,
  COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as with_scheduled_date,
  COUNT(CASE WHEN platform_scheduled_dates IS NOT NULL THEN 1 END) as with_platform_dates,
  COUNT(CASE WHEN images IS NOT NULL THEN 1 END) as with_images
FROM generations;

-- 5단계: 샘플 데이터 확인
SELECT 
  id,
  platforms,
  scheduled_date,
  platform_scheduled_dates,
  images,
  created_at
FROM generations
ORDER BY created_at DESC
LIMIT 5;
