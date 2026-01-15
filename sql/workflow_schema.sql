-- ============================================
-- Workflow Hub DB Schema
-- ============================================

-- 1. user_workflows 테이블: 사용자가 등록한 워크플로우 도구
CREATE TABLE IF NOT EXISTS user_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('sns', 'image_tool', 'video_tool', 'other_tool')),
  name TEXT NOT NULL, -- 도구 내부 키 (예: 'instagram', 'canva')
  display_name TEXT NOT NULL, -- 사용자에게 표시될 이름 (예: 'Instagram @my_brand')
  url TEXT NOT NULL, -- 도구 URL
  icon TEXT, -- Font Awesome 아이콘 클래스 (예: 'fab fa-instagram')
  username TEXT, -- SNS 채널 사용자명 (예: '@my_brand')
  is_favorite BOOLEAN DEFAULT false, -- 즐겨찾기 여부
  order_index INTEGER DEFAULT 0, -- 정렬 순서
  usage_count INTEGER DEFAULT 0, -- 사용 횟수
  last_used_at TIMESTAMP, -- 마지막 사용 시간
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_workflows_user_id ON user_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workflows_category ON user_workflows(category);
CREATE INDEX IF NOT EXISTS idx_user_workflows_favorite ON user_workflows(user_id, is_favorite);

-- 2. default_tool_recommendations 테이블: 기본 추천 도구 목록
CREATE TABLE IF NOT EXISTS default_tool_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('sns', 'image_tool', 'video_tool', 'other_tool')),
  name TEXT NOT NULL, -- 도구 내부 키
  display_name TEXT NOT NULL, -- 표시 이름
  url TEXT NOT NULL, -- 기본 URL
  icon TEXT NOT NULL, -- Font Awesome 아이콘
  description TEXT, -- 도구 설명
  is_free BOOLEAN DEFAULT true, -- 무료 여부
  priority_order INTEGER DEFAULT 0, -- 추천 우선순위 (높을수록 먼저 표시)
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_default_tools_category ON default_tool_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_default_tools_priority ON default_tool_recommendations(priority_order DESC);

