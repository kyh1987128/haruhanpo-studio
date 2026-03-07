-- ========================================
-- YouTube Trends 테이블 스키마
-- ========================================

-- 1. 트렌딩 키워드 테이블
CREATE TABLE IF NOT EXISTS trending_keywords (
  id BIGSERIAL PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  score FLOAT NOT NULL DEFAULT 0,
  estimated_views INTEGER NOT NULL DEFAULT 0,
  sample_video_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_trending_keywords_score ON trending_keywords(score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_keywords_category ON trending_keywords(category);
CREATE INDEX IF NOT EXISTS idx_trending_keywords_updated_at ON trending_keywords(updated_at);

-- 2. 트렌딩 비디오 테이블
CREATE TABLE IF NOT EXISTS trending_videos (
  id BIGSERIAL PRIMARY KEY,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_trending_videos_views ON trending_videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_trending_videos_category ON trending_videos(category);
CREATE INDEX IF NOT EXISTS idx_trending_videos_updated_at ON trending_videos(updated_at);
CREATE INDEX IF NOT EXISTS idx_trending_videos_published_at ON trending_videos(published_at DESC);

-- 3. 채널 북마크 테이블
CREATE TABLE IF NOT EXISTS channel_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  subscriber_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_channel_bookmarks_user_id ON channel_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_bookmarks_channel_id ON channel_bookmarks(channel_id);

-- ========================================
-- RLS (Row Level Security) 정책
-- ========================================

-- RLS 활성화
ALTER TABLE trending_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_bookmarks ENABLE ROW LEVEL SECURITY;

-- 트렌딩 키워드: 모든 사용자 읽기 가능
CREATE POLICY "Anyone can read trending_keywords"
  ON trending_keywords FOR SELECT
  TO authenticated, anon
  USING (true);

-- 트렌딩 비디오: 모든 사용자 읽기 가능
CREATE POLICY "Anyone can read trending_videos"
  ON trending_videos FOR SELECT
  TO authenticated, anon
  USING (true);

-- 채널 북마크: 소유자만 읽기/쓰기 가능
CREATE POLICY "Users can read their own bookmarks"
  ON channel_bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can insert their own bookmarks"
  ON channel_bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON channel_bookmarks FOR UPDATE
  TO authenticated
  USING (auth.uid()::TEXT = user_id)
  WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON channel_bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid()::TEXT = user_id);

-- ========================================
-- 서비스 역할 접근 허용 (Worker용)
-- ========================================

-- 서비스 역할은 모든 정책을 우회하므로 별도 정책 불필요
-- Worker에서는 service_role 키를 사용하여 모든 작업 가능

-- ========================================
-- 4. 채널 랭킹 테이블 (일별 스냅샷, 영구 보관)
-- ========================================
CREATE TABLE IF NOT EXISTS youtube_channel_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_thumbnail TEXT,
  subscribers BIGINT NOT NULL DEFAULT 0,
  total_views BIGINT NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  channel_country TEXT,
  channel_description TEXT,
  region_code TEXT NOT NULL,
  category_id TEXT NOT NULL,
  rank_position INTEGER NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_channel_ranking
    UNIQUE (channel_id, region_code, category_id, snapshot_date)
);

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_channel_ranking_lookup
  ON youtube_channel_rankings (region_code, category_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_channel_ranking_period
  ON youtube_channel_rankings (channel_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_channel_ranking_subs
  ON youtube_channel_rankings (region_code, category_id, snapshot_date, subscribers DESC);

-- RLS
ALTER TABLE youtube_channel_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read youtube_channel_rankings"
  ON youtube_channel_rankings FOR SELECT
  TO authenticated, anon
  USING (true);

-- ========================================
-- 5. 추적 채널 마스터 테이블 (시드 + 자동 발견)
-- ========================================
CREATE TABLE IF NOT EXISTS tracked_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,
  channel_name TEXT NOT NULL,
  channel_thumbnail TEXT,
  source TEXT NOT NULL DEFAULT 'auto',  -- 'seed', 'auto', 'manual'
  subscribers BIGINT DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  channel_country TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracked_channels_source
  ON tracked_channels (source);

-- RLS
ALTER TABLE tracked_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tracked_channels"
  ON tracked_channels FOR SELECT
  TO authenticated, anon
  USING (true);
