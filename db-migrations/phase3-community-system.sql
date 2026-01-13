-- ==========================================
-- Phase 3: 커뮤니티 시스템 DB 설계
-- ==========================================
-- 프로젝트: 마케팅허브 (Marketing Hub)
-- 버전: v8.3+
-- 소요 시간: 2시간
-- 실행 방법: Supabase Dashboard → SQL Editor → 전체 복사 붙여넣기 → RUN
-- ==========================================
-- 주요 기능:
-- 1. 4개 게시판 (자유/질문/프롬프트 공유/템플릿 공유)
-- 2. 댓글 시스템 (대댓글 지원)
-- 3. 좋아요, 북마크, 신고 시스템
-- 4. PQI (Prompt Quality Index) 평가 시스템
-- 5. Full-text search (한글 검색)
-- 6. 통계 자동 업데이트
-- ==========================================

-- ==========================================
-- 1. community_posts 테이블 (커뮤니티 게시글)
-- ==========================================
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_type TEXT NOT NULL CHECK (board_type IN ('free', 'qna', 'prompt_share', 'template_share')),
  category TEXT, -- 게시판별 카테고리
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT, -- 에디터로 작성된 HTML
  
  -- 프롬프트 공유 전용 필드
  prompt_text TEXT,
  prompt_metadata JSONB DEFAULT '{}',
  download_count INTEGER DEFAULT 0,
  pqi_score DECIMAL(3,2) DEFAULT 0.00 CHECK (pqi_score >= 0 AND pqi_score <= 5.00),
  
  -- 통계
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- 상태 관리
  is_pinned BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_reported BOOLEAN DEFAULT FALSE,
  report_count INTEGER DEFAULT 0,
  
  -- 검색 최적화
  search_vector TSVECTOR,
  
  -- 태그
  tags TEXT[] DEFAULT '{}',
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- 테이블 코멘트
COMMENT ON TABLE community_posts IS '커뮤니티 게시글 (4개 게시판 통합)';
COMMENT ON COLUMN community_posts.board_type IS 'free(자유게시판), qna(질문게시판), prompt_share(프롬프트 공유), template_share(템플릿 공유)';
COMMENT ON COLUMN community_posts.pqi_score IS 'Prompt Quality Index (0.00~5.00, 프롬프트 공유 게시판 전용)';
COMMENT ON COLUMN community_posts.search_vector IS 'Full-text search용 벡터 (자동 생성)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_board_type ON community_posts(board_type);
CREATE INDEX IF NOT EXISTS idx_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_pqi_score ON community_posts(pqi_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON community_posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_like_count ON community_posts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_deleted ON community_posts(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON community_posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON community_posts USING GIN(tags);

-- ==========================================
-- 2. community_comments 테이블 (댓글, 대댓글 지원)
-- ==========================================
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_reported BOOLEAN DEFAULT FALSE,
  report_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- 테이블 코멘트
COMMENT ON TABLE community_comments IS '커뮤니티 댓글 (대댓글 지원)';
COMMENT ON COLUMN community_comments.parent_comment_id IS '대댓글일 경우 부모 댓글 ID';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON community_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON community_comments(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON community_comments(is_deleted) WHERE is_deleted = FALSE;

-- ==========================================
-- 3. community_likes 테이블 (좋아요 - 게시글 + 댓글)
-- ==========================================
CREATE TABLE IF NOT EXISTS community_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 중복 방지
  CONSTRAINT unique_like UNIQUE (user_id, target_type, target_id)
);

-- 테이블 코멘트
COMMENT ON TABLE community_likes IS '좋아요 기록 (게시글 + 댓글)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON community_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON community_likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON community_likes(created_at DESC);

-- ==========================================
-- 4. community_bookmarks 테이블 (북마크)
-- ==========================================
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  folder_name TEXT DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 중복 방지
  CONSTRAINT unique_bookmark UNIQUE (user_id, post_id)
);

-- 테이블 코멘트
COMMENT ON TABLE community_bookmarks IS '북마크 기록';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON community_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON community_bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON community_bookmarks(folder_name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON community_bookmarks(created_at DESC);

-- ==========================================
-- 5. community_reports 테이블 (신고)
-- ==========================================
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'copyright', 'inappropriate', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  
  -- 중복 신고 방지
  CONSTRAINT unique_report UNIQUE (reporter_id, target_type, target_id)
);

-- 테이블 코멘트
COMMENT ON TABLE community_reports IS '신고 기록';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON community_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON community_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON community_reports(created_at DESC);

-- ==========================================
-- 6. prompt_quality_ratings 테이블 (PQI 평가)
-- ==========================================
CREATE TABLE IF NOT EXISTS prompt_quality_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating DECIMAL(3,2) NOT NULL CHECK (rating >= 0 AND rating <= 5.00),
  dimensions JSONB NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 중복 평가 방지
  CONSTRAINT unique_rating UNIQUE (post_id, user_id)
);