-- 3. profile_workflows 테이블: 프로필과 워크플로우 연결
CREATE TABLE IF NOT EXISTS profile_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES user_workflows(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, workflow_id) -- 중복 방지
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profile_workflows_profile ON profile_workflows(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_workflows_workflow ON profile_workflows(workflow_id);

-- ============================================
-- 기본 추천 도구 데이터 삽입
-- ============================================

-- SNS 플랫폼
INSERT INTO default_tool_recommendations (category, name, display_name, url, icon, description, is_free, priority_order)
VALUES
  ('sns', 'instagram', 'Instagram', 'https://instagram.com', 'fab fa-instagram', 'Instagram 공식 사이트', true, 100),
  ('sns', 'youtube', 'YouTube', 'https://youtube.com', 'fab fa-youtube', 'YouTube 공식 사이트', true, 90),
  ('sns', 'naver_blog', '네이버 블로그', 'https://blog.naver.com', 'fas fa-blog', '네이버 블로그', true, 80),
  ('sns', 'brunch', '브런치', 'https://brunch.co.kr', 'fas fa-pen-fancy', '브런치 스토리', true, 70),
  ('sns', 'tiktok', 'TikTok', 'https://tiktok.com', 'fab fa-tiktok', 'TikTok 공식 사이트', true, 60),
  ('sns', 'threads', 'Threads', 'https://threads.net', 'fab fa-threads', 'Threads by Instagram', true, 50),
  ('sns', 'linkedin', 'LinkedIn', 'https://linkedin.com', 'fab fa-linkedin', 'LinkedIn 공식 사이트', true, 40),
  ('sns', 'twitter', 'X (Twitter)', 'https://x.com', 'fab fa-x-twitter', 'X (구 Twitter)', true, 30),
  ('sns', 'facebook', 'Facebook', 'https://facebook.com', 'fab fa-facebook', 'Facebook 페이지', true, 20)
ON CONFLICT DO NOTHING;

-- 이미지 생성/편집 AI 도구
INSERT INTO default_tool_recommendations (category, name, display_name, url, icon, description, is_free, priority_order)
VALUES
  ('image_tool', 'canva', 'Canva', 'https://canva.com', 'fas fa-palette', '무료 디자인 도구', true, 100),
  ('image_tool', 'nanobanana', '나노바나나', 'https://nanobanana.ai', 'fas fa-magic', 'AI 이미지 생성 도구', true, 90),
  ('image_tool', 'pixlr', 'Pixlr', 'https://pixlr.com', 'fas fa-image', '무료 이미지 편집기', true, 80),
  ('image_tool', 'photopea', 'Photopea', 'https://photopea.com', 'fas fa-paint-brush', '무료 포토샵 대체', true, 70),
  ('image_tool', 'removebg', 'Remove.bg', 'https://remove.bg', 'fas fa-cut', '배경 제거 도구', true, 60),
  ('image_tool', 'midjourney', 'Midjourney', 'https://midjourney.com', 'fas fa-brain', 'AI 이미지 생성 (유료)', false, 50),
  ('image_tool', 'dalle', 'DALL-E 3', 'https://openai.com/dall-e-3', 'fas fa-robot', 'OpenAI 이미지 생성', false, 40)
ON CONFLICT DO NOTHING;

-- 영상 생성/편집 AI 도구
INSERT INTO default_tool_recommendations (category, name, display_name, url, icon, description, is_free, priority_order)
VALUES
  ('video_tool', 'capcut', 'CapCut', 'https://capcut.com', 'fas fa-video', '무료 영상 편집 도구', true, 100),
  ('video_tool', 'clipchamp', 'Clipchamp', 'https://clipchamp.com', 'fas fa-film', 'Microsoft 영상 편집기', true, 90),
  ('video_tool', 'vrew', 'VREW', 'https://vrew.voyagerx.com', 'fas fa-closed-captioning', 'AI 자막 생성 도구', true, 80),
  ('video_tool', 'descript', 'Descript', 'https://descript.com', 'fas fa-microphone', '음성/영상 편집 도구', true, 70),
  ('video_tool', 'runway', 'Runway Gen-3', 'https://runwayml.com', 'fas fa-wand-magic-sparkles', 'AI 영상 생성 (유료)', false, 60),
  ('video_tool', 'pika', 'Pika Labs', 'https://pika.art', 'fas fa-sparkles', 'AI 영상 생성 (유료)', false, 50)
ON CONFLICT DO NOTHING;

-- 기타 AI 도구
INSERT INTO default_tool_recommendations (category, name, display_name, url, icon, description, is_free, priority_order)
VALUES
  ('other_tool', 'chatgpt', 'ChatGPT', 'https://chat.openai.com', 'fas fa-comments', 'OpenAI 챗봇', true, 100),
  ('other_tool', 'grok', 'Grok', 'https://x.com/i/grok', 'fas fa-brain', 'X AI 챗봇', true, 90),
  ('other_tool', 'claude', 'Claude', 'https://claude.ai', 'fas fa-robot', 'Anthropic AI', true, 80),
  ('other_tool', 'gemini', 'Gemini', 'https://gemini.google.com', 'fas fa-gem', 'Google AI', true, 70),
  ('other_tool', 'perplexity', 'Perplexity', 'https://perplexity.ai', 'fas fa-search', 'AI 검색 엔진', true, 60)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================

-- user_workflows RLS
ALTER TABLE user_workflows ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 워크플로우만 조회
CREATE POLICY "Users can view own workflows"
  ON user_workflows FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 워크플로우만 추가
CREATE POLICY "Users can insert own workflows"
  ON user_workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 워크플로우만 수정
CREATE POLICY "Users can update own workflows"
  ON user_workflows FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 자신의 워크플로우만 삭제
CREATE POLICY "Users can delete own workflows"
  ON user_workflows FOR DELETE
  USING (auth.uid() = user_id);

-- default_tool_recommendations RLS (전체 공개)
ALTER TABLE default_tool_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view default tools"
  ON default_tool_recommendations FOR SELECT
  USING (true);

-- profile_workflows RLS
ALTER TABLE profile_workflows ENABLE ROW LEVEL SECURITY;

-- 프로필 소유자만 조회 가능
CREATE POLICY "Users can view own profile workflows"
  ON profile_workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = profile_workflows.profile_id
        AND user_profiles.user_id = auth.uid()
    )
  );

-- 프로필 소유자만 추가 가능
CREATE POLICY "Users can insert own profile workflows"
  ON profile_workflows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = profile_workflows.profile_id
        AND user_profiles.user_id = auth.uid()
    )
  );

-- 프로필 소유자만 삭제 가능
CREATE POLICY "Users can delete own profile workflows"
  ON profile_workflows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = profile_workflows.profile_id
        AND user_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- 트리거: updated_at 자동 업데이트
-- ============================================

CREATE OR REPLACE FUNCTION update_user_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_workflows_updated_at
  BEFORE UPDATE ON user_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_user_workflows_updated_at();

-- ============================================
-- 완료 메시지
-- ============================================
-- Workflow Hub DB schema created successfully!
-- Tables: user_workflows, default_tool_recommendations, profile_workflows
-- Default tools inserted: 9 SNS, 7 Image tools, 6 Video tools, 5 Other AI tools
-- RLS policies enabled for security
