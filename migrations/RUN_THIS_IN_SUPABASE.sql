-- 🚀 Supabase SQL Editor에서 실행하세요
-- ⚠️ 중요: 먼저 백업을 권장합니다

-- 1️⃣ 컬럼 추가
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS platform_scheduled_dates JSONB DEFAULT NULL;

-- 2️⃣ 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_generations_images 
ON generations USING GIN (images);

CREATE INDEX IF NOT EXISTS idx_generations_platform_scheduled_dates
ON generations USING GIN (platform_scheduled_dates);

-- 3️⃣ 기존 데이터 마이그레이션
UPDATE generations
SET platform_scheduled_dates = (
  SELECT jsonb_object_agg(platform, scheduled_date)
  FROM unnest(platforms) AS platform
)
WHERE scheduled_date IS NOT NULL
  AND platforms IS NOT NULL
  AND array_length(platforms, 1) > 0
  AND platform_scheduled_dates IS NULL;

-- 4️⃣ 검증 (결과 확인)
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as with_date,
  COUNT(CASE WHEN platform_scheduled_dates IS NOT NULL THEN 1 END) as with_platform_dates
FROM generations;
