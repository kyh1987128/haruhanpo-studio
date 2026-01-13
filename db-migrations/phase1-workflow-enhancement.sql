-- ==========================================
-- Phase 1: 워크플로우 혁신 DB 설계
-- ==========================================
-- 프로젝트: 마케팅허브 (Marketing Hub)
-- 버전: v8.3+
-- 소요 시간: 30분
-- 실행 방법: Supabase Dashboard → SQL Editor → 전체 복사 붙여넣기 → RUN
-- ==========================================

-- ==========================================
-- 1. users 테이블 확장 (SNS 링크 + AI 도구 선호도)
-- ==========================================

-- SNS 링크 저장 (JSONB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS my_sns_links JSONB DEFAULT '{}';

-- AI 도구 선호도 저장 (JSONB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS my_ai_tools JSONB DEFAULT '{}';

-- 컬럼 코멘트 추가
COMMENT ON COLUMN users.my_sns_links IS '사용자의 SNS 계정 링크 (Instagram, Facebook, YouTube, Twitter, LinkedIn, Blog, TikTok, Brunch, Threads, KakaoTalk 등 12개 플랫폼)';
COMMENT ON COLUMN users.my_ai_tools IS '사용자가 선호하는 AI 도구 설정 (OpenAI, Gemini, Claude 등)';

-- ==========================================
-- my_sns_links 데이터 구조 예시:
-- {
--   "instagram": "https://instagram.com/username",
--   "facebook": "https://facebook.com/username",
--   "youtube": "https://youtube.com/@username",
--   "twitter": "https://twitter.com/username",
--   "linkedin": "https://linkedin.com/in/username",
--   "blog": "https://blog.naver.com/username",
--   "tiktok": "https://tiktok.com/@username",
--   "brunch": "https://brunch.co.kr/@username",
--   "threads": "https://threads.net/@username",
--   "instagram_reels": "https://instagram.com/username/reels",
--   "youtube_shorts": "https://youtube.com/@username/shorts",
--   "kakaotalk": "https://pf.kakao.com/_username"
-- }
-- ==========================================

-- ==========================================
-- my_ai_tools 데이터 구조 예시:
-- {
--   "preferred_model": "gpt-4o",
--   "image_analysis": "gemini-flash",
--   "content_generation": "gpt-4o",
--   "auto_hybrid": true
-- }
-- ==========================================

-- JSONB 컬럼에 GIN 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_sns_links ON users USING GIN (my_sns_links);
CREATE INDEX IF NOT EXISTS idx_users_ai_tools ON users USING GIN (my_ai_tools);

-- ==========================================
-- 2. generations 테이블 확장 (워크플로우 데이터 + 플랫폼 콘텐츠 + 이미지 메타데이터)
-- ==========================================

-- 워크플로우 데이터 저장 (JSONB)
ALTER TABLE generations ADD COLUMN IF NOT EXISTS workflow_data JSONB DEFAULT '{}';

-- 플랫폼별 생성된 콘텐츠 저장 (JSONB)
ALTER TABLE generations ADD COLUMN IF NOT EXISTS platform_contents JSONB DEFAULT '{}';

-- 사용된 이미지 메타데이터 저장 (JSONB)
ALTER TABLE generations ADD COLUMN IF NOT EXISTS used_images JSONB DEFAULT '[]';

-- 컬럼 코멘트 추가
COMMENT ON COLUMN generations.workflow_data IS '워크플로우 메타데이터 (입력 정보, 설정값, 이미지 배치 전략 등)';
COMMENT ON COLUMN generations.platform_contents IS '플랫폼별 생성된 콘텐츠 전체 저장 (히스토리 조회 및 재사용용)';
COMMENT ON COLUMN generations.used_images IS '콘텐츠 생성에 사용된 이미지 정보 (URL, 출처, 캡션, 플랫폼별 배치 위치 등)';

-- ==========================================
-- workflow_data 데이터 구조 예시:
-- {
--   "brand": "마산 어시장",
--   "keywords": ["마산", "어시장", "신선한 해산물"],
--   "tone": "친근한",
--   "target_age": "30-40대",
--   "industry": "식품",
--   "content_strategy": "auto",
--   "image_placement": true,
--   "image_sources": {
--     "user_upload": 1,
--     "unsplash": 1,
--     "ai_generated": 1
--   }
-- }
-- ==========================================

-- ==========================================
-- platform_contents 데이터 구조 예시:
-- {
--   "blog": "<h1>마산 어시장 방문 후기</h1><p>...</p><figure>...</figure>",
--   "instagram": "마산 어시장에서 신선한 해산물을 만나보세요! 🐟\n\n...",
--   "brunch": "# 마산 어시장 방문 후기\n\n![이미지](https://...)...",
--   "threads": "마산 어시장 추천! 신선한 해산물과 활기찬 분위기...",
--   "youtube_shorts": "🎬 마산 어시장 숏폼 스크립트:\n\n[장면1] ..."
-- }
-- ==========================================

-- ==========================================
-- used_images 데이터 구조 예시:
-- [
--   {
--     "url": "https://blob.storage/img1.jpg",
--     "source": "user_upload",
--     "alt": "마산 어시장 전경",
--     "caption": "활기찬 어시장의 모습",
--     "position": 1,
--     "platforms": ["blog", "brunch"]
--   },
--   {
--     "url": "https://images.unsplash.com/photo-123",
--     "source": "unsplash",
--     "alt": "신선한 해산물",
--     "caption": "다양한 수산물들",
--     "position": 2,
--     "platforms": ["blog", "instagram"]
--   },
--   {
--     "url": "https://oaidalleapiprodscus.blob.core.windows.net/...",
--     "source": "ai_generated",
--     "alt": "전통 시장 분위기",
--     "caption": "한국의 전통 시장 정취",
--     "position": 3,
--     "platforms": ["blog"]
--   }
-- ]
-- ==========================================

-- JSONB 컬럼에 GIN 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generations_workflow ON generations USING GIN (workflow_data);
CREATE INDEX IF NOT EXISTS idx_generations_platform_contents ON generations USING GIN (platform_contents);
CREATE INDEX IF NOT EXISTS idx_generations_images ON generations USING GIN (used_images);

-- ==========================================
-- 3. 샘플 데이터 삽입 (테스트용)
-- ==========================================

-- 샘플 사용자 데이터 업데이트 (첫 번째 사용자에게만 적용)
UPDATE users
SET 
  my_sns_links = '{
    "instagram": "https://instagram.com/marketinghub",
    "blog": "https://blog.naver.com/marketinghub",
    "youtube": "https://youtube.com/@marketinghub"
  }'::jsonb,
  my_ai_tools = '{
    "preferred_model": "gpt-4o",
    "image_analysis": "gemini-flash",
    "auto_hybrid": true
  }'::jsonb
WHERE id = (SELECT id FROM users LIMIT 1);

-- ==========================================
-- 4. 확인 쿼리
-- ==========================================

-- users 테이블 확장 확인
-- SELECT id, email, my_sns_links, my_ai_tools FROM users LIMIT 1;

-- generations 테이블 확장 확인
-- SELECT id, user_id, workflow_data, platform_contents, used_images FROM generations LIMIT 1;

-- ==========================================
-- Phase 1 마이그레이션 완료
-- ==========================================
-- 다음 단계:
-- 1. 위 쿼리로 테이블 구조 확인
-- 2. 프론트엔드에서 API 연동 테스트
-- 3. Phase 3 (커뮤니티 시스템) 진행
-- ==========================================
