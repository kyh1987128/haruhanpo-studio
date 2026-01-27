-- Migration: 003_add_favorite_channels
-- Description: 즐겨찾기 채널 관리 및 스냅샷 추적 테이블 생성
-- Date: 2026-01-27

-- ==============================
-- 1. favorite_channels 테이블
-- ==============================
-- 사용자가 등록한 즐겨찾기 채널 목록
CREATE TABLE IF NOT EXISTS favorite_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_description TEXT,
  channel_thumbnail TEXT,
  subscriber_count BIGINT DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_favorite_channels_user_id ON favorite_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_channels_channel_id ON favorite_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_favorite_channels_added_at ON favorite_channels(added_at DESC);

-- RLS (Row Level Security) 정책
ALTER TABLE favorite_channels ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 즐겨찾기만 조회 가능
CREATE POLICY "Users can view their own favorites" ON favorite_channels
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 즐겨찾기만 추가 가능
CREATE POLICY "Users can insert their own favorites" ON favorite_channels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 즐겨찾기만 업데이트 가능
CREATE POLICY "Users can update their own favorites" ON favorite_channels
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 즐겨찾기만 삭제 가능
CREATE POLICY "Users can delete their own favorites" ON favorite_channels
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================
-- 2. channel_snapshots 테이블
-- ==============================
-- 채널의 공개 데이터 스냅샷 (시계열 데이터)
CREATE TABLE IF NOT EXISTS channel_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subscriber_count BIGINT DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  recent_video_avg_views BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, snapshot_date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_channel_snapshots_channel_id ON channel_snapshots(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_snapshots_date ON channel_snapshots(snapshot_date DESC);

-- RLS 정책 (모든 사용자 읽기 가능)
ALTER TABLE channel_snapshots ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자는 스냅샷 조회 가능
CREATE POLICY "Authenticated users can view snapshots" ON channel_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

-- 서버 측에서만 삽입/업데이트 가능 (service_role 키 사용)
CREATE POLICY "Service role can manage snapshots" ON channel_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- ==============================
-- 3. 함수: 스냅샷 자동 생성
-- ==============================
-- 채널 추가 시 첫 스냅샷 자동 생성
CREATE OR REPLACE FUNCTION create_initial_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO channel_snapshots (
    channel_id,
    snapshot_date,
    subscriber_count,
    total_videos,
    total_views
  ) VALUES (
    NEW.channel_id,
    CURRENT_DATE,
    NEW.subscriber_count,
    NEW.total_videos,
    NEW.total_views
  )
  ON CONFLICT (channel_id, snapshot_date) 
  DO UPDATE SET
    subscriber_count = EXCLUDED.subscriber_count,
    total_videos = EXCLUDED.total_videos,
    total_views = EXCLUDED.total_views;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 설정
CREATE TRIGGER trigger_create_initial_snapshot
  AFTER INSERT ON favorite_channels
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_snapshot();

-- ==============================
-- 4. 뷰: 채널 변화 추이
-- ==============================
-- 최근 30일간 채널 변화 추이
CREATE OR REPLACE VIEW channel_growth_stats AS
SELECT 
  fc.user_id,
  fc.channel_id,
  fc.channel_name,
  fc.channel_thumbnail,
  
  -- 현재 데이터
  fc.subscriber_count AS current_subscribers,
  fc.total_videos AS current_videos,
  fc.total_views AS current_views,
  
  -- 7일 전 데이터
  (
    SELECT subscriber_count 
    FROM channel_snapshots 
    WHERE channel_id = fc.channel_id 
      AND snapshot_date = CURRENT_DATE - INTERVAL '7 days'
    LIMIT 1
  ) AS subscribers_7d_ago,
  
  -- 30일 전 데이터
  (
    SELECT subscriber_count 
    FROM channel_snapshots 
    WHERE channel_id = fc.channel_id 
      AND snapshot_date = CURRENT_DATE - INTERVAL '30 days'
    LIMIT 1
  ) AS subscribers_30d_ago,
  
  -- 증가율 계산
  CASE 
    WHEN (
      SELECT subscriber_count 
      FROM channel_snapshots 
      WHERE channel_id = fc.channel_id 
        AND snapshot_date = CURRENT_DATE - INTERVAL '7 days'
      LIMIT 1
    ) > 0 THEN
      ROUND(
        ((fc.subscriber_count - (
          SELECT subscriber_count 
          FROM channel_snapshots 
          WHERE channel_id = fc.channel_id 
            AND snapshot_date = CURRENT_DATE - INTERVAL '7 days'
          LIMIT 1
        ))::NUMERIC / (
          SELECT subscriber_count 
          FROM channel_snapshots 
          WHERE channel_id = fc.channel_id 
            AND snapshot_date = CURRENT_DATE - INTERVAL '7 days'
          LIMIT 1
        ) * 100), 2
      )
    ELSE NULL
  END AS growth_rate_7d,
  
  fc.added_at,
  fc.last_updated
FROM favorite_channels fc;

-- ==============================
-- 완료
-- ==============================
-- Migration 003_add_favorite_channels 완료