-- 테이블 코멘트
COMMENT ON TABLE prompt_quality_ratings IS 'PQI 사용자 평가 기록 (5가지 평가 차원)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pqi_post_id ON prompt_quality_ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_pqi_user_id ON prompt_quality_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_pqi_rating ON prompt_quality_ratings(rating DESC);

-- ==========================================
-- dimensions JSONB 구조 예시:
-- {
--   "clarity": 4.5,        // 명확성 (0~5)
--   "completeness": 4.0,   // 완전성 (0~5)
--   "creativity": 4.8,     // 창의성 (0~5)
--   "effectiveness": 4.2,  // 효과성 (0~5)
--   "reusability": 4.6     // 재사용성 (0~5)
-- }
-- ==========================================

-- ==========================================
-- 7. Full-text Search 트리거 (한글 검색)
-- ==========================================
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('korean', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('korean', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('korean', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

-- ==========================================
-- 8. PQI 자동 계산 함수
-- ==========================================
CREATE OR REPLACE FUNCTION calculate_pqi_score(p_post_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  rating_count INTEGER;
  download_factor DECIMAL(3,2);
  final_score DECIMAL(3,2);
BEGIN
  -- 평균 평점 계산
  SELECT AVG(rating), COUNT(*) INTO avg_rating, rating_count
  FROM prompt_quality_ratings
  WHERE post_id = p_post_id;
  
  -- 평가가 없으면 0 반환
  IF rating_count = 0 THEN
    RETURN 0.00;
  END IF;
  
  -- 다운로드 가중치
  SELECT 
    CASE 
      WHEN download_count >= 100 THEN 1.10
      WHEN download_count >= 50 THEN 1.05
      WHEN download_count >= 20 THEN 1.02
      ELSE 1.00
    END INTO download_factor
  FROM community_posts
  WHERE id = p_post_id;
  
  -- 최종 PQI 점수 = 평균 평점 × 다운로드 가중치
  final_score := LEAST(5.00, avg_rating * download_factor);
  
  -- community_posts 테이블 업데이트
  UPDATE community_posts
  SET pqi_score = final_score, updated_at = NOW()
  WHERE id = p_post_id;
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_pqi_score IS 'PQI 점수 자동 계산 (평균 평점 × 다운로드 가중치)';

-- ==========================================
-- 9. PQI 트리거 (평가 시 자동 재계산)
-- ==========================================
CREATE OR REPLACE FUNCTION trigger_recalculate_pqi()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_pqi_score(NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pqi_recalculate_on_rating 
  AFTER INSERT OR UPDATE ON prompt_quality_ratings
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_pqi();

-- ==========================================
-- 10. 통계 자동 업데이트 트리거
-- ==========================================
CREATE OR REPLACE FUNCTION update_post_statistics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 댓글 추가 시
    IF TG_TABLE_NAME = 'community_comments' THEN
      UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
    
    -- 좋아요 추가 시
    IF TG_TABLE_NAME = 'community_likes' AND NEW.target_type = 'post' THEN
      UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF TG_TABLE_NAME = 'community_likes' AND NEW.target_type = 'comment' THEN
      UPDATE community_comments SET like_count = like_count + 1 WHERE id = NEW.target_id;
    END IF;
    
    -- 북마크 추가 시
    IF TG_TABLE_NAME = 'community_bookmarks' THEN
      UPDATE community_posts SET bookmark_count = bookmark_count + 1 WHERE id = NEW.post_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- 댓글 삭제 시
    IF TG_TABLE_NAME = 'community_comments' THEN
      UPDATE community_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
    END IF;
    
    -- 좋아요 취소 시
    IF TG_TABLE_NAME = 'community_likes' AND OLD.target_type = 'post' THEN
      UPDATE community_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id;
    ELSIF TG_TABLE_NAME = 'community_likes' AND OLD.target_type = 'comment' THEN
      UPDATE community_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.target_id;
    END IF;
    
    -- 북마크 삭제 시
    IF TG_TABLE_NAME = 'community_bookmarks' THEN
      UPDATE community_posts SET bookmark_count = GREATEST(0, bookmark_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_post_comment_count 
  AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_statistics();

CREATE TRIGGER update_post_like_count 
  AFTER INSERT OR DELETE ON community_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_statistics();

CREATE TRIGGER update_post_bookmark_count 
  AFTER INSERT OR DELETE ON community_bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_post_statistics();

-- ==========================================
-- 11. Row Level Security (RLS) 정책
-- ==========================================

-- community_posts RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone" ON community_posts
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Users can insert own posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- community_comments RLS
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" ON community_comments
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Users can insert own comments" ON community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON community_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON community_comments
  FOR DELETE USING (auth.uid() = user_id);

-- community_likes RLS
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" ON community_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert own likes" ON community_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON community_likes
  FOR DELETE USING (auth.uid() = user_id);

-- community_bookmarks RLS
ALTER TABLE community_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookmarks" ON community_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON community_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON community_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- community_reports RLS
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reports" ON community_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can insert own reports" ON community_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- prompt_quality_ratings RLS
ALTER TABLE prompt_quality_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are viewable by everyone" ON prompt_quality_ratings
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert own ratings" ON prompt_quality_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings" ON prompt_quality_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 12. 샘플 데이터 삽입 (테스트용)
-- ==========================================

-- 샘플 게시글 (자유게시판)
INSERT INTO community_posts (user_id, board_type, category, title, content, tags)
VALUES (
  (SELECT id FROM users LIMIT 1),
  'free',
  '정보',
  '마케팅허브 사용 후기',
  '마케팅허브를 사용해본 후기입니다. AI로 콘텐츠를 자동 생성하니 정말 편리하네요!',
  ARRAY['마케팅', 'AI', '후기']
);

-- 샘플 게시글 (프롬프트 공유)
INSERT INTO community_posts (
  user_id, board_type, category, title, content, 
  prompt_text, prompt_metadata, tags
)
VALUES (
  (SELECT id FROM users LIMIT 1),
  'prompt_share',
  '블로그',
  '네이버 블로그 최적화 프롬프트',
  '네이버 블로그에 최적화된 프롬프트입니다. SEO 키워드가 자동으로 포함됩니다.',
  '다음 키워드를 포함한 블로그 포스트를 작성해주세요: [키워드]. 2000자 내외로 작성하고, 소제목 3개를 포함해주세요.',
  '{"platform": "blog", "tone": "informative", "length": "2000"}'::jsonb,
  ARRAY['프롬프트', '블로그', 'SEO']
);

-- ==========================================
-- 13. 확인 쿼리
-- ==========================================

-- 게시글 확인
-- SELECT * FROM community_posts ORDER BY created_at DESC LIMIT 5;

-- 검색 테스트
-- SELECT * FROM community_posts
-- WHERE search_vector @@ to_tsquery('korean', '마케팅 | AI');

-- 통계 확인
-- SELECT board_type, COUNT(*) as post_count 
-- FROM community_posts 
-- WHERE is_deleted = FALSE 
-- GROUP BY board_type;

-- ==========================================
-- Phase 3 마이그레이션 완료
-- ==========================================
-- 다음 단계:
-- 1. 위 쿼리로 테이블 구조 및 샘플 데이터 확인
-- 2. API 엔드포인트 개발 (게시글 CRUD, 댓글, 좋아요 등)
-- 3. 프론트엔드 UI 개발
-- ==========================================
