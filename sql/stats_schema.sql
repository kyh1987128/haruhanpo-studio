-- ============================================
-- 통계 대시보드 & 프로필 워크플로우 DB 스키마
-- ============================================

-- 1. user_profiles 테이블 확장 (워크플로우 연결을 위해)
-- 이미 존재하는 테이블이므로 컬럼만 확인/추가

-- user_profiles 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  brand TEXT,
  company_name TEXT,
  business_type TEXT,
  location TEXT,
  target_gender TEXT,
  contact TEXT,
  website TEXT,
  sns TEXT,
  industry TEXT,
  tone TEXT,
  target_age TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(user_id, is_active);

-- 2. content_generation_stats 테이블: 콘텐츠 생성 통계 (집계 테이블)
CREATE TABLE IF NOT EXISTS content_generation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- '2026-01' 형식
  platform TEXT NOT NULL,
  content_count INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  total_generation_time INTEGER DEFAULT 0, -- 초 단위
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, year_month, platform)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_content_stats_user_month ON content_generation_stats(user_id, year_month);
CREATE INDEX IF NOT EXISTS idx_content_stats_platform ON content_generation_stats(platform);

-- 3. workflow_usage_stats 테이블: 워크플로우 도구 사용 통계
CREATE TABLE IF NOT EXISTS workflow_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES user_workflows(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- '2026-01' 형식
  click_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, workflow_id, year_month)
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_workflow_stats_user_month ON workflow_usage_stats(user_id, year_month);
CREATE INDEX IF NOT EXISTS idx_workflow_stats_workflow ON workflow_usage_stats(workflow_id);

-- 4. user_activity_log 테이블: 사용자 활동 로그 (선택적)
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'content_generated', 'workflow_clicked', 'profile_switched'
  activity_date DATE NOT NULL,
  metadata JSONB, -- 추가 정보 (플랫폼, 워크플로우 ID 등)
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON user_activity_log(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON user_activity_log(activity_type);

-- ============================================
-- 통계 뷰 (View)
-- ============================================

-- 월별 콘텐츠 생성 요약
CREATE OR REPLACE VIEW v_monthly_content_summary AS
SELECT 
  user_id,
  year_month,
  SUM(content_count) as total_contents,
  SUM(credits_used) as total_credits,
  AVG(credits_used::float / NULLIF(content_count, 0)) as avg_credits_per_content
FROM content_generation_stats
GROUP BY user_id, year_month;

-- 플랫폼별 콘텐츠 생성 요약
CREATE OR REPLACE VIEW v_platform_content_summary AS
SELECT 
  user_id,
  platform,
  SUM(content_count) as total_contents,
  SUM(credits_used) as total_credits
FROM content_generation_stats
GROUP BY user_id, platform
ORDER BY total_contents DESC;

-- 가장 많이 사용한 워크플로우 (최근 3개월)
CREATE OR REPLACE VIEW v_top_workflows AS
SELECT 
  wus.user_id,
  wus.workflow_id,
  uw.display_name,
  uw.category,
  uw.url,
  SUM(wus.click_count) as total_clicks,
  MAX(wus.last_clicked_at) as last_used
FROM workflow_usage_stats wus
JOIN user_workflows uw ON wus.workflow_id = uw.id
WHERE wus.year_month >= TO_CHAR(NOW() - INTERVAL '3 months', 'YYYY-MM')
GROUP BY wus.user_id, wus.workflow_id, uw.display_name, uw.category, uw.url
ORDER BY total_clicks DESC;

-- ============================================
-- 통계 업데이트 함수
-- ============================================

-- 콘텐츠 생성 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_content_generation_stats(
  p_user_id UUID,
  p_platform TEXT,
  p_credits_used INTEGER,
  p_generation_time INTEGER DEFAULT 0
)
RETURNS VOID AS $$
DECLARE
  v_year_month TEXT;
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  INSERT INTO content_generation_stats (user_id, year_month, platform, content_count, credits_used, total_generation_time)
  VALUES (p_user_id, v_year_month, p_platform, 1, p_credits_used, p_generation_time)
  ON CONFLICT (user_id, year_month, platform)
  DO UPDATE SET
    content_count = content_generation_stats.content_count + 1,
    credits_used = content_generation_stats.credits_used + p_credits_used,
    total_generation_time = content_generation_stats.total_generation_time + p_generation_time,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 워크플로우 사용 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_workflow_usage_stats(
  p_user_id UUID,
  p_workflow_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_year_month TEXT;
BEGIN
  v_year_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  INSERT INTO workflow_usage_stats (user_id, workflow_id, year_month, click_count, last_clicked_at)
  VALUES (p_user_id, p_workflow_id, v_year_month, 1, NOW())
  ON CONFLICT (user_id, workflow_id, year_month)
  DO UPDATE SET
    click_count = workflow_usage_stats.click_count + 1,
    last_clicked_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 활동 로그 추가 함수
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_activity_log (user_id, activity_type, activity_date, metadata)
  VALUES (p_user_id, p_activity_type, CURRENT_DATE, p_metadata);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================

-- content_generation_stats RLS
ALTER TABLE content_generation_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON content_generation_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON content_generation_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON content_generation_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- workflow_usage_stats RLS
ALTER TABLE workflow_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow stats"
  ON workflow_usage_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow stats"
  ON workflow_usage_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflow stats"
  ON workflow_usage_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- user_activity_log RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity log"
  ON user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log"
  ON user_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 트리거: updated_at 자동 업데이트
-- ============================================

CREATE OR REPLACE FUNCTION update_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_stats_updated_at
  BEFORE UPDATE ON content_generation_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_stats_updated_at();

CREATE TRIGGER trigger_update_workflow_stats_updated_at
  BEFORE UPDATE ON workflow_usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_stats_updated_at();

-- ============================================
-- 권한 부여
-- ============================================

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION update_content_generation_stats(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_workflow_usage_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, TEXT, JSONB) TO authenticated;

-- 뷰 조회 권한
GRANT SELECT ON v_monthly_content_summary TO authenticated;
GRANT SELECT ON v_platform_content_summary TO authenticated;
GRANT SELECT ON v_top_workflows TO authenticated;

-- ============================================
-- 완료 메시지
-- ============================================
-- Stats Dashboard DB schema created successfully!
-- Tables: content_generation_stats, workflow_usage_stats, user_activity_log
-- Views: v_monthly_content_summary, v_platform_content_summary, v_top_workflows
-- Functions: update_content_generation_stats, update_workflow_usage_stats, log_user_activity
-- RLS policies enabled for all stat tables
