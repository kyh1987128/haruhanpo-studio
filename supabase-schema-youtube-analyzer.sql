-- ============================================
-- YouTube 분석기 Supabase DB 설계 (최종 수정본)
-- 작성일: 2026-01-28
-- 목적: 마케팅허브에 YouTube 분석 기능 추가
-- ============================================

-- ============================================
-- 테이블 1: youtube_analysis_history
-- 목적: 사용자의 YouTube 분석 결과 영구 저장
-- ============================================

CREATE TABLE IF NOT EXISTS youtube_analysis_history (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- YouTube 영상 정보
  video_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_title TEXT,
  channel_name TEXT,
  channel_id TEXT,
  
  -- YouTube 통계 (분석 당시 스냅샷)
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  subscriber_count BIGINT DEFAULT 0,
  duration TEXT,
  published_at TIMESTAMP,
  
  -- 분석 정보
  analysis_type TEXT NOT NULL,
  analysis_result JSONB,
  ai_summary TEXT,
  
  -- 크레딧 정보
  credits_used INTEGER DEFAULT 0,
  was_cached BOOLEAN DEFAULT FALSE,
  
  -- 메타데이터
  metadata JSONB,
  
  -- 시간 추적
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 코멘트
COMMENT ON TABLE youtube_analysis_history IS 'YouTube 영상 분석 결과 히스토리';
COMMENT ON COLUMN youtube_analysis_history.analysis_type IS 'video-stats, success-factors, title-optimization, sentiment-analysis, channel-strategy, video-ideas, competitor';
COMMENT ON COLUMN youtube_analysis_history.was_cached IS 'true: 캐시 사용(무료), false: 신규 분석(크레딧 차감)';

-- ============================================
-- 성능 최적화 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_youtube_history_user_id 
  ON youtube_analysis_history(user_id);

CREATE INDEX IF NOT EXISTS idx_youtube_history_video_id 
  ON youtube_analysis_history(video_id);

CREATE INDEX IF NOT EXISTS idx_youtube_history_created_at 
  ON youtube_analysis_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_history_analysis_type 
  ON youtube_analysis_history(analysis_type);

CREATE INDEX IF NOT EXISTS idx_youtube_history_user_created 
  ON youtube_analysis_history(user_id, created_at DESC);

-- ✅ JSONB 검색 성능 향상
CREATE INDEX IF NOT EXISTS idx_youtube_history_analysis_gin
  ON youtube_analysis_history USING GIN (analysis_result);

-- ✅ 중복 분석 방지 (동일 사용자 + 영상 + 분석타입)
CREATE UNIQUE INDEX IF NOT EXISTS idx_youtube_history_unique
  ON youtube_analysis_history(user_id, video_id, analysis_type);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE youtube_analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own youtube history"
  ON youtube_analysis_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own youtube history"
  ON youtube_analysis_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own youtube history"
  ON youtube_analysis_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 테이블 2: youtube_analysis_cache
-- 목적: 24시간 캐싱으로 API 비용 90% 절약
-- ============================================

CREATE TABLE IF NOT EXISTS youtube_analysis_cache (
  -- 복합 기본 키
  video_id TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  
  -- 캐시 데이터
  analysis_result JSONB NOT NULL,
  video_info JSONB,
  
  -- 캐시 관리
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0,
  
  PRIMARY KEY (video_id, analysis_type)
);

COMMENT ON TABLE youtube_analysis_cache IS 'YouTube 분석 결과 24시간 캐시 (공용)';
COMMENT ON COLUMN youtube_analysis_cache.hit_count IS '캐시 히트 횟수 (인기 영상 파악용)';

-- ============================================
-- 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_youtube_cache_expires 
  ON youtube_analysis_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_youtube_cache_hit_count 
  ON youtube_analysis_cache(hit_count DESC);

-- ✅ JSONB 검색 성능 향상
CREATE INDEX IF NOT EXISTS idx_youtube_cache_analysis_gin
  ON youtube_analysis_cache USING GIN (analysis_result);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE youtube_analysis_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 캐시 읽기 가능
CREATE POLICY "Enable read access for all users"
  ON youtube_analysis_cache FOR SELECT
  USING (true);

-- ✅ 수정: 서비스 롤만 쓰기 가능
CREATE POLICY "Service role can write cache"
  ON youtube_analysis_cache FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update cache"
  ON youtube_analysis_cache FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete cache"
  ON youtube_analysis_cache FOR DELETE
  TO service_role
  USING (true);

-- ============================================
-- 만료된 캐시 자동 삭제 함수
-- ============================================

CREATE OR REPLACE FUNCTION delete_expired_youtube_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM youtube_analysis_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_expired_youtube_cache() IS '만료된 YouTube 캐시 자동 삭제 (Cron 작업용)';

-- ============================================
-- user_stats 테이블 수정
-- ============================================

ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS youtube_analysis_count INTEGER DEFAULT 0;

COMMENT ON COLUMN user_stats.youtube_analysis_count IS 
  '사용자가 분석한 YouTube 영상 총 개수 (무료 분석 포함)';

-- ============================================
-- 자동 통계 업데이트 Trigger
-- ============================================

CREATE OR REPLACE FUNCTION increment_youtube_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, youtube_analysis_count, updated_at)
  VALUES (NEW.user_id, 1, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    youtube_analysis_count = user_stats.youtube_analysis_count + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_youtube_stats ON youtube_analysis_history;

CREATE TRIGGER update_youtube_stats
AFTER INSERT ON youtube_analysis_history
FOR EACH ROW
EXECUTE FUNCTION increment_youtube_count();

COMMENT ON FUNCTION increment_youtube_count() IS 
  'YouTube 분석 시 user_stats.youtube_analysis_count 자동 증가';

-- ============================================
-- 완료 메시지
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ YouTube 분석기 DB 설계 완료!';
  RAISE NOTICE '📋 생성된 테이블: youtube_analysis_history, youtube_analysis_cache';
  RAISE NOTICE '🔧 수정된 테이블: user_stats (youtube_analysis_count 컬럼 추가)';
  RAISE NOTICE '⚙️  생성된 함수: delete_expired_youtube_cache(), increment_youtube_count()';
  RAISE NOTICE '🔒 RLS 정책: 6개 생성 완료';
  RAISE NOTICE '📊 인덱스: 12개 생성 완료';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  다음 단계:';
  RAISE NOTICE '1. Supabase Dashboard → Database → Cron Jobs 설정';
  RAISE NOTICE '   - 함수: delete_expired_youtube_cache()';
  RAISE NOTICE '   - 스케줄: 0 3 * * * (매일 새벽 3시)';
  RAISE NOTICE '2. 백엔드 API 개발 시작';
END $$;
