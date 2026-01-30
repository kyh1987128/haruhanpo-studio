-- ========================================
-- YouTube 트렌드 분석 데이터베이스 스키마
-- ========================================

-- 1. 트렌드 키워드 캐싱 테이블
CREATE TABLE IF NOT EXISTS trending_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,              -- '요리', '운동', '게임', '뷰티', '교육'
  score INTEGER NOT NULL,              -- 기회 점수 (0-100)
  estimated_views TEXT,                -- '3만~8만'
  competition INTEGER,                 -- 1-5 (별점)
  growth_rate INTEGER,                 -- 증가율 %
  sample_video_id TEXT,                -- 대표 영상 ID
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_keywords_score ON trending_keywords(score DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_category ON trending_keywords(category);
CREATE INDEX IF NOT EXISTS idx_keywords_updated ON trending_keywords(updated_at DESC);

-- 2. 인기 영상 캐싱 테이블
CREATE TABLE IF NOT EXISTS trending_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  thumbnail_url TEXT,
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  category TEXT,                       -- 자동 분류된 카테고리
  published_at DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_videos_views ON trending_videos(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category ON trending_videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_fetched ON trending_videos(fetched_at DESC);

-- 3. 채널 북마크 테이블
CREATE TABLE IF NOT EXISTS channel_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT,
  channel_url TEXT,
  thumbnail_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, channel_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON channel_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON channel_bookmarks(created_at DESC);
